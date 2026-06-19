"""
API views for the Trips application.

Endpoints
---------
POST /api/trips/calculate
    Accept trip parameters, run the HOS engine, persist the Trip record,
    and return the full schedule + ELD logs as JSON.

GET /api/trips/<uuid:trip_id>/pdf
    Retrieve a previously calculated trip and stream its ELD logs as a
    multi-page PDF file.
"""

from __future__ import annotations

import logging
import os
import tempfile
from dataclasses import asdict
from datetime import datetime
from typing import Any

from django.http import FileResponse
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from hos_engine import eld_generator, log_renderer, trip_scheduler
from services import ors_service

from .models import Trip
from .serializers import TripRequestSerializer, TripResponseSerializer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _meters_to_miles(meters: float) -> float:
    """Convert metres to miles."""
    return meters / 1_609.344


def _stop_to_dict(stop) -> dict[str, Any]:
    """Safely convert a Stop dataclass or dict to a plain dict."""
    if hasattr(stop, "__dataclass_fields__"):
        return asdict(stop)
    return dict(stop)


def _daily_log_to_dict(log) -> dict[str, Any]:
    """Safely convert a DailyLog dataclass or dict to a plain dict."""
    if hasattr(log, "__dataclass_fields__"):
        return asdict(log)
    return dict(log)


# ---------------------------------------------------------------------------
# POST /api/trips/calculate
# ---------------------------------------------------------------------------


class CalculateTripView(APIView):
    """
    Calculate a complete FMCSA-compliant trip schedule.

    Accepts driver location data, geocodes each point via ORS, fetches the
    driving route, runs the HOS engine, generates ELD logs, persists the
    result, and returns the full structured response.
    """

    def post(self, request: Request) -> Response:
        """
        Process a trip calculation request.

        Request body (JSON)
        -------------------
        {
            "current_location": "Dallas, TX",
            "pickup_location": "Houston, TX",
            "dropoff_location": "Chicago, IL",
            "current_cycle_used": 12.5
        }

        Returns
        -------
        200 OK with the full trip schedule, or 4xx/5xx on error.
        """
        # ------------------------------------------------------------------
        # 1. Input validation
        # ------------------------------------------------------------------
        serializer = TripRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Trip calculation validation failed: %s", serializer.errors)
            return Response(
                {"error": "Invalid input.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validated = serializer.validated_data
        current_location: str = validated["current_location"]
        pickup_location: str = validated["pickup_location"]
        dropoff_location: str = validated["dropoff_location"]
        current_cycle_used: float = validated["current_cycle_used"]

        # ------------------------------------------------------------------
        # 2. Load ORS API key
        # ------------------------------------------------------------------
        api_key: str = os.environ.get("ORS_API_KEY", "")

        # ------------------------------------------------------------------
        # 3. Geocode all three locations
        # ------------------------------------------------------------------
        try:
            current_coords = ors_service.geocode_location(current_location, api_key)
            pickup_coords = ors_service.geocode_location(pickup_location, api_key)
            dropoff_coords = ors_service.geocode_location(dropoff_location, api_key)
        except ValueError as exc:
            logger.error("Geocoding failed: %s", exc)
            return Response(
                {"error": f"Geocoding failed: {exc}"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except Exception as exc:
            logger.exception("Unexpected geocoding error.")
            return Response(
                {"error": f"Geocoding service unavailable: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # ------------------------------------------------------------------
        # 4. Fetch route: current → pickup → dropoff
        # ------------------------------------------------------------------
        try:
            route_data = ors_service.get_route(
                [current_coords, pickup_coords, dropoff_coords],
                api_key,
            )
        except Exception as exc:
            logger.exception("Routing service error.")
            return Response(
                {"error": f"Routing service error: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        total_distance_miles = _meters_to_miles(route_data["distance_meters"])

        # Estimate pickup leg distance (current → pickup, ignoring dropoff leg)
        # Use a partial route query or approximate as half total if not available
        try:
            partial_route = ors_service.get_route(
                [current_coords, pickup_coords],
                api_key,
            )
            pickup_miles = _meters_to_miles(partial_route["distance_meters"])
        except Exception:
            # Fallback: assume pickup is proportionally mid-way
            pickup_miles = total_distance_miles * 0.4

        # Clamp pickup_miles so it never exceeds total
        pickup_miles = min(pickup_miles, total_distance_miles * 0.9)

        # ------------------------------------------------------------------
        # 5. Run the HOS trip scheduler
        # ------------------------------------------------------------------
        try:
            start_dt = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)

            schedule = trip_scheduler.schedule_trip(
                total_distance_miles=total_distance_miles,
                pickup_miles=pickup_miles,
                current_cycle_used=current_cycle_used,
                start_datetime=start_dt,
                pickup_coords=[pickup_coords[1], pickup_coords[0]],   # [lat, lon]
                dropoff_coords=[dropoff_coords[1], dropoff_coords[0]],
                pickup_location=pickup_location,
                dropoff_location=dropoff_location,
            )
        except Exception as exc:
            logger.exception("HOS engine error.")
            return Response(
                {"error": f"Trip scheduling error: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ------------------------------------------------------------------
        # 6. Generate ELD logs
        # ------------------------------------------------------------------
        try:
            eld_logs = eld_generator.generate_eld_logs(
                daily_logs=schedule["daily_logs"],
                driver_name="Driver",
                carrier_name="Spotter Logistics",
                vehicle_id="TRK-001",
            )
        except Exception as exc:
            logger.exception("ELD generation error.")
            return Response(
                {"error": f"ELD generation error: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ------------------------------------------------------------------
        # 7. Build response payload
        # ------------------------------------------------------------------
        stops_data = [_stop_to_dict(s) for s in schedule["stops"]]

        response_payload: dict[str, Any] = {
            "stops": stops_data,
            "daily_logs": eld_logs,
            "trip_summary": schedule["trip_summary"],
            "route": {
                "distance_meters": route_data["distance_meters"],
                "duration_seconds": route_data["duration_seconds"],
                "geometry": route_data["geometry"],
            },
        }

        # ------------------------------------------------------------------
        # 8. Persist Trip record
        # ------------------------------------------------------------------
        try:
            trip = Trip.objects.create(
                current_location=current_location,
                pickup_location=pickup_location,
                dropoff_location=dropoff_location,
                current_cycle_used=current_cycle_used,
                result_json=response_payload,
            )
            response_payload["trip_id"] = str(trip.id)
        except Exception as exc:
            logger.exception("Database write failed – returning result without persisting.")
            # Don't fail the request; just omit the trip_id
            response_payload["trip_id"] = None
            response_payload["warning"] = "Result could not be persisted to database."

        return Response(response_payload, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# GET /api/trips/<uuid:trip_id>/pdf
# ---------------------------------------------------------------------------


class TripPDFView(APIView):
    """
    Stream a previously calculated trip's ELD logs as a PDF.

    The PDF is rendered on-the-fly from the cached ``result_json`` stored on
    the Trip model, so no re-computation is needed.
    """

    def get(self, request: Request, trip_id) -> FileResponse | Response:
        """
        Render and return the ELD log PDF for the given trip.

        Parameters
        ----------
        trip_id:
            UUID of the Trip record (captured from the URL).

        Returns
        -------
        FileResponse (application/pdf) or 404/500 error response.
        """
        # ------------------------------------------------------------------
        # 1. Fetch the Trip record
        # ------------------------------------------------------------------
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response(
                {"error": f"Trip {trip_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not trip.result_json:
            return Response(
                {"error": "Trip has no computed result. Re-run the calculation."},
                status=status.HTTP_409_CONFLICT,
            )

        # ------------------------------------------------------------------
        # 2. Extract daily_logs from cached JSON
        # ------------------------------------------------------------------
        daily_logs: list[dict] = trip.result_json.get("daily_logs", [])
        if not daily_logs:
            return Response(
                {"error": "No daily ELD logs found in the stored result."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ------------------------------------------------------------------
        # 3. Render PDF to a temporary file
        # ------------------------------------------------------------------
        try:
            # Use a temp directory but keep a deterministic filename per trip
            tmp_dir = tempfile.gettempdir()
            pdf_path = os.path.join(tmp_dir, f"{trip_id}.pdf")
            log_renderer.render_log_to_pdf(daily_logs, pdf_path)
        except Exception as exc:
            logger.exception("PDF rendering failed for trip %s.", trip_id)
            return Response(
                {"error": f"PDF rendering failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ------------------------------------------------------------------
        # 4. Stream PDF back to the client
        # ------------------------------------------------------------------
        try:
            pdf_file = open(pdf_path, "rb")  # noqa: WPS515  # FileResponse closes it
            filename = f"eld_log_{str(trip_id)[:8]}.pdf"
            response = FileResponse(
                pdf_file,
                content_type="application/pdf",
                as_attachment=False,    # render inline; set True to force download
            )
            response["Content-Disposition"] = f'inline; filename="{filename}"'
            return response
        except OSError as exc:
            logger.exception("Could not open rendered PDF for trip %s.", trip_id)
            return Response(
                {"error": f"Could not read PDF file: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
