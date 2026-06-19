"""
OpenRouteService (ORS) API wrapper.

Provides geocoding and routing capabilities for the Spotter Route Planner.
Falls back to realistic mock data when the API key is absent or the API
is unreachable, so the application remains functional during development.

ORS API documentation: https://openrouteservice.org/dev/#/api-docs
"""

from __future__ import annotations

import logging
import math
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)

ORS_BASE_URL = "https://api.openrouteservice.org"
REQUEST_TIMEOUT = 5  # seconds

# ---------------------------------------------------------------------------
# Mock / fallback data
# ---------------------------------------------------------------------------

# A simplified Dallas → Houston → Chicago route used when ORS is unavailable.
_MOCK_GEOMETRY: list[list[float]] = [
    [-96.7970, 32.7767],   # Dallas, TX
    [-95.9183, 29.8526],   # Katy, TX (near Houston)
    [-95.3698, 29.7604],   # Houston, TX
    [-90.1994, 38.6270],   # St. Louis, MO  (en-route)
    [-87.6298, 41.8781],   # Chicago, IL
]

_MOCK_ROUTE: dict[str, Any] = {
    "distance_meters": 2_112_085.0,   # ~1 312 miles
    "duration_seconds": 70_200.0,     # ~19.5 hours driving
    "geometry": _MOCK_GEOMETRY,
    "waypoints": [
        {"name": "Dallas, TX", "location": [-96.7970, 32.7767]},
        {"name": "Houston, TX", "location": [-95.3698, 29.7604]},
        {"name": "Chicago, IL", "location": [-87.6298, 41.8781]},
    ],
}


def _decode_polyline(encoded: str) -> list[list[float]]:
    """
    Decode a Google/ORS encoded polyline string into a list of [lon, lat] pairs.

    The ORS API can return geometry as an encoded polyline (precision 5 or 6).
    This implementation handles precision-5 encoding (the default for most ORS
    endpoints when ``geometry_simplify`` is not set).
    """
    coords: list[list[float]] = []
    index = 0
    lat = 0
    lng = 0

    while index < len(encoded):
        # Decode latitude
        b, shift, result = 0, 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        d_lat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += d_lat

        # Decode longitude
        b, shift, result = 0, 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        d_lng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += d_lng

        coords.append([lng / 1e5, lat / 1e5])

    return coords


def geocode_location(location_name: str, api_key: str) -> tuple[float, float]:
    """
    Convert a human-readable location string to (longitude, latitude).

    Uses the ORS Geocoding Search endpoint:
        GET /geocode/search?api_key=<key>&text=<location>

    Parameters
    ----------
    location_name:
        Free-text location string, e.g. ``"Dallas, TX"``.
    api_key:
        ORS API key.  May be empty – in that case the mock mapping is tried.

    Returns
    -------
    (longitude, latitude) as floats.

    Raises
    ------
    ValueError
        If the location cannot be geocoded and no mock fallback exists.
    """
    # ------------------------------------------------------------------
    # Mock lookup – used when API key is absent or for known test cities
    # ------------------------------------------------------------------
    _known: dict[str, tuple[float, float]] = {
        "dallas":   (-96.7970, 32.7767),
        "houston":  (-95.3698, 29.7604),
        "chicago":  (-87.6298, 41.8781),
        "new york": (-74.0060, 40.7128),
        "los angeles": (-118.2437, 34.0522),
        "atlanta":  (-84.3880, 33.7490),
        "denver":   (-104.9903, 39.7392),
        "phoenix":  (-112.0740, 33.4484),
        "seattle":  (-122.3321, 47.6062),
        "miami":    (-80.1918, 25.7617),
    }

    if not api_key:
        lower = location_name.lower().strip()
        for key, coords in _known.items():
            if key in lower:
                logger.warning(
                    "ORS_API_KEY not set – returning mock coordinates for '%s'.",
                    location_name,
                )
                return coords
        # Fallback: return Dallas as a last resort when mock key not found
        logger.warning(
            "ORS_API_KEY not set and '%s' not in mock map – defaulting to Dallas.",
            location_name,
        )
        return (-96.7970, 32.7767)

    url = f"{ORS_BASE_URL}/geocode/search"
    params = {
        "api_key": api_key,
        "text": location_name,
        "size": 1,
        "layers": "locality,county,region,country",
    }

    try:
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        logger.warning("ORS geocode request failed for '%s': %s", location_name, exc)
        data = {"features": []}

    features = data.get("features", [])
    if features:
        # ORS returns [longitude, latitude]
        lon, lat = features[0]["geometry"]["coordinates"]
        logger.debug("Geocoded '%s' via ORS → (%.5f, %.5f)", location_name, lon, lat)
        return float(lon), float(lat)

    # ------------------------------------------------------------------
    # Fallback to Nominatim if ORS didn't find anything
    # ------------------------------------------------------------------
    logger.info("Falling back to Nominatim for location: '%s'", location_name)
    nom_url = "https://nominatim.openstreetmap.org/search"
    nom_params = {"q": location_name, "format": "json", "limit": 1}
    nom_headers = {"User-Agent": "SpotterApp/1.0"}
    
    try:
        nom_resp = requests.get(nom_url, params=nom_params, headers=nom_headers, timeout=REQUEST_TIMEOUT)
        nom_resp.raise_for_status()
        nom_data = nom_resp.json()
        if nom_data:
            lat, lon = float(nom_data[0]["lat"]), float(nom_data[0]["lon"])
            logger.debug("Geocoded '%s' via Nominatim → (%.5f, %.5f)", location_name, lon, lat)
            return lon, lat
    except requests.RequestException as exc:
        logger.error("Nominatim fallback failed for '%s': %s", location_name, exc)

    raise ValueError(
        f"No geocoding results found for location: '{location_name}'. Please check the spelling or try a nearby larger city."
    )


def get_route(
    waypoints: list[tuple[float, float]],
    api_key: str,
) -> dict[str, Any]:
    """
    Fetch a driving route between ordered waypoints via the ORS Directions API.

    Tries the ``driving-hgv`` (heavy goods vehicle) profile first; if that
    returns a non-2xx response, falls back to ``driving-car``.

    Parameters
    ----------
    waypoints:
        Ordered list of ``(longitude, latitude)`` tuples representing the
        route stops: [current_location, pickup, dropoff].
    api_key:
        ORS API key.

    Returns
    -------
    dict with keys:
        - ``distance_meters`` (float)
        - ``duration_seconds`` (float)
        - ``geometry`` (list of [lon, lat] pairs)
        - ``waypoints`` (list of waypoint dicts)

    Notes
    -----
    Falls back to mock data when the API key is missing or any HTTP error
    occurs, so callers never need to handle the absent-key case.
    """
    if not api_key:
        logger.warning("ORS_API_KEY not set – returning mock route data.")
        return _build_mock_route(waypoints)

    coordinates = [[lon, lat] for lon, lat in waypoints]

    for profile in ("driving-hgv", "driving-car"):
        url = f"{ORS_BASE_URL}/v2/directions/{profile}"
        headers = {
            "Authorization": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json, application/geo+json",
        }
        body = {
            "coordinates": coordinates,
            "format": "json",
            "geometry": True,
            "geometry_simplify": False,
            "instructions": False,
            "units": "m",
        }

        try:
            response = requests.post(
                url, json=body, headers=headers, timeout=REQUEST_TIMEOUT
            )
            if response.status_code == 404 and profile == "driving-hgv":
                logger.warning(
                    "driving-hgv profile returned 404; retrying with driving-car."
                )
                continue
            response.raise_for_status()
            data = response.json()
            return _parse_ors_response(data, waypoints)
        except requests.HTTPError as exc:
            if profile == "driving-hgv":
                logger.warning(
                    "driving-hgv failed (%s); falling back to driving-car.", exc
                )
                continue
            # driving-car also failed – use mock
            logger.error("ORS routing failed: %s – using mock data.", exc)
            return _build_mock_route(waypoints)
        except requests.RequestException as exc:
            logger.error("ORS routing network error: %s – using mock data.", exc)
            return _build_mock_route(waypoints)

    # Both profiles exhausted
    return _build_mock_route(waypoints)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _parse_ors_response(
    data: dict[str, Any],
    waypoints: list[tuple[float, float]],
) -> dict[str, Any]:
    """Parse a successful ORS directions JSON response into our canonical shape."""
    try:
        route = data["routes"][0]
        summary = route["summary"]
        distance_meters: float = float(summary["distance"])
        duration_seconds: float = float(summary["duration"])

        # Geometry may be an encoded string or a GeoJSON object
        raw_geom = route.get("geometry")
        if isinstance(raw_geom, str):
            geometry = _decode_polyline(raw_geom)
        elif isinstance(raw_geom, dict):
            # GeoJSON LineString
            geometry = raw_geom.get("coordinates", [])
        else:
            geometry = [[lon, lat] for lon, lat in waypoints]

        # Build waypoint list from ORS way_points indices into geometry
        ors_waypoints = []
        for i, wp in enumerate(data["routes"][0].get("way_points", [])):
            coord = geometry[wp] if wp < len(geometry) else list(waypoints[i])
            ors_waypoints.append(
                {"name": f"Waypoint {i + 1}", "location": coord}
            )

        return {
            "distance_meters": distance_meters,
            "duration_seconds": duration_seconds,
            "geometry": geometry,
            "waypoints": ors_waypoints,
        }
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Failed to parse ORS response: %s", exc)
        return _build_mock_route(waypoints)


def _build_mock_route(waypoints: list[tuple[float, float]]) -> dict[str, Any]:
    """
    Generate a plausible fallback route from the actual waypoint coordinates.
    
    Tries to use the public OSRM demo server for exact road routing.
    If the server is unavailable or fails, falls back to a straight-line route.
    """
    if len(waypoints) < 2:
        return _MOCK_ROUTE.copy()

    # Attempt to fetch exact road route from OSRM public API
    try:
        coords_str = ";".join(f"{lon},{lat}" for lon, lat in waypoints)
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
        resp = requests.get(osrm_url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                distance_meters = float(route["distance"])
                duration_seconds = float(route["duration"])
                geometry = route["geometry"]["coordinates"] # [lon, lat] list
                
                wp_list = [
                    {"name": f"Waypoint {i + 1}", "location": list(wp)}
                    for i, wp in enumerate(waypoints)
                ]
                
                logger.info("Successfully fetched fallback road route from OSRM.")
                return {
                    "distance_meters": distance_meters,
                    "duration_seconds": duration_seconds,
                    "geometry": geometry,
                    "waypoints": wp_list,
                }
    except Exception as exc:
        logger.error("OSRM fallback routing failed: %s – using straight-line fallback.", exc)

    # Compute total straight-line distance (Haversine) in metres
    total_meters = 0.0
    for i in range(len(waypoints) - 1):
        total_meters += _haversine_meters(waypoints[i], waypoints[i + 1])

    # Assume average road-distance multiplier of 1.25 over straight line
    road_meters = total_meters * 1.25
    # Assume 60 mph average → seconds
    duration_seconds = (road_meters / 1_000) / 96.56 * 3600  # 96.56 km/h = 60 mph

    # Build a simple interpolated geometry (10 points per leg)
    geometry: list[list[float]] = []
    for i in range(len(waypoints) - 1):
        start = waypoints[i]
        end = waypoints[i + 1]
        steps = 10
        for s in range(steps):
            t = s / steps
            lon = start[0] + (end[0] - start[0]) * t
            lat = start[1] + (end[1] - start[1]) * t
            geometry.append([lon, lat])
    geometry.append(list(waypoints[-1]))

    wp_list = [
        {"name": f"Waypoint {i + 1}", "location": list(wp)}
        for i, wp in enumerate(waypoints)
    ]

    return {
        "distance_meters": road_meters,
        "duration_seconds": duration_seconds,
        "geometry": geometry,
        "waypoints": wp_list,
    }


def _haversine_meters(
    point_a: tuple[float, float],
    point_b: tuple[float, float],
) -> float:
    """
    Calculate the great-circle distance in metres between two (lon, lat) points.
    """
    R = 6_371_000  # Earth radius in metres
    lon1, lat1 = point_a
    lon2, lat2 = point_b
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
