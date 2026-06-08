"""Serializers for the public catalog API (Phase 3).

Design rules:

  * **Stable shape.** The frontend (Next.js SSR + ISR) consumes this
    directly to build SEO-critical HTML. Breaking field changes here
    are breaking changes to Google's view of the site, so add new
    fields rather than rename existing ones whenever possible.
  * **SEO-aware payload.** Every field a downstream JSON-LD /
    OpenGraph emitter could need is exposed: ``meta_description``,
    ``alt_text``, an absolute ``image`` URL, a numeric ``price``
    suitable for ``Product.offers.price`` and a pre-formatted
    ``price_crc`` suitable for direct rendering, an
    ``availability`` enum aligned with Schema.org's ``ItemAvailability``,
    and ``is_orderable`` so the frontend never re-implements that rule.
  * **One source of truth for state.** ``is_orderable`` and
    ``availability`` come from the model layer; the frontend trusts
    them blindly.

Inactive products are filtered at the view layer (``.visible()``),
not here. This keeps the serializers oblivious to lifecycle policy.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from drf_spectacular.utils import OpenApiTypes, extend_schema_field
from rest_framework import serializers

from .models import Product, ProductVariant, Supermarket

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Mapping from our internal ``Product.Status`` to Schema.org
#: ``ItemAvailability`` strings. Used by JSON-LD on the frontend; we
#: emit the bare string (without the ``https://schema.org/`` prefix) so
#: it can be combined with the prefix at the consumer side or used as-is
#: by Next.js / Schema.org SEO libraries.
AVAILABILITY_BY_STATUS = {
    Product.Status.ACTIVE: "InStock",
    Product.Status.COMING_SOON: "PreOrder",
    Product.Status.SOLD_OUT: "OutOfStock",
    # INACTIVE never reaches the serializer (filtered at view layer)
    # but mapped to "Discontinued" as a defensive default.
    Product.Status.INACTIVE: "Discontinued",
}


def format_crc(amount: Decimal | float | int) -> str:
    """Format a number as a Costa Rican colón price string.

    Examples:
        >>> format_crc(7500)
        '₡ 7 500'
        >>> format_crc(12500.5)
        '₡ 12 501'
        >>> format_crc(950)
        '₡ 950'

    Uses a non-breaking space (U+00A0) as thousands separator to match
    the convention used in Costa Rica and to avoid awkward line wraps
    in price labels.
    """
    # Round to the nearest whole colón using HALF_UP (the conventional
    # commercial rounding rule). Python's built-in ``round()`` uses
    # banker's rounding which would surprise the client on .50 prices.
    # CRC subunits (céntimos) exist in theory but are not used for
    # retail prices.
    cents = int(Decimal(str(amount)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    nbsp = "\u00a0"
    sign = "-" if cents < 0 else ""
    digits = str(abs(cents))
    # Insert NBSP every three digits from the right.
    grouped = ""
    for i, ch in enumerate(reversed(digits)):
        if i > 0 and i % 3 == 0:
            grouped = nbsp + grouped
        grouped = ch + grouped
    return f"{sign}₡{nbsp}{grouped}"


# ---------------------------------------------------------------------------
# ProductVariant
# ---------------------------------------------------------------------------


class ProductVariantSerializer(serializers.ModelSerializer):
    """Per-portion variant nested inside a product."""

    price = serializers.SerializerMethodField()
    price_crc = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "name",
            "price",
            "price_crc",
            "is_default",
            "is_available",
            "display_order",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.NUMBER)
    def get_price(self, obj: ProductVariant) -> float:
        """Numeric price for math (cart totals, JSON-LD ``offers.price``)."""
        return float(obj.price)

    @extend_schema_field(OpenApiTypes.STR)
    def get_price_crc(self, obj: ProductVariant) -> str:
        """Pre-formatted CRC string for direct display."""
        return format_crc(obj.price)


# ---------------------------------------------------------------------------
# Product (list + detail)
# ---------------------------------------------------------------------------


class ProductListSerializer(serializers.ModelSerializer):
    """Public product representation for both list and detail views.

    Detail uses :class:`ProductDetailSerializer` (currently identical)
    so we have an explicit hook for richer detail-only fields in P4/P5
    (related products, full HTML description, etc.) without breaking
    the list contract.
    """

    is_orderable = serializers.BooleanField(read_only=True)
    has_multiple_variants = serializers.BooleanField(read_only=True)
    availability = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)
    default_variant_id = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "category",
            "status",
            "is_featured",
            "is_orderable",
            "has_multiple_variants",
            "availability",
            "image",
            "meta_description",
            "alt_text",
            "variants",
            "default_variant_id",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(
        {
            "type": "string",
            "enum": [
                "InStock",
                "PreOrder",
                "OutOfStock",
                "Discontinued",
            ],
            "description": (
                "Schema.org ItemAvailability value derived from "
                "``status``. Use as ``Product.offers.availability`` in "
                "JSON-LD on the frontend."
            ),
        }
    )
    def get_availability(self, obj: Product) -> str:
        return AVAILABILITY_BY_STATUS[obj.status]

    @extend_schema_field({"type": "integer", "nullable": True})
    def get_default_variant_id(self, obj: Product) -> int | None:
        default = obj.default_variant
        return default.id if default is not None else None

    @extend_schema_field({"type": "string", "format": "uri", "nullable": True})
    def get_image(self, obj: Product) -> str | None:
        """Return an **absolute** URL or ``None``.

        Absolute URLs are required so the SSR layer can embed the same
        image URL in OpenGraph / JSON-LD tags without re-resolving the
        host. Falls back to the relative URL if no request is in
        context (defensive — should not happen for DRF views).
        """
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        if request is None:
            return url
        return request.build_absolute_uri(url)


class ProductDetailSerializer(ProductListSerializer):
    """Detail-view representation. Identical to list today; kept as a
    subclass so we can add detail-only fields in P4/P5 without breaking
    the list contract."""


# ---------------------------------------------------------------------------
# Supermarket
# ---------------------------------------------------------------------------


class SupermarketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supermarket
        fields = (
            "id",
            "name",
            "address",
            "province",
            "canton",
            "latitude",
            "longitude",
        )
        read_only_fields = fields
