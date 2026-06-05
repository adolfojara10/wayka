"""Smoke tests for the ``core`` app.

These tests confirm that the Django test runner works and that the
project boots far enough to serve a basic JSON endpoint. They are
intentionally minimal — feature apps will own their own test suites.
"""

from __future__ import annotations

from django.test import Client, TestCase
from django.urls import reverse


class HealthCheckTests(TestCase):
    """The ``/api/health/`` endpoint must respond with a stable shape."""

    def setUp(self) -> None:
        self.client = Client()

    def test_health_endpoint_returns_200(self) -> None:
        response = self.client.get(reverse("core:health"))
        self.assertEqual(response.status_code, 200)

    def test_health_endpoint_returns_expected_payload(self) -> None:
        response = self.client.get(reverse("core:health"))
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "wayka-backend"},
        )
