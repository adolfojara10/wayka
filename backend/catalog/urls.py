"""URL patterns for the ``catalog`` app, mounted under ``/api/``.

Exposed routes:

    GET /api/products/                  catalog list (filterable by category)
    GET /api/products/<slug>/           single product detail by slug
    GET /api/supermarkets/              active supermarket locations

All routes are public, read-only, JSON. Inactive products are not
reachable; their slugs return 404 — see ``views.ProductDetailView``.
"""

from __future__ import annotations

from django.urls import path

from .views import ProductDetailView, ProductListView, SupermarketListView

app_name = "catalog"

urlpatterns = [
    path("products/", ProductListView.as_view(), name="product-list"),
    path(
        "products/<slug:slug>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),
    path("supermarkets/", SupermarketListView.as_view(), name="supermarket-list"),
]
