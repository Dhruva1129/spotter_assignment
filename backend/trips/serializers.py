"""
DRF serializers for the Trips API.

Provides both input validation (TripRequestSerializer) and a structured
output shape (TripResponseSerializer) that mirrors the full HOS engine
response format.
"""

from __future__ import annotations

from rest_framework import serializers


# ---------------------------------------------------------------------------
# Input serializer
# ---------------------------------------------------------------------------


class TripRequestSerializer(serializers.Serializer):
    """
    Validates the JSON body sent to POST /api/trips/calculate.

    All four fields are required.  ``current_cycle_used`` is constrained
    to [0, 70] matching the FMCSA 70-hour cycle maximum.
    """

    current_location = serializers.CharField(
        max_length=255,
        help_text="Driver's current location (city name or full address).",
    )
    pickup_location = serializers.CharField(
        max_length=255,
        help_text="Pickup / loading location.",
    )
    dropoff_location = serializers.CharField(
        max_length=255,
        help_text="Final delivery / dropoff location.",
    )
    current_cycle_used = serializers.FloatField(
        min_value=0.0,
        max_value=70.0,
        help_text="Hours already consumed in the driver's current 70-hr HOS cycle.",
    )

    def validate_current_cycle_used(self, value: float) -> float:
        """Round to two decimal places for consistency."""
        return round(value, 2)

    def validate(self, attrs: dict) -> dict:
        """Cross-field validation: pickup and dropoff must differ."""
        if attrs.get("pickup_location", "").lower().strip() == attrs.get("dropoff_location", "").lower().strip():
            raise serializers.ValidationError(
                "pickup_location and dropoff_location must be different."
            )
        return attrs


# ---------------------------------------------------------------------------
# Output sub-serializers
# ---------------------------------------------------------------------------


class StopSerializer(serializers.Serializer):
    """Represents a single physical stop along the route."""

    stop_type = serializers.CharField()
    location = serializers.CharField()
    coordinates = serializers.ListField(child=serializers.FloatField())
    arrival_time = serializers.CharField()
    departure_time = serializers.CharField()
    duration_hours = serializers.FloatField()
    miles_from_start = serializers.FloatField()
    day_number = serializers.IntegerField()
    remarks = serializers.CharField(default="")


class DutyEventSerializer(serializers.Serializer):
    """A single contiguous duty-status period within a calendar day."""

    status = serializers.CharField()
    start_hour = serializers.FloatField()
    end_hour = serializers.FloatField()
    start_time = serializers.CharField()
    end_time = serializers.CharField()
    duration_hours = serializers.FloatField()


class DailyLogTotalsSerializer(serializers.Serializer):
    """Hours-per-status totals for a single day."""

    off_duty = serializers.FloatField()
    sleeper_berth = serializers.FloatField()
    driving = serializers.FloatField()
    on_duty = serializers.FloatField()
    total_on_duty = serializers.FloatField()


class DailyELDLogSerializer(serializers.Serializer):
    """Full ELD log for one calendar day."""

    date = serializers.CharField()
    day_number = serializers.IntegerField()
    driver_name = serializers.CharField()
    carrier_name = serializers.CharField()
    vehicle_id = serializers.CharField()
    events = DutyEventSerializer(many=True)
    totals = DailyLogTotalsSerializer()
    remarks = serializers.ListField(child=serializers.CharField())


class TripSummarySerializer(serializers.Serializer):
    """High-level trip summary figures."""

    total_distance_miles = serializers.FloatField()
    pickup_distance_miles = serializers.FloatField()
    delivery_distance_miles = serializers.FloatField()
    total_days = serializers.IntegerField()
    total_stops = serializers.IntegerField()
    cycle_hours_used_at_start = serializers.FloatField()
    cycle_hours_used_at_end = serializers.FloatField()
    cycle_hours_remaining = serializers.FloatField()
    estimated_arrival = serializers.CharField()
    trip_start = serializers.CharField()


class RouteGeometrySerializer(serializers.Serializer):
    """Slim route info used by the frontend map component."""

    distance_meters = serializers.FloatField()
    duration_seconds = serializers.FloatField()
    geometry = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField())
    )


# ---------------------------------------------------------------------------
# Top-level output serializer
# ---------------------------------------------------------------------------


class TripResponseSerializer(serializers.Serializer):
    """
    Full API response shape for a calculated trip.

    Mirrors the structure returned by ``trips/views.CalculateTripView``.
    """

    trip_id = serializers.UUIDField()
    stops = StopSerializer(many=True)
    daily_logs = DailyELDLogSerializer(many=True)
    trip_summary = TripSummarySerializer()
    route = RouteGeometrySerializer()
