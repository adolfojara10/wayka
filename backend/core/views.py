"""Views for the ``core`` app."""

from __future__ import annotations

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


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
