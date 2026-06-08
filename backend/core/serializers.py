"""Serializers for the ``core`` app — SiteSettings + WeekdayHours.

The frontend consumes ``GET /api/site/`` once per render to build
LocalBusiness JSON-LD and the footer details. The shape is stable;
add fields, don't rename them.
"""

from __future__ import annotations

from rest_framework import serializers

from .models import SiteSettings, WeekdayHours


class WeekdayHoursSerializer(serializers.ModelSerializer):
    """Nested representation of a single weekday's opening hours."""

    day_label = serializers.SerializerMethodField()

    class Meta:
        model = WeekdayHours
        fields = ("day", "day_label", "open_time", "close_time")
        read_only_fields = fields

    def get_day_label(self, obj: WeekdayHours) -> str:
        return obj.get_day_display()


class SiteSettingsSerializer(serializers.ModelSerializer):
    """Public read-only representation of the site singleton."""

    hours = WeekdayHoursSerializer(many=True, read_only=True)

    class Meta:
        model = SiteSettings
        fields = (
            "business_name",
            "primary_phone",
            "email",
            "street_address",
            "address_locality",
            "address_region",
            "postal_code",
            "country_code",
            "latitude",
            "longitude",
            "social_instagram_url",
            "social_facebook_url",
            "hours",
            "updated_at",
        )
        read_only_fields = fields
