"""
ELD Log Generator.

Converts DailyLog dataclass objects produced by ``trip_scheduler`` into
plain JSON-serialisable dictionaries ready to be included in the API
response or passed to the PDF renderer.

The output format mirrors the FMCSA ELD daily log fields.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def generate_eld_logs(
    daily_logs: list,
    driver_name: str = "Driver",
    carrier_name: str = "Spotter Logistics",
    vehicle_id: str = "TRK-001",
) -> list[dict[str, Any]]:
    """
    Format DailyLog objects into FMCSA ELD-compatible dictionaries.

    Parameters
    ----------
    daily_logs:
        List of ``DailyLog`` dataclass instances from ``trip_scheduler``.
    driver_name:
        Full name of the driver, included on each log page.
    carrier_name:
        Carrier / company name for the log header.
    vehicle_id:
        Truck or tractor unit identifier.

    Returns
    -------
    list[dict]
        Each dict represents one calendar day's ELD log with the structure::

            {
                "date": "YYYY-MM-DD",
                "day_number": int,
                "driver_name": str,
                "carrier_name": str,
                "vehicle_id": str,
                "events": [
                    {
                        "status": str,          # off_duty | sleeper_berth | driving | on_duty
                        "start_hour": float,    # 0.0 – 24.0
                        "end_hour": float,
                        "start_time": str,      # ISO-8601
                        "end_time": str,
                        "duration_hours": float
                    },
                    ...
                ],
                "totals": {
                    "off_duty": float,
                    "sleeper_berth": float,
                    "driving": float,
                    "on_duty": float,
                    "total_on_duty": float       # driving + on_duty combined
                },
                "remarks": [str, ...]
            }
    """
    result: list[dict[str, Any]] = []

    for log in daily_logs:
        # Support both dataclass instances and plain dicts (e.g. loaded from DB)
        if hasattr(log, "__dict__"):
            date = log.date
            day_number = log.day_number
            raw_events = log.events
            raw_remarks = log.remarks
            totals = log.totals
        else:
            date = log.get("date", "")
            day_number = log.get("day_number", 0)
            raw_events = log.get("events", [])
            raw_remarks = log.get("remarks", [])
            totals = log.get("totals", {
                "off_duty": 0.0,
                "sleeper_berth": 0.0,
                "driving": 0.0,
                "on_duty": 0.0,
            })

        events: list[dict[str, Any]] = []
        for ev in raw_events:
            if hasattr(ev, "__dict__"):
                status = ev.status
                start_hour = ev.start_hour
                end_hour = ev.end_hour
                start_time = ev.start_time
                end_time = ev.end_time
            else:
                status = ev.get("status", "off_duty")
                start_hour = ev.get("start_hour", 0.0)
                end_hour = ev.get("end_hour", 0.0)
                start_time = ev.get("start_time", "")
                end_time = ev.get("end_time", "")

            duration = round(end_hour - start_hour, 4)
            if duration < 0:
                duration = 0.0

            events.append({
                "status": status,
                "start_hour": round(start_hour, 4),
                "end_hour": round(end_hour, 4),
                "start_time": start_time,
                "end_time": end_time,
                "duration_hours": duration,
            })

        # Normalise totals dict
        if hasattr(totals, "items"):
            t = dict(totals)
        else:
            t = {
                "off_duty": 0.0,
                "sleeper_berth": 0.0,
                "driving": 0.0,
                "on_duty": 0.0,
            }

        t["total_on_duty"] = round(
            t.get("driving", 0.0) + t.get("on_duty", 0.0), 4
        )

        # Round all totals for cleanliness
        for k in t:
            t[k] = round(t[k], 2)

        remarks = list(raw_remarks) if raw_remarks else []

        result.append({
            "date": date,
            "day_number": day_number,
            "driver_name": driver_name,
            "carrier_name": carrier_name,
            "vehicle_id": vehicle_id,
            "events": events,
            "totals": t,
            "remarks": remarks,
        })

        logger.debug(
            "ELD log generated for day %d (%s): %d events.",
            day_number,
            date,
            len(events),
        )

    return result
