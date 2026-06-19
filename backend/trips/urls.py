"""
URL configuration for the ``trips`` app.

Mounted at ``/api/trips/`` by the root URLconf.
"""

from django.urls import path

from . import views

app_name = "trips"

urlpatterns = [
    path("calculate", views.CalculateTripView.as_view(), name="calculate"),
    path("<uuid:trip_id>/pdf", views.TripPDFView.as_view(), name="pdf"),
]
