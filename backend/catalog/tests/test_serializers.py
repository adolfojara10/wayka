"""Serializer-level tests for the ``catalog`` app (Phase 3).

These tests exercise the serializers in isolation (no HTTP), so they
fail fast and locally when the JSON shape is wrong without dragging
in the URL/view layers.
"""

from __future__ import annotations

from decimal import Decimal

from django.test import RequestFactory, TestCase

from catalog.models import Product, ProductVariant
from catalog.serializers import (
    AVAILABILITY_BY_STATUS,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductVariantSerializer,
    format_crc,
)


class FormatCrcTests(TestCase):
    """The CRC formatter is small but underpins every price field."""

    def test_thousands_separator_is_nbsp(self) -> None:
        # Non-breaking space (U+00A0) between thousands.
        self.assertEqual(format_crc(7500), "₡\u00a07\u00a0500")
        self.assertEqual(format_crc(12500), "₡\u00a012\u00a0500")
        self.assertEqual(format_crc(950), "₡\u00a0950")
        self.assertEqual(format_crc(1_234_567), "₡\u00a01\u00a0234\u00a0567")

    def test_rounds_to_nearest_colon(self) -> None:
        self.assertEqual(format_crc(Decimal("12500.50")), "₡\u00a012\u00a0501")
        self.assertEqual(format_crc(Decimal("12500.49")), "₡\u00a012\u00a0500")

    def test_zero(self) -> None:
        self.assertEqual(format_crc(0), "₡\u00a00")


class ProductVariantSerializerTests(TestCase):
    def setUp(self) -> None:
        self.product = Product.objects.create(
            name="Pizza", description="x", category=Product.Category.PIZZAS
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            name="Familiar",
            price=Decimal("11500.00"),
            is_default=True,
            is_available=True,
            display_order=20,
        )

    def test_serialized_shape(self) -> None:
        data = ProductVariantSerializer(self.variant).data
        self.assertEqual(
            set(data.keys()),
            {
                "id",
                "name",
                "price",
                "price_crc",
                "is_default",
                "is_available",
                "display_order",
            },
        )

    def test_price_is_numeric_and_string_versions(self) -> None:
        data = ProductVariantSerializer(self.variant).data
        self.assertEqual(data["price"], 11500.0)
        self.assertIsInstance(data["price"], float)
        self.assertEqual(data["price_crc"], "₡\u00a011\u00a0500")


class ProductListSerializerTests(TestCase):
    def setUp(self) -> None:
        self.factory = RequestFactory()
        self.product = Product.objects.create(
            name="Pizza Cuatro Quesos",
            description="Cremosa.",
            category=Product.Category.PIZZAS,
            status=Product.Status.ACTIVE,
            is_featured=True,
            display_order=20,
            meta_description="Pizza cuatro quesos artesanal con masa madre.",
            alt_text="Pizza cuatro quesos con queso derretido.",
        )
        ProductVariant.objects.create(
            product=self.product,
            name="Pequeña",
            price=Decimal("6500"),
            display_order=10,
        )
        ProductVariant.objects.create(
            product=self.product,
            name="Mediana",
            price=Decimal("8800"),
            is_default=True,
            display_order=20,
        )

    def _serialize(self) -> dict:
        request = self.factory.get("/api/products/")
        return ProductListSerializer(self.product, context={"request": request}).data

    def test_payload_includes_required_seo_fields(self) -> None:
        data = self._serialize()
        for required in (
            "slug",
            "name",
            "description",
            "category",
            "status",
            "is_featured",
            "is_orderable",
            "availability",
            "meta_description",
            "alt_text",
            "image",
            "updated_at",
        ):
            self.assertIn(required, data, f"missing required field: {required}")

    def test_meta_description_and_alt_text_pass_through_unmodified(self) -> None:
        data = self._serialize()
        self.assertEqual(
            data["meta_description"],
            "Pizza cuatro quesos artesanal con masa madre.",
        )
        self.assertEqual(
            data["alt_text"],
            "Pizza cuatro quesos con queso derretido.",
        )

    def test_variants_nest_in_display_order(self) -> None:
        data = self._serialize()
        names = [v["name"] for v in data["variants"]]
        self.assertEqual(names, ["Pequeña", "Mediana"])

    def test_default_variant_id_points_to_marked_default(self) -> None:
        data = self._serialize()
        default = next(v for v in data["variants"] if v["is_default"])
        self.assertEqual(data["default_variant_id"], default["id"])

    def test_image_is_null_when_no_upload(self) -> None:
        data = self._serialize()
        self.assertIsNone(data["image"])

    def test_is_orderable_only_when_active(self) -> None:
        cases = {
            Product.Status.ACTIVE: True,
            Product.Status.COMING_SOON: False,
            Product.Status.SOLD_OUT: False,
        }
        for status, expected in cases.items():
            with self.subTest(status=status):
                self.product.status = status
                self.product.save()
                data = self._serialize()
                self.assertEqual(data["is_orderable"], expected)

    def test_availability_mapping_is_exhaustive(self) -> None:
        """Every Status value must map to a Schema.org ItemAvailability."""
        for status_value in Product.Status:
            self.assertIn(status_value, AVAILABILITY_BY_STATUS)
        self.assertEqual(AVAILABILITY_BY_STATUS[Product.Status.ACTIVE], "InStock")
        self.assertEqual(AVAILABILITY_BY_STATUS[Product.Status.COMING_SOON], "PreOrder")
        self.assertEqual(AVAILABILITY_BY_STATUS[Product.Status.SOLD_OUT], "OutOfStock")
        self.assertEqual(AVAILABILITY_BY_STATUS[Product.Status.INACTIVE], "Discontinued")


class ProductDetailSerializerTests(TestCase):
    def test_detail_extends_list_today(self) -> None:
        """Currently identical to list; this test pins that contract."""
        self.assertTrue(issubclass(ProductDetailSerializer, ProductListSerializer))
        self.assertEqual(
            set(ProductDetailSerializer.Meta.fields),
            set(ProductListSerializer.Meta.fields),
        )
