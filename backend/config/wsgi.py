"""
WSGI config for Spotter Route Planner & ELD Generator.

Exposes the WSGI callable as a module-level variable named ``application``.
Used by gunicorn and other WSGI-compatible servers.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()
