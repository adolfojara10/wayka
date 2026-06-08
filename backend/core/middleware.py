"""Project-wide middleware.

Currently a single piece: ``ContentLanguageMiddleware`` stamps every
HTTP response with ``Content-Language: es-CR``. This is a small but
real signal to Googlebot (and other crawlers / hreflang-aware tools)
that the entire site is Spanish (Costa Rica). It also matches the
``LANGUAGE_CODE = "es-cr"`` we set in ``settings.py``.

Why a middleware rather than per-view headers:
  - The site is monolingual; there is no per-route exception to make.
  - It applies to the admin, the API, the docs, and any future
    endpoints uniformly.
  - One easy place to flip in the future if we ever offer English.
"""

from __future__ import annotations

from collections.abc import Callable

from django.http import HttpRequest, HttpResponse


class ContentLanguageMiddleware:
    """Adds ``Content-Language: es-CR`` to every outgoing response."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        # Only set when not already present, so an explicit per-view
        # header (e.g. for a future bilingual page) takes precedence.
        response.setdefault("Content-Language", "es-CR")
        return response
