"""Admin registrations for the ``core`` app.

Registers the :class:`SiteSettings` singleton with a custom admin
that:

* prevents adding more than one row (``has_add_permission`` returns
  False once the singleton exists);
* prevents deleting the singleton (the frontend depends on its
  existence; the client should edit, not delete);
* exposes :class:`WeekdayHours` as a tabular inline so opening hours
  edit on the same screen.
"""

from __future__ import annotations

from django.contrib import admin

from .models import SiteSettings, WeekdayHours


class WeekdayHoursInline(admin.TabularInline):
    model = WeekdayHours
    extra = 0
    fields = ("day", "open_time", "close_time")
    ordering = ("day",)


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """Singleton admin for the site-wide business identity."""

    inlines = [WeekdayHoursInline]

    fieldsets = (
        (
            "Identidad",
            {"fields": ("business_name",)},
        ),
        (
            "Contacto",
            {"fields": ("primary_phone", "email")},
        ),
        (
            "Dirección",
            {
                "fields": (
                    "street_address",
                    "address_locality",
                    "address_region",
                    "postal_code",
                    "country_code",
                ),
            },
        ),
        (
            "Ubicación (opcional)",
            {
                "fields": ("latitude", "longitude"),
                "description": (
                    "Coordenadas para mostrar en mapas y emitir JSON-LD "
                    "<code>FoodEstablishment</code>. Opcionales."
                ),
            },
        ),
        (
            "Redes sociales",
            {"fields": ("social_instagram_url", "social_facebook_url")},
        ),
        (
            "Auditoría",
            {"fields": ("updated_at",), "classes": ("collapse",)},
        ),
    )
    readonly_fields = ("updated_at",)

    # -----------------------------------------------------------------
    # Singleton enforcement at the UI layer
    # -----------------------------------------------------------------

    def has_add_permission(self, request) -> bool:
        # Allow add when no row exists; refuse afterward.
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None) -> bool:
        # Never let the client delete the singleton via the admin.
        return False
