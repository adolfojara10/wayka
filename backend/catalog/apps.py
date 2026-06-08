"""App configuration for the ``catalog`` app.

The ``catalog`` app owns the customer-facing content model: products,
their portion variants, and physical supermarket pickup locations. All
three are client-manageable from django-admin (see ``admin.py``).
"""

from __future__ import annotations

from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "catalog"
    verbose_name = "Catálogo"
