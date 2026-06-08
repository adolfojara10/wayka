"""URL patterns for the ``core`` app, mounted under ``/api/``."""

from __future__ import annotations

from django.urls import path

from .views import HealthCheckView, SiteSettingsView

app_name = "core"

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path("site/", SiteSettingsView.as_view(), name="site-settings"),
]
