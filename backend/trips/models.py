"""
Trip model for the Spotter Route Planner.

Stores the driver's input and the full computed schedule so that repeated
PDF requests do not re-run the heavy HOS engine.
"""

from __future__ import annotations

import uuid

from django.db import models


class Trip(models.Model):
    """
    Persists a single route-planning request and its computed schedule.

    Fields
    ------
    id:
        UUID primary key – avoids leaking sequential IDs in API URLs.
    current_location:
        Free-text name of the driver's current location (geocoded on write).
    pickup_location:
        Free-text name of the pickup destination.
    dropoff_location:
        Free-text name of the final delivery destination.
    current_cycle_used:
        Hours the driver has already consumed in the current 70-hr/8-day cycle
        at the time the trip is created.  Must be in [0, 70].
    created_at:
        Server-side creation timestamp (UTC).
    result_json:
        Full computed trip response cached as JSON so the PDF endpoint can
        retrieve logs without re-running the HOS engine.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    current_location = models.CharField(
        max_length=255,
        help_text="Driver's starting location (city / address).",
    )
    pickup_location = models.CharField(
        max_length=255,
        help_text="Pickup / loading location.",
    )
    dropoff_location = models.CharField(
        max_length=255,
        help_text="Delivery / dropoff location.",
    )
    current_cycle_used = models.FloatField(
        help_text="Hours already used in the current 70-hr HOS cycle (0–70).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    result_json = models.JSONField(
        null=True,
        blank=True,
        help_text="Cached full API response from the HOS engine.",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Trip"
        verbose_name_plural = "Trips"

    def __str__(self) -> str:  # pragma: no cover
        return (
            f"Trip {self.id} | "
            f"{self.current_location} → {self.pickup_location} → {self.dropoff_location}"
        )
