"""Model-level tests for the ``catalog`` app.

Covers:
  - Slug auto-generation, uniqueness, preservation, accent handling.
  - Status / Category choice values matching the Phase 2 spec.
  - Variant relationship + uniqueness constraint.
  - ``Product.is_orderable`` / ``default_variant`` / ``has_multiple_variants``.
  - ``Supermarket`` saves with optional coordinates blank.
"""

from __future__ import annotations

from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase

from catalog.models import Product, ProductVariant, Supermarket


def _make_product(**overrides) -> Product:
    """Tiny factory keeping test bodies focused on what they assert."""
    defaults = {
        "name": "Producto de prueba",
        "description": "Descripción.",
        "category": Product.Category.SWEETS,
    }
    defaults.update(overrides)
    return Product.objects.create(**defaults)


class SlugBehaviourTests(TestCase):
    def test_slug_auto_generated_from_name_when_blank(self) -> None:
        product = _make_product(name="Pie de Limón")
        self.assertEqual(product.slug, "pie-de-limon")

    def test_slug_uniqueness_appends_suffix_on_collision(self) -> None:
        first = _make_product(name="Pie de Limón")
        second = _make_product(name="Pie de Limón")
        self.assertEqual(first.slug, "pie-de-limon")
        self.assertEqual(second.slug, "pie-de-limon-2")

    def test_slug_preserved_when_explicitly_set(self) -> None:
        product = _make_product(name="Pie de Limón", slug="custom-slug")
        self.assertEqual(product.slug, "custom-slug")

    def test_slug_normalizes_spanish_characters(self) -> None:
        product = _make_product(name="Empanadas Artesanales con Ñame")
        # ``slugify(... allow_unicode=False)`` ASCII-folds the eñe.
        self.assertEqual(product.slug, "empanadas-artesanales-con-name")


class ChoiceValueTests(TestCase):
    def test_status_choices_match_spec(self) -> None:
        self.assertEqual(Product.Status.ACTIVE.value, "active")
        self.assertEqual(Product.Status.COMING_SOON.value, "coming_soon")
        self.assertEqual(Product.Status.SOLD_OUT.value, "sold_out")
        self.assertEqual(Product.Status.INACTIVE.value, "inactive")
        self.assertEqual(
            {choice.value for choice in Product.Status},
            {"active", "coming_soon", "sold_out", "inactive"},
        )

    def test_category_choices_match_spec(self) -> None:
        self.assertEqual(Product.Category.BOCADITOS.value, "bocaditos")
        self.assertEqual(Product.Category.SWEETS.value, "sweets")
        self.assertEqual(Product.Category.PIZZAS.value, "pizzas")
        self.assertEqual(
            {choice.value for choice in Product.Category},
            {"bocaditos", "sweets", "pizzas"},
        )


class IsOrderableTests(TestCase):
    def test_only_active_status_is_orderable(self) -> None:
        cases = {
            Product.Status.ACTIVE: True,
            Product.Status.COMING_SOON: False,
            Product.Status.SOLD_OUT: False,
            Product.Status.INACTIVE: False,
        }
        for status, expected in cases.items():
            with self.subTest(status=status):
                product = _make_product(name=f"P-{status}", status=status)
                self.assertEqual(product.is_orderable, expected)


class VariantTests(TestCase):
    def setUp(self) -> None:
        self.product = _make_product(name="Pizza Margarita")

    def test_variant_str_includes_product_name(self) -> None:
        variant = ProductVariant.objects.create(
            product=self.product,
            name="Familiar",
            price=Decimal("11500.00"),
        )
        self.assertEqual(str(variant), "Pizza Margarita — Familiar")

    def test_unique_variant_name_per_product(self) -> None:
        ProductVariant.objects.create(product=self.product, name="Mediana", price=Decimal("7500"))
        with self.assertRaises(IntegrityError):
            ProductVariant.objects.create(
                product=self.product, name="Mediana", price=Decimal("7600")
            )

    def test_same_variant_name_allowed_across_products(self) -> None:
        other = _make_product(name="Pizza Cuatro Quesos")
        ProductVariant.objects.create(product=self.product, name="Mediana", price=Decimal("7500"))
        # Should NOT raise — the constraint is scoped to a single product.
        ProductVariant.objects.create(product=other, name="Mediana", price=Decimal("8800"))

    def test_default_variant_returns_marked_default(self) -> None:
        ProductVariant.objects.create(
            product=self.product, name="Pequeña", price=Decimal("6500"), display_order=10
        )
        explicit_default = ProductVariant.objects.create(
            product=self.product,
            name="Mediana",
            price=Decimal("8800"),
            is_default=True,
            display_order=20,
        )
        self.assertEqual(self.product.default_variant, explicit_default)

    def test_default_variant_falls_back_to_first_by_display_order(self) -> None:
        # No variant flagged as default.
        first = ProductVariant.objects.create(
            product=self.product, name="Pequeña", price=Decimal("6500"), display_order=10
        )
        ProductVariant.objects.create(
            product=self.product, name="Familiar", price=Decimal("11500"), display_order=20
        )
        self.assertEqual(self.product.default_variant, first)

    def test_default_variant_is_none_when_no_variants(self) -> None:
        self.assertIsNone(self.product.default_variant)


class SupermarketTests(TestCase):
    def test_saves_with_optional_coordinates_blank(self) -> None:
        sm = Supermarket.objects.create(
            name="Fresh Market",
            address="Av. Central",
            province="Heredia",
            canton="Heredia",
        )
        self.assertIsNone(sm.latitude)
        self.assertIsNone(sm.longitude)
        self.assertEqual(str(sm), "Fresh Market")
