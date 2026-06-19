"""
FMCSA 70-hour/8-day HOS cycle calculator.

Defines the regulatory constants and the CycleState dataclass used by the
trip scheduler to track how many cycle hours a driver has consumed and how
many remain before a 34-hour restart would be required.

FMCSA references:
  - 49 CFR Part 395 – Hours of Service of Drivers
  - Property-carrying drivers: 70-hour/8-day rule (§395.3(b)(2))
"""

from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Regulatory constants
# ---------------------------------------------------------------------------

HOS_CYCLE_HOURS: float = 70.0
"""Maximum on-duty hours in any 8-consecutive-day period (70-hr/8-day cycle)."""

DAILY_DRIVING_LIMIT: float = 11.0
"""Maximum hours a driver may drive after 10 consecutive hours off duty."""

DAILY_DUTY_WINDOW: float = 14.0
"""Maximum hours a driver may be on-duty after coming off 10 consecutive hours off."""

BREAK_AFTER_HOURS: float = 8.0
"""Continuous driving hours before a mandatory 30-minute break is required."""

BREAK_DURATION: float = 0.5
"""Duration of the mandatory short break (30 minutes = 0.5 hours)."""

OFF_DUTY_RESET: float = 10.0
"""Consecutive off-duty / sleeper-berth hours required to reset the daily limits."""

FUEL_INTERVAL_MILES: float = 1_000.0
"""Maximum distance (miles) between fuel stops for commercial vehicles."""

PICKUP_DURATION: float = 1.0
"""Assumed on-duty hours spent at the pickup location (loading time)."""

DELIVERY_DURATION: float = 1.0
"""Assumed on-duty hours spent at the dropoff location (unloading time)."""

AVERAGE_SPEED_MPH: float = 60.0
"""Assumed average driving speed in miles-per-hour for time estimations."""

FUEL_STOP_DURATION: float = 0.25
"""Duration of a fuel stop (15 minutes = 0.25 hours), counted as on-duty."""


# ---------------------------------------------------------------------------
# Cycle state
# ---------------------------------------------------------------------------


@dataclass
class CycleState:
    """
    Tracks the driver's position within the 70-hour/8-day HOS cycle.

    Attributes
    ----------
    hours_used:
        Total on-duty hours already consumed in the current 8-day cycle.
        Provided by the driver at trip start (``current_cycle_used``).
    """

    hours_used: float

    @property
    def hours_remaining(self) -> float:
        """Hours of cycle time still available before a mandatory 34-hr restart."""
        return max(0.0, HOS_CYCLE_HOURS - self.hours_used)

    @property
    def can_drive(self) -> bool:
        """``True`` if the driver still has cycle hours available."""
        return self.hours_remaining > 0.0

    def consume(self, hours: float) -> None:
        """
        Record that ``hours`` of on-duty time have been used.

        Clamps to the 70-hour maximum so we never exceed the cycle cap.
        """
        self.hours_used = min(HOS_CYCLE_HOURS, self.hours_used + hours)
