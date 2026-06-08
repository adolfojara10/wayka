"""Django admin customizations for the ``catalog`` app.

Goals (per Phase 2 spec):

- Client manages everything without touching code.
- Drag-and-drop reordering of products and supermarkets
  (``django-admin-sortable2``).
- Inline editing of ``ProductVariant`` rows inside the product page.
- Spanish labels throughout.

The "at most one default variant per product" rule is enforced here
(not at the DB layer) by a custom inline formset that inspects the
forms before saving.
"""

from __future__ import annotations

from adminsortable2.admin import (
    CustomInlineFormSet,
    SortableAdminMixin,
    SortableTabularInline,
)
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils.html import format_html

from .models import Product, ProductVariant, Supermarket

# Site-wide branding for the admin chrome -----------------------------------
admin.site.site_header = "Wayka — Administración"
admin.site.site_title = "Wayka"
admin.site.index_title = "Panel"


# ---------------------------------------------------------------------------
# ProductVariant inline
# ---------------------------------------------------------------------------


class ProductVariantInlineFormSet(CustomInlineFormSet):
    """Forbid saving a product with more than one default variant.

    Enforced at the formset level because at ``Product.clean()`` time
    the inline forms have not been bound yet, so we'd be validating
    against stale DB rows. The DB itself stays permissive on purpose
    (see ``Product.default_variant`` for the resilient read path).

    Subclasses adminsortable2's ``CustomInlineFormSet`` (instead of
    Django's ``BaseInlineFormSet``) so that the sortable mixin can
    inject its ``default_order_direction`` / ``default_order_field``
    kwargs when the parent admin renders the inline.
    """

    def clean(self) -> None:
        super().clean()
        if any(self.errors):
            return
        defaults = 0
        for form in self.forms:
            if not form.cleaned_data or form.cleaned_data.get("DELETE"):
                continue
            if form.cleaned_data.get("is_default"):
                defaults += 1
        if defaults > 1:
            raise ValidationError("Solo una variante puede estar marcada como predeterminada.")


class ProductVariantInline(SortableTabularInline):
    model = ProductVariant
    formset = ProductVariantInlineFormSet
    extra = 1
    fields = (
        "name",
        "price",
        "is_default",
        "is_available",
        "display_order",
    )
    # SortableTabularInline expects the order column to be exposed as a
    # plain field; keep it editable so the client can fall back to typing
    # a number when drag-and-drop is not convenient.
    ordering = ("display_order",)


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------


@admin.register(Product)
class ProductAdmin(SortableAdminMixin, admin.ModelAdmin):
    inlines = [ProductVariantInline]

    list_display = (
        "name",
        "category",
        "status_badge",
        "is_featured",
        "variant_count",
        "updated_at",
    )
    list_display_links = ("name",)
    list_filter = ("category", "status", "is_featured")
    list_editable = ("is_featured",)
    search_fields = ("name", "slug", "description")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at")
    save_on_top = True

    fieldsets = (
        (
            "Información básica",
            {
                "fields": ("name", "slug", "description", "category"),
            },
        ),
        (
            "Estado y orden",
            {
                "fields": ("status", "is_featured", "display_order"),
                "description": (
                    "Recuerda: los productos marcados como <em>Inactivo</em> "
                    "no aparecen en el sitio público."
                ),
            },
        ),
        (
            "Imagen",
            {
                "fields": ("image", "alt_text"),
            },
        ),
        (
            "SEO",
            {
                "fields": ("meta_description",),
                "classes": ("collapse",),
            },
        ),
        (
            "Auditoría",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    # -- list_display helpers ------------------------------------------------

    @admin.display(description="estado", ordering="status")
    def status_badge(self, obj: Product) -> str:
        # Distinct neutral chip colors per status. The brand palette stays
        # reserved for the public-facing frontend; admin chrome uses
        # universally legible greys/oranges.
        color_by_status = {
            Product.Status.ACTIVE: "#2e7d32",
            Product.Status.COMING_SOON: "#1565c0",
            Product.Status.SOLD_OUT: "#c62828",
            Product.Status.INACTIVE: "#616161",
        }
        bg = color_by_status.get(obj.status, "#616161")
        label = obj.get_status_display()
        return format_html(
            '<span style="background:{}; color:white; padding:2px 8px; '
            'border-radius:999px; font-size:0.8em;">{}</span>',
            bg,
            label,
        )

    @admin.display(description="variantes")
    def variant_count(self, obj: Product) -> int:
        return obj.variants.count()


# ---------------------------------------------------------------------------
# Supermarket
# ---------------------------------------------------------------------------


@admin.register(Supermarket)
class SupermarketAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ("name", "province", "canton", "is_active", "display_order")
    list_filter = ("province", "is_active")
    list_editable = ("is_active",)
    search_fields = ("name", "address", "province", "canton")
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        (
            "Información básica",
            {"fields": ("name", "address", "province", "canton")},
        ),
        (
            "Ubicación (opcional)",
            {
                "fields": ("latitude", "longitude"),
                "description": "Coordenadas para mostrar en mapas. Se pueden dejar vacías.",
            },
        ),
        (
            "Estado y orden",
            {"fields": ("is_active", "display_order")},
        ),
        (
            "Auditoría",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
