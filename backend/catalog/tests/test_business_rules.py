"""Business-rule tests for the catalog queryset.

The sort rule under test (from the Phase 2 spec):

    Within a category, order by ``is_featured`` (featured first), then
    ``display_order``. **Unavailable items (coming_soon, sold_out) sort
    to the bottom.**

Plus: ``inactive`` is never returned by the public path.
"""

from __future__ import annotations

from decimal import Decimal

from django.test import TestCase

from catalog.models import Product, ProductVariant


def _p(name: str, *, status: str, is_featured: bool = False, order: int = 0) -> Product:
    return Product.objects.create(
        name=name,
        description="x",
        category=Product.Category.PIZZAS,
        status=status,
        is_featured=is_featured,
        display_order=order,
    )


class VisibleQuerySetTests(TestCase):
    def test_visible_excludes_only_inactive(self) -> None:
        _p("Activo", status=Product.Status.ACTIVE)
        _p("Próximo", status=Product.Status.COMING_SOON)
        _p("Agotado", status=Product.Status.SOLD_OUT)
        _p("Archivado", status=Product.Status.INACTIVE)

        visible = list(Product.objects.visible().order_by("name"))
        self.assertEqual([p.name for p in visible], ["Activo", "Agotado", "Próximo"])


class OrderedForDisplayTests(TestCase):
    """The canonical Phase 2 ordering rule, end-to-end."""

    def setUp(self) -> None:
        # Featured active products (should appear first, in display_order).
        self.featured_a = _p("Featured A", status=Product.Status.ACTIVE, is_featured=True, order=20)
        self.featured_b = _p("Featured B", status=Product.Status.ACTIVE, is_featured=True, order=10)
        # Non-featured active products.
        self.normal_a = _p("Normal A", status=Product.Status.ACTIVE, order=30)
        self.normal_b = _p("Normal B", status=Product.Status.ACTIVE, order=40)
        # Unavailable products (must sink to the bottom).
        self.coming_featured = _p(
            "Coming Featured",
            status=Product.Status.COMING_SOON,
            is_featured=True,
            order=5,
        )
        self.sold_out = _p("Sold Out", status=Product.Status.SOLD_OUT, order=15)
        # Inactive products (excluded entirely from the public path).
        _p("Archivado", status=Product.Status.INACTIVE, order=1)

    def test_unavailable_sinks_even_when_featured(self) -> None:
        """A featured ``coming_soon`` MUST appear after non-featured ``active``."""
        ordered = list(Product.objects.visible().ordered_for_display())
        names = [p.name for p in ordered]

        # The first 4 entries are active (featured first, then by display_order).
        self.assertEqual(
            names[:4],
            ["Featured B", "Featured A", "Normal A", "Normal B"],
        )
        # The last 2 entries are unavailable, ordered by display_order
        # within their bucket. "Coming Featured" (order=5) precedes
        # "Sold Out" (order=15) despite being more featured.
        self.assertEqual(names[4:], ["Coming Featured", "Sold Out"])

    def test_featured_ordering_within_active_bucket(self) -> None:
        ordered = list(Product.objects.filter(status=Product.Status.ACTIVE).ordered_for_display())
        names = [p.name for p in ordered]
        # Featured B (order=10) before Featured A (order=20),
        # then Normal A (order=30), then Normal B (order=40).
        self.assertEqual(names, ["Featured B", "Featured A", "Normal A", "Normal B"])

    def test_name_breaks_ties_after_display_order(self) -> None:
        # Two same-status, same-feature, same-display_order products
        # should fall back to alphabetical-by-name.
        Product.objects.all().delete()
        _p("Zeta", status=Product.Status.ACTIVE, order=10)
        _p("Alfa", status=Product.Status.ACTIVE, order=10)
        ordered = list(Product.objects.visible().ordered_for_display())
        self.assertEqual([p.name for p in ordered], ["Alfa", "Zeta"])

    def test_category_filter_composes_with_ordering(self) -> None:
        # Add a product in another category and ensure for_category() trims it.
        Product.objects.create(
            name="Pie de Limón",
            description="x",
            category=Product.Category.SWEETS,
            status=Product.Status.ACTIVE,
            is_featured=True,
            display_order=1,
        )
        pizza_results = list(
            Product.objects.visible().for_category(Product.Category.PIZZAS).ordered_for_display()
        )
        self.assertNotIn("Pie de Limón", [p.name for p in pizza_results])
        # All returned are pizzas.
        self.assertTrue(all(p.category == "pizzas" for p in pizza_results))


class HasMultipleVariantsTests(TestCase):
    def test_boundary_conditions(self) -> None:
        product = Product.objects.create(
            name="Pizza", description="x", category=Product.Category.PIZZAS
        )
        self.assertFalse(product.has_multiple_variants)  # 0 variants

        v1 = ProductVariant.objects.create(product=product, name="Mediana", price=Decimal("7500"))
        self.assertFalse(product.has_multiple_variants)  # 1 variant

        ProductVariant.objects.create(product=product, name="Familiar", price=Decimal("11500"))
        self.assertTrue(product.has_multiple_variants)  # 2 variants

        # Sanity check: deleting back to 1 reflects immediately.
        v1.delete()
        self.assertFalse(product.has_multiple_variants)
