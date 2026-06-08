"""Tests for the ``core`` app.

Covers:

  * The original ``/api/health/`` liveness probe (P1).
  * :class:`SiteSettings` singleton enforcement and admin gating (P5).
  * :class:`WeekdayHours` validation + uniqueness (P5).
  * ``GET /api/site/`` returns the nested payload or 404 cleanly (P5).
"""

from __future__ import annotations

from datetime import time

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import Client, TestCase
from django.urls import reverse

from core.models import SiteSettings, WeekdayHours

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# SiteSettings singleton
# ---------------------------------------------------------------------------


class SiteSettingsModelTests(TestCase):
    def test_save_clamps_pk_to_one(self) -> None:
        first = SiteSettings.objects.create(business_name="Wayka")
        self.assertEqual(first.pk, SiteSettings.SINGLETON_PK)
        # A second create() with an explicit pk gets rewritten.
        SiteSettings.objects.create(pk=99, business_name="Wayka 2")
        self.assertEqual(SiteSettings.objects.count(), 1)
        # The second save() should have overwritten the first row.
        only = SiteSettings.objects.first()
        self.assertEqual(only.business_name, "Wayka 2")

    def test_load_returns_none_when_absent(self) -> None:
        self.assertIsNone(SiteSettings.load())

    def test_load_returns_singleton_when_present(self) -> None:
        SiteSettings.objects.create(business_name="Wayka")
        loaded = SiteSettings.load()
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.business_name, "Wayka")


class SiteSettingsAdminTests(TestCase):
    """The admin must allow exactly one row and refuse to delete it."""

    def setUp(self) -> None:
        User = get_user_model()
        User.objects.create_superuser(username="admin", email="a@b.cr", password="testpass123")
        self.client = Client()
        self.client.login(username="admin", password="testpass123")

    def test_add_allowed_when_no_row_exists(self) -> None:
        response = self.client.get(reverse("admin:core_sitesettings_add"))
        self.assertEqual(response.status_code, 200)

    def test_add_forbidden_when_singleton_exists(self) -> None:
        SiteSettings.objects.create(business_name="Wayka")
        response = self.client.get(reverse("admin:core_sitesettings_add"))
        # Admin returns 403 when has_add_permission is False.
        self.assertEqual(response.status_code, 403)

    def test_delete_link_absent(self) -> None:
        SiteSettings.objects.create(business_name="Wayka")
        response = self.client.get(
            reverse(
                "admin:core_sitesettings_change",
                args=[SiteSettings.SINGLETON_PK],
            )
        )
        # Spanish admin renders 'Eliminar' as the delete link; ensure
        # the button is not rendered.
        self.assertNotContains(response, 'class="deletelink"')


# ---------------------------------------------------------------------------
# WeekdayHours
# ---------------------------------------------------------------------------


class WeekdayHoursTests(TestCase):
    def setUp(self) -> None:
        self.settings = SiteSettings.objects.create(business_name="Wayka")

    def test_unique_constraint_per_settings_and_day(self) -> None:
        WeekdayHours.objects.create(
            settings=self.settings,
            day=WeekdayHours.Day.MONDAY,
            open_time=time(9, 0),
            close_time=time(18, 0),
        )
        with self.assertRaises(IntegrityError):
            WeekdayHours.objects.create(
                settings=self.settings,
                day=WeekdayHours.Day.MONDAY,
                open_time=time(10, 0),
                close_time=time(17, 0),
            )

    def test_clean_rejects_mixed_null(self) -> None:
        hours = WeekdayHours(
            settings=self.settings,
            day=WeekdayHours.Day.TUESDAY,
            open_time=time(9, 0),
            close_time=None,
        )
        with self.assertRaises(ValidationError):
            hours.full_clean()

    def test_clean_rejects_close_before_open(self) -> None:
        hours = WeekdayHours(
            settings=self.settings,
            day=WeekdayHours.Day.WEDNESDAY,
            open_time=time(18, 0),
            close_time=time(9, 0),
        )
        with self.assertRaises(ValidationError):
            hours.full_clean()

    def test_clean_accepts_both_null_as_closed(self) -> None:
        hours = WeekdayHours(
            settings=self.settings,
            day=WeekdayHours.Day.SUNDAY,
            open_time=None,
            close_time=None,
        )
        # Should not raise.
        hours.full_clean()


# ---------------------------------------------------------------------------
# /api/site/
# ---------------------------------------------------------------------------


class SiteSettingsEndpointTests(TestCase):
    def setUp(self) -> None:
        self.client = Client()
        self.url = reverse("core:site-settings")

    def test_returns_404_when_singleton_absent(self) -> None:
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)

    def test_returns_payload_when_singleton_exists(self) -> None:
        settings = SiteSettings.objects.create(
            business_name="Wayka",
            primary_phone="+50688887777",
            address_locality="Escazú",
            address_region="San José",
        )
        WeekdayHours.objects.create(
            settings=settings,
            day=WeekdayHours.Day.MONDAY,
            open_time=time(9, 0),
            close_time=time(18, 0),
        )
        WeekdayHours.objects.create(
            settings=settings,
            day=WeekdayHours.Day.SUNDAY,
            open_time=None,
            close_time=None,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["business_name"], "Wayka")
        self.assertEqual(body["primary_phone"], "+50688887777")
        self.assertEqual(body["country_code"], "CR")
        self.assertEqual(len(body["hours"]), 2)
        # Ordering: hours sorted by Meta.ordering (day asc).
        self.assertEqual(body["hours"][0]["day"], 0)
        self.assertEqual(body["hours"][0]["day_label"], "Lunes")
        self.assertEqual(body["hours"][0]["open_time"], "09:00:00")
        self.assertEqual(body["hours"][1]["day"], 6)
        self.assertIsNone(body["hours"][1]["open_time"])

    def test_returns_seo_headers_on_2xx(self) -> None:
        SiteSettings.objects.create(business_name="Wayka")
        response = self.client.get(self.url)
        self.assertEqual(response["Content-Language"], "es-CR")
        self.assertIn("public", response["Cache-Control"])

    def test_404_does_not_carry_public_cache_header(self) -> None:
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("s-maxage=300", response.get("Cache-Control", ""))


# ---------------------------------------------------------------------------
# Fixture sanity
# ---------------------------------------------------------------------------


class SampleSiteFixtureTests(TestCase):
    fixtures = ["sample_site"]

    def test_fixture_loads_one_settings_row_with_seven_weekday_rows(self) -> None:
        self.assertEqual(SiteSettings.objects.count(), 1)
        self.assertEqual(WeekdayHours.objects.count(), 7)
        # Sunday is the closed day.
        sunday = WeekdayHours.objects.get(day=WeekdayHours.Day.SUNDAY)
        self.assertIsNone(sunday.open_time)
