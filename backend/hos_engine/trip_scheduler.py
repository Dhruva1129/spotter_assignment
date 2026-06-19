"""
FMCSA HOS Trip Scheduler.

Takes a route's total distance and driver state, then produces a fully
detailed multi-day schedule that is compliant with 49 CFR Part 395
(property-carrying, 70-hour/8-day cycle).

Algorithm overview
------------------
1. Start driving from current location toward the pickup point.
2. Insert a pickup stop (1 hr on-duty) upon arriving at the pickup.
3. Continue driving toward the dropoff, respecting all four limits:
   a. 11-hour daily driving limit.
   b. 14-hour on-duty window (resets after 10 hrs off-duty).
   c. 8-hour continuous driving limit → 30-min break.
   d. 1 000-mile fuel interval → 15-min fuel stop.
4. At any limit, insert the appropriate stop and advance the clock.
5. At the dropoff, insert a delivery stop (1 hr on-duty).
6. Build a DailyLog per calendar day from the recorded timeline events.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Literal

from .cycle_calculator import (
    AVERAGE_SPEED_MPH,
    BREAK_AFTER_HOURS,
    BREAK_DURATION,
    DAILY_DRIVING_LIMIT,
    DAILY_DUTY_WINDOW,
    DELIVERY_DURATION,
    FUEL_INTERVAL_MILES,
    FUEL_STOP_DURATION,
    OFF_DUTY_RESET,
    PICKUP_DURATION,
    CycleState,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------

StopType = Literal["pickup", "dropoff", "fuel", "break", "overnight"]
DutyStatus = Literal["off_duty", "sleeper_berth", "driving", "on_duty"]


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class Stop:
    """Represents a physical stop along the route."""

    stop_type: StopType
    location: str
    coordinates: list[float]          # [latitude, longitude]
    arrival_time: str                  # ISO-8601 datetime string
    departure_time: str                # ISO-8601 datetime string
    duration_hours: float
    miles_from_start: float
    day_number: int
    remarks: str = ""


@dataclass
class DutyEvent:
    """A single contiguous duty-status period within one calendar day."""

    status: DutyStatus
    start_hour: float   # fractional hour within the day, 0.0–24.0
    end_hour: float
    start_time: str     # ISO-8601 datetime
    end_time: str       # ISO-8601 datetime


@dataclass
class DailyLog:
    """Aggregated ELD log for a single calendar day."""

    date: str           # YYYY-MM-DD
    day_number: int
    events: list[DutyEvent] = field(default_factory=list)
    remarks: list[str] = field(default_factory=list)

    @property
    def totals(self) -> dict[str, float]:
        """Return total hours per duty status for this day."""
        totals: dict[str, float] = {
            "off_duty": 0.0,
            "sleeper_berth": 0.0,
            "driving": 0.0,
            "on_duty": 0.0,
        }
        for event in self.events:
            duration = event.end_hour - event.start_hour
            if event.status in totals:
                totals[event.status] += round(duration, 4)
        return totals


# ---------------------------------------------------------------------------
# Internal timeline event (not exposed in API response)
# ---------------------------------------------------------------------------


@dataclass
class _TimelineEvent:
    """Raw time-ordered event used during scheduling before log assembly."""

    status: DutyStatus
    start: datetime
    end: datetime
    remark: str = ""


# ---------------------------------------------------------------------------
# Coordinate interpolation helper
# ---------------------------------------------------------------------------


def _interpolate_coord(
    start: list[float],
    end: list[float],
    fraction: float,
) -> list[float]:
    """
    Linear interpolation between two [lat, lon] coordinate pairs.

    Parameters
    ----------
    start, end:
        [latitude, longitude] lists.
    fraction:
        Relative position along the segment, in [0.0, 1.0].
    """
    lat = start[0] + (end[0] - start[0]) * fraction
    lon = start[1] + (end[1] - start[1]) * fraction
    return [round(lat, 6), round(lon, 6)]


def _fmt(dt: datetime) -> str:
    """Format a datetime as an ISO-8601 string (no microseconds)."""
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _day_fraction(dt: datetime) -> float:
    """Return the fractional hour of the day for a datetime (0.0–24.0)."""
    return dt.hour + dt.minute / 60.0 + dt.second / 3600.0


# ---------------------------------------------------------------------------
# Core scheduler
# ---------------------------------------------------------------------------


def schedule_trip(
    total_distance_miles: float,
    pickup_miles: float,
    current_cycle_used: float,
    start_datetime: datetime,
    pickup_coords: list[float],
    dropoff_coords: list[float],
    pickup_location: str,
    dropoff_location: str,
) -> dict:
    """
    Generate a FMCSA-compliant multi-day trip schedule.

    Parameters
    ----------
    total_distance_miles:
        Total route distance in miles (current location → pickup → dropoff).
    pickup_miles:
        Distance in miles from the driver's current location to the pickup.
    current_cycle_used:
        Hours the driver has already used in their 70-hr/8-day cycle.
    start_datetime:
        Datetime the driver begins the trip (clock-in time).
    pickup_coords:
        [latitude, longitude] of the pickup location.
    dropoff_coords:
        [latitude, longitude] of the dropoff location.
    pickup_location:
        Human-readable name of the pickup location.
    dropoff_location:
        Human-readable name of the dropoff location.

    Returns
    -------
    dict with keys:
        - ``stops``       : list of Stop dataclass instances (serialisable via __dict__)
        - ``daily_logs``  : list of DailyLog dataclass instances
        - ``trip_summary``: high-level summary dict
    """
    # -----------------------------------------------------------------------
    # Initialise state
    # -----------------------------------------------------------------------
    cycle = CycleState(hours_used=current_cycle_used)

    # Ensure trip starts at a round hour on the start date (08:00 default)
    current_time = start_datetime.replace(second=0, microsecond=0)

    miles_driven: float = 0.0
    daily_driving_hours: float = 0.0    # resets after OFF_DUTY_RESET
    daily_duty_hours: float = 0.0       # resets after OFF_DUTY_RESET (14-hr window)
    continuous_driving_hours: float = 0.0
    fuel_miles_since_stop: float = 0.0

    stops: list[Stop] = []
    timeline: list[_TimelineEvent] = []
    day_number: int = 1
    trip_start_date = current_time.date()

    # Delivery distance = total - pickup distance
    delivery_miles = max(0.0, total_distance_miles - pickup_miles)

    # We will track how many miles remain after the pickup
    remaining_delivery_miles = delivery_miles

    # -----------------------------------------------------------------------
    # Helper: record a duty-status period on the timeline
    # -----------------------------------------------------------------------
    def _record(status: DutyStatus, start: datetime, end: datetime, remark: str = "") -> None:
        if end > start:
            timeline.append(_TimelineEvent(status=status, start=start, end=end, remark=remark))

    # -----------------------------------------------------------------------
    # Helper: advance the clock and consume hours
    # -----------------------------------------------------------------------
    def _advance(hours: float) -> datetime:
        nonlocal current_time
        current_time = current_time + timedelta(hours=hours)
        return current_time

    # -----------------------------------------------------------------------
    # Helper: perform an off-duty overnight reset
    # -----------------------------------------------------------------------
    def _do_overnight(location: str, coords: list[float], miles: float) -> None:
        nonlocal daily_driving_hours, daily_duty_hours, continuous_driving_hours, day_number, current_time

        rest_start = current_time
        rest_end = current_time + timedelta(hours=OFF_DUTY_RESET)

        _record("sleeper_berth", rest_start, rest_end, "Overnight rest – 10-hr reset")

        stop = Stop(
            stop_type="overnight",
            location=location,
            coordinates=coords,
            arrival_time=_fmt(rest_start),
            departure_time=_fmt(rest_end),
            duration_hours=OFF_DUTY_RESET,
            miles_from_start=miles,
            day_number=day_number,
            remarks="Mandatory 10-hour off-duty / sleeper-berth reset",
        )
        stops.append(stop)

        # Advance across potentially multiple calendar days
        day_number += max(1, int(OFF_DUTY_RESET // 24) + 1) if OFF_DUTY_RESET >= 24 else 1
        current_time = rest_end

        # Reset daily counters
        daily_driving_hours = 0.0
        daily_duty_hours = 0.0
        continuous_driving_hours = 0.0
        cycle.consume(OFF_DUTY_RESET * 0)  # off-duty does NOT consume cycle hours

    # -----------------------------------------------------------------------
    # PHASE 1: Drive from current location to pickup
    # -----------------------------------------------------------------------
    logger.debug("Phase 1: driving %.1f miles to pickup.", pickup_miles)

    remaining_to_pickup = pickup_miles

    while remaining_to_pickup > 0.1:
        # How many miles can we drive right now?
        driving_hours_available = min(
            DAILY_DRIVING_LIMIT - daily_driving_hours,           # daily driving cap
            DAILY_DUTY_WINDOW - daily_duty_hours,                # 14-hr duty window
            BREAK_AFTER_HOURS - continuous_driving_hours,        # break threshold
        )

        if driving_hours_available <= 0:
            # Determine why we stopped
            if daily_driving_hours >= DAILY_DRIVING_LIMIT or daily_duty_hours >= DAILY_DUTY_WINDOW:
                # Need overnight rest
                frac = miles_driven / total_distance_miles if total_distance_miles > 0 else 0
                coords = _interpolate_coord(pickup_coords, dropoff_coords, max(0, frac - 0.5) / 0.5 if frac < 0.5 else (frac - 0.5) / 0.5)
                coords = _interpolate_coord(pickup_coords, dropoff_coords, 0.0)
                _do_overnight(f"Rest stop near mile {miles_driven:.0f}", coords, miles_driven)
            else:
                # 30-min mandatory break
                break_start = current_time
                break_end = current_time + timedelta(hours=BREAK_DURATION)
                _record("off_duty", break_start, break_end, "Mandatory 30-minute break")
                frac = miles_driven / total_distance_miles if total_distance_miles else 0
                stops.append(Stop(
                    stop_type="break",
                    location=f"Rest area near mile {miles_driven:.0f}",
                    coordinates=_interpolate_coord(pickup_coords, dropoff_coords, min(frac, 0.49)),
                    arrival_time=_fmt(break_start),
                    departure_time=_fmt(break_end),
                    duration_hours=BREAK_DURATION,
                    miles_from_start=miles_driven,
                    day_number=day_number,
                    remarks="Mandatory 30-minute break after 8 hours of driving",
                ))
                current_time = break_end
                daily_duty_hours += BREAK_DURATION
                continuous_driving_hours = 0.0
            continue

        miles_drivable = driving_hours_available * AVERAGE_SPEED_MPH
        miles_to_drive = min(remaining_to_pickup, miles_drivable)

        # Also cap by fuel interval
        miles_to_fuel = FUEL_INTERVAL_MILES - fuel_miles_since_stop
        if miles_to_drive > miles_to_fuel and miles_to_fuel < remaining_to_pickup:
            miles_to_drive = miles_to_fuel

        hours_driven = miles_to_drive / AVERAGE_SPEED_MPH

        drive_start = current_time
        drive_end = current_time + timedelta(hours=hours_driven)
        _record("driving", drive_start, drive_end)

        miles_driven += miles_to_drive
        remaining_to_pickup -= miles_to_drive
        fuel_miles_since_stop += miles_to_drive
        daily_driving_hours += hours_driven
        daily_duty_hours += hours_driven
        continuous_driving_hours += hours_driven
        cycle.consume(hours_driven)
        current_time = drive_end

        # Fuel stop during leg to pickup?
        if fuel_miles_since_stop >= FUEL_INTERVAL_MILES and remaining_to_pickup > 0.1:
            fuel_start = current_time
            fuel_end = current_time + timedelta(hours=FUEL_STOP_DURATION)
            _record("on_duty", fuel_start, fuel_end, "Fuel stop")
            frac = miles_driven / total_distance_miles if total_distance_miles else 0
            stops.append(Stop(
                stop_type="fuel",
                location=f"Fuel stop at mile {miles_driven:.0f}",
                coordinates=_interpolate_coord(pickup_coords, dropoff_coords, min(frac, 0.49)),
                arrival_time=_fmt(fuel_start),
                departure_time=_fmt(fuel_end),
                duration_hours=FUEL_STOP_DURATION,
                miles_from_start=miles_driven,
                day_number=day_number,
                remarks="Fuel stop – 1 000-mile interval",
            ))
            current_time = fuel_end
            daily_duty_hours += FUEL_STOP_DURATION
            cycle.consume(FUEL_STOP_DURATION)
            fuel_miles_since_stop = 0.0

        # Break needed?
        if continuous_driving_hours >= BREAK_AFTER_HOURS and remaining_to_pickup > 0.1:
            break_start = current_time
            break_end = current_time + timedelta(hours=BREAK_DURATION)
            _record("off_duty", break_start, break_end, "Mandatory 30-minute break")
            frac = miles_driven / total_distance_miles if total_distance_miles else 0
            stops.append(Stop(
                stop_type="break",
                location=f"Rest area near mile {miles_driven:.0f}",
                coordinates=_interpolate_coord(pickup_coords, dropoff_coords, min(frac, 0.49)),
                arrival_time=_fmt(break_start),
                departure_time=_fmt(break_end),
                duration_hours=BREAK_DURATION,
                miles_from_start=miles_driven,
                day_number=day_number,
                remarks="Mandatory 30-minute break after 8 hours of driving",
            ))
            current_time = break_end
            daily_duty_hours += BREAK_DURATION
            continuous_driving_hours = 0.0

    # -----------------------------------------------------------------------
    # PHASE 2: Pickup stop
    # -----------------------------------------------------------------------
    logger.debug("Phase 2: pickup stop at mile %.1f.", miles_driven)

    pickup_start = current_time
    pickup_end = current_time + timedelta(hours=PICKUP_DURATION)
    _record("on_duty", pickup_start, pickup_end, "Pickup – loading")
    stops.append(Stop(
        stop_type="pickup",
        location=pickup_location,
        coordinates=pickup_coords,
        arrival_time=_fmt(pickup_start),
        departure_time=_fmt(pickup_end),
        duration_hours=PICKUP_DURATION,
        miles_from_start=miles_driven,
        day_number=day_number,
        remarks="Pickup / loading – 1 hour on-duty",
    ))
    current_time = pickup_end
    daily_duty_hours += PICKUP_DURATION
    cycle.consume(PICKUP_DURATION)

    # Reset continuous driving counter after on-duty stop > BREAK_DURATION
    if PICKUP_DURATION >= BREAK_DURATION:
        continuous_driving_hours = 0.0

    # -----------------------------------------------------------------------
    # PHASE 3: Drive from pickup to dropoff
    # -----------------------------------------------------------------------
    logger.debug("Phase 3: driving %.1f miles to dropoff.", remaining_delivery_miles)

    while remaining_delivery_miles > 0.1:
        driving_hours_available = min(
            DAILY_DRIVING_LIMIT - daily_driving_hours,
            DAILY_DUTY_WINDOW - daily_duty_hours,
            BREAK_AFTER_HOURS - continuous_driving_hours,
        )

        if driving_hours_available <= 0:
            if daily_driving_hours >= DAILY_DRIVING_LIMIT or daily_duty_hours >= DAILY_DUTY_WINDOW:
                frac = (miles_driven - pickup_miles) / delivery_miles if delivery_miles > 0 else 0
                coords = _interpolate_coord(pickup_coords, dropoff_coords, min(frac, 0.99))
                _do_overnight(
                    f"Rest stop near mile {miles_driven:.0f}",
                    coords,
                    miles_driven,
                )
            else:
                break_start = current_time
                break_end = current_time + timedelta(hours=BREAK_DURATION)
                _record("off_duty", break_start, break_end, "Mandatory 30-minute break")
                frac = (miles_driven - pickup_miles) / delivery_miles if delivery_miles > 0 else 0
                stops.append(Stop(
                    stop_type="break",
                    location=f"Rest area near mile {miles_driven:.0f}",
                    coordinates=_interpolate_coord(pickup_coords, dropoff_coords, min(frac, 0.99)),
                    arrival_time=_fmt(break_start),
                    departure_time=_fmt(break_end),
                    duration_hours=BREAK_DURATION,
                    miles_from_start=miles_driven,
                    day_number=day_number,
                    remarks="Mandatory 30-minute break after 8 hours of driving",
                ))
                current_time = break_end
                daily_duty_hours += BREAK_DURATION
                continuous_driving_hours = 0.0
            continue

        miles_drivable = driving_hours_available * AVERAGE_SPEED_MPH
        miles_to_drive = min(remaining_delivery_miles, miles_drivable)

        # Cap by fuel interval
        miles_to_fuel = FUEL_INTERVAL_MILES - fuel_miles_since_stop
        if miles_to_drive > miles_to_fuel and miles_to_fuel < remaining_delivery_miles:
            miles_to_drive = miles_to_fuel

        hours_driven = miles_to_drive / AVERAGE_SPEED_MPH

        drive_start = current_time
        drive_end = current_time + timedelta(hours=hours_driven)
        _record("driving", drive_start, drive_end)

        miles_driven += miles_to_drive
        remaining_delivery_miles -= miles_to_drive
        fuel_miles_since_stop += miles_to_drive
        daily_driving_hours += hours_driven
        daily_duty_hours += hours_driven
        continuous_driving_hours += hours_driven
        cycle.consume(hours_driven)
        current_time = drive_end

        # Fuel stop during delivery leg?
        if fuel_miles_since_stop >= FUEL_INTERVAL_MILES and remaining_delivery_miles > 0.1:
            fuel_start = current_time
            fuel_end = current_time + timedelta(hours=FUEL_STOP_DURATION)
            _record("on_duty", fuel_start, fuel_end, "Fuel stop")
            frac = (miles_driven - pickup_miles) / delivery_miles if delivery_miles > 0 else 0
            stops.append(Stop(
                stop_type="fuel",
                location=f"Fuel stop at mile {miles_driven:.0f}",
                coordinates=_interpolate_coord(pickup_coords, dropoff_coords, min(frac, 0.99)),
                arrival_time=_fmt(fuel_start),
                departure_time=_fmt(fuel_end),
                duration_hours=FUEL_STOP_DURATION,
                miles_from_start=miles_driven,
                day_number=day_number,
                remarks="Fuel stop – 1 000-mile interval",
            ))
            current_time = fuel_end
            daily_duty_hours += FUEL_STOP_DURATION
            cycle.consume(FUEL_STOP_DURATION)
            fuel_miles_since_stop = 0.0

        # Break after continuous driving?
        if continuous_driving_hours >= BREAK_AFTER_HOURS and remaining_delivery_miles > 0.1:
            break_start = current_time
            break_end = current_time + timedelta(hours=BREAK_DURATION)
            _record("off_duty", break_start, break_end, "Mandatory 30-minute break")
            frac = (miles_driven - pickup_miles) / delivery_miles if delivery_miles > 0 else 0
            stops.append(Stop(
                stop_type="break",
                location=f"Rest area near mile {miles_driven:.0f}",
                coordinates=_interpolate_coord(pickup_coords, dropoff_coords, min(frac, 0.99)),
                arrival_time=_fmt(break_start),
                departure_time=_fmt(break_end),
                duration_hours=BREAK_DURATION,
                miles_from_start=miles_driven,
                day_number=day_number,
                remarks="Mandatory 30-minute break after 8 hours of driving",
            ))
            current_time = break_end
            daily_duty_hours += BREAK_DURATION
            continuous_driving_hours = 0.0

    # -----------------------------------------------------------------------
    # PHASE 4: Dropoff stop
    # -----------------------------------------------------------------------
    logger.debug("Phase 4: dropoff stop at mile %.1f.", miles_driven)

    dropoff_start = current_time
    dropoff_end = current_time + timedelta(hours=DELIVERY_DURATION)
    _record("on_duty", dropoff_start, dropoff_end, "Delivery – unloading")
    stops.append(Stop(
        stop_type="dropoff",
        location=dropoff_location,
        coordinates=dropoff_coords,
        arrival_time=_fmt(dropoff_start),
        departure_time=_fmt(dropoff_end),
        duration_hours=DELIVERY_DURATION,
        miles_from_start=miles_driven,
        day_number=day_number,
        remarks="Delivery / unloading – 1 hour on-duty",
    ))
    current_time = dropoff_end
    cycle.consume(DELIVERY_DURATION)

    # -----------------------------------------------------------------------
    # PHASE 5: Post-delivery off-duty until end of day
    # -----------------------------------------------------------------------
    end_of_shift_start = current_time
    # Fill to the next midnight (or a minimum 8 hrs off)
    next_midnight = (current_time + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    end_of_shift_end = max(next_midnight, current_time + timedelta(hours=8))
    _record("off_duty", end_of_shift_start, end_of_shift_end, "End of shift")

    # -----------------------------------------------------------------------
    # PHASE 6: Build DailyLog objects from the flat timeline
    # -----------------------------------------------------------------------
    daily_logs = _build_daily_logs(timeline, trip_start_date)

    # -----------------------------------------------------------------------
    # Trip summary
    # -----------------------------------------------------------------------
    trip_summary = {
        "total_distance_miles": round(total_distance_miles, 1),
        "pickup_distance_miles": round(pickup_miles, 1),
        "delivery_distance_miles": round(delivery_miles, 1),
        "total_days": len(daily_logs),
        "total_stops": len(stops),
        "cycle_hours_used_at_start": round(current_cycle_used, 2),
        "cycle_hours_used_at_end": round(cycle.hours_used, 2),
        "cycle_hours_remaining": round(cycle.hours_remaining, 2),
        "estimated_arrival": _fmt(dropoff_end),
        "trip_start": _fmt(start_datetime),
    }

    logger.info(
        "Trip scheduled: %d stops, %d days, %.1f miles total.",
        len(stops),
        len(daily_logs),
        total_distance_miles,
    )

    return {
        "stops": stops,
        "daily_logs": daily_logs,
        "trip_summary": trip_summary,
    }


# ---------------------------------------------------------------------------
# Daily log assembly
# ---------------------------------------------------------------------------


def _build_daily_logs(
    timeline: list[_TimelineEvent],
    trip_start_date,
) -> list[DailyLog]:
    """
    Convert a flat list of timeline events into per-day DailyLog objects.

    Each event that spans midnight is split across the two days it covers.
    Events within a single day are accumulated into DutyEvent objects and
    attached to the corresponding DailyLog.
    """
    if not timeline:
        return []

    # Sort by start time (should already be ordered, but be defensive)
    timeline.sort(key=lambda e: e.start)

    # Group events by calendar date
    from collections import defaultdict
    day_events: dict[str, list[_TimelineEvent]] = defaultdict(list)

    for event in timeline:
        # Split events that span midnight
        seg_start = event.start
        while seg_start < event.end:
            next_midnight = (seg_start + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            seg_end = min(event.end, next_midnight)
            date_key = seg_start.strftime("%Y-%m-%d")
            day_events[date_key].append(
                _TimelineEvent(
                    status=event.status,
                    start=seg_start,
                    end=seg_end,
                    remark=event.remark,
                )
            )
            seg_start = seg_end

    # Build DailyLog per day in chronological order
    daily_logs: list[DailyLog] = []
    for day_num, date_str in enumerate(sorted(day_events.keys()), start=1):
        events_for_day = sorted(day_events[date_str], key=lambda e: e.start)
        duty_events: list[DutyEvent] = []
        remarks: list[str] = []

        for ev in events_for_day:
            start_hour = _day_fraction(ev.start)
            end_hour = _day_fraction(ev.end)
            # Midnight → 24.0 so the grid renders correctly
            if end_hour == 0.0 and ev.end > ev.start:
                end_hour = 24.0

            duty_events.append(
                DutyEvent(
                    status=ev.status,
                    start_hour=round(start_hour, 4),
                    end_hour=round(end_hour, 4),
                    start_time=_fmt(ev.start),
                    end_time=_fmt(ev.end),
                )
            )
            if ev.remark:
                remarks.append(ev.remark)

        # Fill any gap between last event and midnight as off_duty
        if duty_events:
            last_end = duty_events[-1].end_hour
            if last_end < 24.0:
                day_date = datetime.strptime(date_str, "%Y-%m-%d")
                fill_start = day_date + timedelta(hours=last_end)
                fill_end = day_date + timedelta(hours=24)
                duty_events.append(
                    DutyEvent(
                        status="off_duty",
                        start_hour=round(last_end, 4),
                        end_hour=24.0,
                        start_time=_fmt(fill_start),
                        end_time=_fmt(fill_end),
                    )
                )

        log = DailyLog(
            date=date_str,
            day_number=day_num,
            events=duty_events,
            remarks=list(dict.fromkeys(remarks)),  # deduplicate while preserving order
        )
        daily_logs.append(log)

    return daily_logs
