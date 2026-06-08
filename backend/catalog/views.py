"""Public catalog API views (Phase 3).

Three endpoints, all public, all read-only, all JSON:

    GET /api/products/                  → list of visible products
    GET /api/products/<slug>/           → single visible product
    GET /api/supermarkets/              → list of active supermarkets

Design notes:

* **No pagination.** A small artisanal-catering catalog stays small;
  one JSON response keeps SSR cache keys simple.
* **Inactive products → 404.** The detail view uses ``visible()``, so
  an inactive slug raises ``Http404`` automatically. This lets the
  frontend ``notFound()`` emit a real 404 to Googlebot for SEO.
* **Public cache headers.** Each response is decorated with a short
  ``Cache-Control`` window so SSR/ISR / CDN tiers can cheaply re-serve
  the payload without forwarding to Django on every request. The
  client-facing window is short (60s) so admin edits surface quickly.
"""

from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Product, Supermarket
from .serializers import (
    ProductDetailSerializer,
    ProductListSerializer,
    SupermarketSerializer,
)

# ---------------------------------------------------------------------------
# Shared header mixin
# ---------------------------------------------------------------------------

#: Short browser cache + longer shared (CDN/SSR) cache. The relatively
#: short ``max-age`` keeps stale content out of browser caches while
#: ``s-maxage`` lets Vercel/Cloudflare/Next.js ISR serve from edge for
#: longer. ``public`` is safe because every endpoint is anonymous.
CACHE_CONTROL_PUBLIC = "public, max-age=60, s-maxage=300"


class PublicReadOnlyMixin:
    """Stamps the canonical public-read cache + vary headers."""

    def finalize_response(self, request: Request, response: Response, *args, **kwargs) -> Response:
        response = super().finalize_response(request, response, *args, **kwargs)
        # Only stamp on successful reads — leave 404/500 to their defaults.
        if 200 <= response.status_code < 300:
            response.setdefault("Cache-Control", CACHE_CONTROL_PUBLIC)
            response.setdefault("Vary", "Accept-Language")
        return response


# ---------------------------------------------------------------------------
# Products — list
# ---------------------------------------------------------------------------


@extend_schema(
    summary="Listar productos visibles",
    description=(
        "Devuelve todos los productos que el sitio público puede mostrar "
        "(excluye los marcados como **inactivo**). El orden sigue la regla "
        "definida en la Fase 2: primero los **destacados activos**, luego "
        "los **no destacados activos**, y al final los **no disponibles** "
        "(`coming_soon` / `sold_out`). Soporta filtro por categoría."
    ),
    parameters=[
        OpenApiParameter(
            name="category",
            description="Filtra por categoría: `bocaditos`, `sweets` o `pizzas`.",
            required=False,
            type=str,
            enum=[c.value for c in Product.Category],
        ),
    ],
)
class ProductListView(PublicReadOnlyMixin, generics.ListAPIView):
    serializer_class = ProductListSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["category"]

    def get_queryset(self):
        return Product.objects.visible().ordered_for_display().prefetch_related("variants")


# ---------------------------------------------------------------------------
# Products — detail
# ---------------------------------------------------------------------------


@extend_schema(
    summary="Detalle de producto por slug",
    description=(
        "Devuelve un producto individual por su `slug`. Los productos "
        "**inactivos** y los slugs inexistentes responden con `404 Not "
        "Found` para que el frontend pueda emitir un 404 real al "
        "rastreador de Google."
    ),
)
class ProductDetailView(PublicReadOnlyMixin, generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Product.objects.visible().prefetch_related("variants")


# ---------------------------------------------------------------------------
# Supermarkets
# ---------------------------------------------------------------------------


@extend_schema(
    summary="Listar supermercados activos",
    description=(
        "Devuelve todas las ubicaciones de retail marcadas como activas. "
        "Cada entrada incluye dirección, provincia, cantón y coordenadas "
        "opcionales (útiles para mapas y JSON-LD `LocalBusiness`)."
    ),
)
class SupermarketListView(PublicReadOnlyMixin, generics.ListAPIView):
    serializer_class = SupermarketSerializer
    pagination_class = None

    def get_queryset(self):
        return Supermarket.objects.filter(is_active=True).order_by("display_order", "name")
