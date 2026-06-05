"""Views for the ``core`` app."""

from __future__ import annotations

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

    def get(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "wayka-backend"})
