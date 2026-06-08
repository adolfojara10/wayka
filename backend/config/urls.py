"""URL configuration for the Wayka backend (project: ``config``).

Top-level routes:

    /admin/                 → django.contrib.admin
    /api/health/            → core app (liveness probe)
    /api/products/          → catalog app
    /api/products/<slug>/   → catalog app
    /api/supermarkets/      → catalog app
    /api/schema/            → drf-spectacular OpenAPI 3 schema (YAML)
    /api/docs/              → drf-spectacular Swagger UI
    /api/redoc/             → drf-spectacular Redoc UI

The ``core`` and ``catalog`` apps both mount under ``/api/`` and have
no overlapping route names, so there is no conflict.
"""

from __future__ import annotations

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/", include("catalog.urls")),
    # API documentation -----------------------------------------------------
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

# Serve uploaded media files in development. In production this should be
# handled by the reverse proxy / CDN instead.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
