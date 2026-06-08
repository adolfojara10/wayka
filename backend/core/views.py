"""Views for the ``core`` app."""

from __future__ import annotations

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SiteSettings
from .serializers import SiteSettingsSerializer

# ---------------------------------------------------------------------------
# Shared Cache-Control mixin (mirrors catalog/views.py)
# ---------------------------------------------------------------------------

CACHE_CONTROL_PUBLIC = "public, max-age=60, s-maxage=300"


class PublicReadOnlyMixin:
    """Stamps `Cache-Control` + `Vary` on successful read responses only."""

    def finalize_response(self, request: Request, response: Response, *args, **kwargs) -> Response:
        response = super().finalize_response(request, response, *args, **kwargs)
        if 200 <= response.status_code < 300:
            response.setdefault("Cache-Control", CACHE_CONTROL_PUBLIC)
            response.setdefault("Vary", "Accept-Language")
        return response


class HealthCheckView(APIView):
    """Liveness probe used by the frontend and CI smoke tests.

    Returns a small JSON payload identifying the service. Intentionally
    public — no authentication required.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Liveness check",
        description=(
            "Devuelve un payload mínimo indicando que el backend está "
            "vivo. No requiere autenticación."
        ),
        responses={
            200: OpenApiResponse(
                response={
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "example": "ok"},
                        "service": {
                            "type": "string",
                            "example": "wayka-backend",
                        },
                    },
                    "required": ["status", "service"],
                },
                description="El servicio está vivo.",
            ),
        },
    )
    def get(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "wayka-backend"})


@extend_schema(
    summary="Identidad y datos públicos del negocio",
    description=(
        "Devuelve la información de identidad del negocio (nombre, "
        "teléfono, dirección, horarios, redes sociales). El frontend "
        "la consume para construir el JSON-LD `FoodEstablishment` y "
        "renderizar el pie de página. Responde **404** si los ajustes "
        "no han sido creados aún (el frontend lo trata como 'sin "
        "datos' y omite las secciones dependientes)."
    ),
)
class SiteSettingsView(PublicReadOnlyMixin, generics.RetrieveAPIView):
    serializer_class = SiteSettingsSerializer

    def get_object(self) -> SiteSettings:
        # `get_or_404` would be wrong (creates one); we use `load()`
        # and let DRF raise 404 via Http404 if absent.
        settings = SiteSettings.load()
        if settings is None:
            from django.http import Http404

            raise Http404("Site settings have not been configured yet.")
        return settings
