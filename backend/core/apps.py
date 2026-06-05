"""App configuration for the ``core`` app.

The ``core`` app holds project-wide concerns that don't belong to any
single feature: health checks, shared utilities, etc.
"""

from __future__ import annotations

from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
    verbose_name = "Core"
