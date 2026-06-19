"""
Root URL configuration for Spotter Route Planner & ELD Generator.
All API endpoints are namespaced under /api/.
"""

from django.urls import path, include

urlpatterns = [
    path("api/trips/", include("trips.urls")),
]
