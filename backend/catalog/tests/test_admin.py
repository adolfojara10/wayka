"""Admin-layer smoke tests for the ``catalog`` app.

Covers:
  - Auth gate (anonymous users get redirected to /admin/login/).
  - Superuser can list and edit products.
  - Saving a Product with inline ProductVariants works end-to-end.
  - Inline formset rejects more than one default variant.
"""

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from catalog.models import Product, ProductVariant


class CatalogAdminAccessTests(TestCase):
    def test_anonymous_is_redirected_to_login(self) -> None:
        client = Client()
        response = client.get("/admin/catalog/product/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response["Location"])

    def test_staff_can_list_products(self) -> None:
        User = get_user_model()
        User.objects.create_superuser(
            username="admin", email="admin@wayka.cr", password="testpass123"
        )
        client = Client()
        client.login(username="admin", password="testpass123")

        Product.objects.create(
            name="Pizza Margarita",
            description="Test",
            category=Product.Category.PIZZAS,
        )

        response = client.get(reverse("admin:catalog_product_changelist"))
        self.assertEqual(response.status_code, 200)
        # The Spanish status label for the default ACTIVE status renders.
        self.assertContains(response, "Activo")


class CatalogAdminWriteTests(TestCase):
    """Submit the product change form with inline variants and assert
    the DB state afterwards."""

    def setUp(self) -> None:
        User = get_user_model()
        User.objects.create_superuser(
            username="admin", email="admin@wayka.cr", password="testpass123"
        )
        self.client = Client()
        self.client.login(username="admin", password="testpass123")

    def _form_payload(self, *, defaults_count: int) -> dict:
        """Build a management-form payload with two inline variants.

        ``defaults_count`` controls how many of them are marked as
        ``is_default`` (used to exercise both the happy and the rejection
        path of the formset's clean()).
        """
        variant_defaults = ["on", "on"][:defaults_count] + [""] * (2 - defaults_count)
        return {
            # Product fields ---------------------------------------------
            "name": "Empanadas Test",
            "slug": "empanadas-test",
            "description": "Empanadas de prueba.",
            "category": Product.Category.BOCADITOS,
            "status": Product.Status.ACTIVE,
            "display_order": "0",
            # is_featured intentionally omitted -> False
            "image": "",
            "alt_text": "",
            "meta_description": "",
            # Variants inline formset ------------------------------------
            "variants-TOTAL_FORMS": "2",
            "variants-INITIAL_FORMS": "0",
            "variants-MIN_NUM_FORMS": "0",
            "variants-MAX_NUM_FORMS": "1000",
            "variants-0-name": "Media docena",
            "variants-0-price": "3500.00",
            "variants-0-is_default": variant_defaults[0],
            "variants-0-is_available": "on",
            "variants-0-display_order": "10",
            "variants-1-name": "Docena",
            "variants-1-price": "6500.00",
            "variants-1-is_default": variant_defaults[1],
            "variants-1-is_available": "on",
            "variants-1-display_order": "20",
        }

    def test_create_product_with_inline_variants(self) -> None:
        response = self.client.post(
            reverse("admin:catalog_product_add"),
            data=self._form_payload(defaults_count=1),
            follow=False,
        )
        # Successful admin saves redirect (302) to the changelist.
        self.assertEqual(response.status_code, 302, response.content[:500])

        product = Product.objects.get(slug="empanadas-test")
        self.assertEqual(product.variants.count(), 2)
        names = list(product.variants.order_by("display_order").values_list("name", flat=True))
        self.assertEqual(names, ["Media docena", "Docena"])
        self.assertEqual(product.default_variant.name, "Media docena")
        # Spot-check decimal price round-trip.
        self.assertEqual(product.variants.get(name="Docena").price, Decimal("6500.00"))

    def test_admin_rejects_two_default_variants(self) -> None:
        response = self.client.post(
            reverse("admin:catalog_product_add"),
            data=self._form_payload(defaults_count=2),
            follow=False,
        )
        # Validation failure re-renders the form (200), no redirect.
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Product.objects.filter(slug="empanadas-test").exists())
        self.assertEqual(ProductVariant.objects.count(), 0)
        self.assertContains(
            response,
            "Solo una variante puede estar marcada como predeterminada.",
        )
