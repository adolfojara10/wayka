"""End-to-end API tests for the public catalog endpoints (Phase 3).

These tests speak HTTP through DRF's ``APIClient`` so they exercise
URL routing, middleware (``Content-Language``), and the cache
headers all in one shot. They intentionally avoid mocking — the goal
is to prove the on-the-wire contract Next.js will consume.
"""

from __future__ import annotations

from decimal import Decimal

from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from catalog.models import Product, ProductVariant, Supermarket

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _p(name: str, **overrides) -> Product:
    defaults = {
        "description": "x",
        "category": Product.Category.PIZZAS,
    }
    defaults.update(overrides)
    return Product.objects.create(name=name, **defaults)


def _v(product: Product, name: str, price, **overrides) -> ProductVariant:
    defaults = {"is_default": False, "is_available": True, "display_order": 10}
    defaults.update(overrides)
    return ProductVariant.objects.create(
        product=product, name=name, price=Decimal(str(price)), **defaults
    )


# ---------------------------------------------------------------------------
# /api/products/  (list)
# ---------------------------------------------------------------------------


class ProductListEndpointTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.url = reverse("catalog:product-list")

        # featured active (should be first)
        self.pizza = _p(
            "Pizza Margarita",
            category=Product.Category.PIZZAS,
            is_featured=True,
            display_order=10,
        )
        _v(self.pizza, "Mediana", 7500, is_default=True, display_order=10)
        _v(self.pizza, "Familiar", 11500, display_order=20)

        # non-featured active
        self.brownies = _p("Brownies", category=Product.Category.SWEETS, display_order=20)
        _v(self.brownies, "Unidad", 1500, is_default=True)

        # coming_soon -- visible but sinks to bottom
        self.coming = _p(
            "Bocadillos Mixtos",
            category=Product.Category.BOCADITOS,
            status=Product.Status.COMING_SOON,
            display_order=5,
        )
        _v(self.coming, "Bandeja", 8500, is_default=True)

        # sold_out -- visible but sinks to bottom
        self.sold = _p(
            "Tres Leches",
            category=Product.Category.SWEETS,
            status=Product.Status.SOLD_OUT,
            display_order=30,
        )
        _v(self.sold, "Porción", 2400, is_default=True, is_available=False)

        # inactive -- MUST be hidden entirely
        self.archived = _p(
            "Archivado",
            category=Product.Category.SWEETS,
            status=Product.Status.INACTIVE,
        )

    # -- basics ---------------------------------------------------------

    def test_returns_200_and_json(self) -> None:
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/json")

    def test_inactive_never_appears(self) -> None:
        response = self.client.get(self.url)
        slugs = {item["slug"] for item in response.json()}
        self.assertNotIn(self.archived.slug, slugs)

    def test_category_filter_works(self) -> None:
        response = self.client.get(self.url, {"category": "pizzas"})
        self.assertEqual(response.status_code, 200)
        results = response.json()
        self.assertTrue(all(p["category"] == "pizzas" for p in results))
        self.assertEqual([p["slug"] for p in results], [self.pizza.slug])

    def test_unknown_category_returns_400(self) -> None:
        """An invalid ``?category=`` returns a 400 with a structured
        DRF error body. This is the standard django-filter behavior and
        is the right answer for a JSON API: bad input gets a clear
        error rather than a silently-empty response that callers might
        cache or treat as 'no products in that category'."""
        response = self.client.get(self.url, {"category": "not_a_category"})
        self.assertEqual(response.status_code, 400)
        body = response.json()
        # DRF returns ``{"category": ["...error..."]}`` for filter errors.
        self.assertIn("category", body)

    # -- ordering -------------------------------------------------------

    def test_order_matches_phase2_rule(self) -> None:
        """Featured-active → non-featured-active → unavailable, ties broken
        by display_order. Inactive excluded."""
        response = self.client.get(self.url)
        slugs = [item["slug"] for item in response.json()]
        self.assertEqual(
            slugs,
            [
                self.pizza.slug,  # featured active
                self.brownies.slug,  # active, order=20
                self.coming.slug,  # coming_soon, order=5
                self.sold.slug,  # sold_out, order=30
            ],
        )

    # -- headers (SEO + caching) ----------------------------------------

    def test_response_includes_seo_friendly_headers(self) -> None:
        response = self.client.get(self.url)
        # Content-Language stamped by ContentLanguageMiddleware.
        self.assertEqual(response["Content-Language"], "es-CR")
        # Public Cache-Control stamped by PublicReadOnlyMixin.
        self.assertIn("public", response["Cache-Control"])
        self.assertIn("max-age=60", response["Cache-Control"])
        self.assertIn("s-maxage=300", response["Cache-Control"])

    # -- payload shape --------------------------------------------------

    def test_each_item_includes_seo_and_variant_fields(self) -> None:
        response = self.client.get(self.url, {"category": "pizzas"})
        pizza_item = response.json()[0]
        expected_keys = {
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
        }
        self.assertTrue(expected_keys.issubset(pizza_item.keys()))

    def test_variants_are_nested_and_ordered(self) -> None:
        response = self.client.get(self.url, {"category": "pizzas"})
        pizza_item = response.json()[0]
        variant_names = [v["name"] for v in pizza_item["variants"]]
        self.assertEqual(variant_names, ["Mediana", "Familiar"])
        # Each variant has both numeric and formatted price.
        first = pizza_item["variants"][0]
        self.assertEqual(first["price"], 7500.0)
        self.assertEqual(first["price_crc"], "₡\u00a07\u00a0500")

    def test_is_orderable_truth_table(self) -> None:
        response = self.client.get(self.url)
        is_orderable_by_slug = {p["slug"]: p["is_orderable"] for p in response.json()}
        self.assertTrue(is_orderable_by_slug[self.pizza.slug])
        self.assertTrue(is_orderable_by_slug[self.brownies.slug])
        self.assertFalse(is_orderable_by_slug[self.coming.slug])
        self.assertFalse(is_orderable_by_slug[self.sold.slug])

    def test_availability_maps_status_to_schema_org(self) -> None:
        response = self.client.get(self.url)
        availability_by_slug = {p["slug"]: p["availability"] for p in response.json()}
        self.assertEqual(availability_by_slug[self.pizza.slug], "InStock")
        self.assertEqual(availability_by_slug[self.brownies.slug], "InStock")
        self.assertEqual(availability_by_slug[self.coming.slug], "PreOrder")
        self.assertEqual(availability_by_slug[self.sold.slug], "OutOfStock")

    def test_image_is_null_when_no_upload(self) -> None:
        response = self.client.get(self.url)
        for item in response.json():
            self.assertIsNone(item["image"])

    def test_has_multiple_variants_flag(self) -> None:
        response = self.client.get(self.url)
        flag_by_slug = {p["slug"]: p["has_multiple_variants"] for p in response.json()}
        self.assertTrue(flag_by_slug[self.pizza.slug])  # 2 variants
        self.assertFalse(flag_by_slug[self.brownies.slug])  # 1 variant

    # -- N+1 guard ------------------------------------------------------

    def test_no_n_plus_one_on_variant_prefetch(self) -> None:
        """Adding more products / variants must not multiply queries.

        We assert an upper bound rather than an exact count to stay
        resilient to internal DRF/Django implementation changes.
        """
        # Add a handful more products + variants to make N+1 obvious.
        for i in range(5):
            extra = _p(f"Extra-{i}", category=Product.Category.PIZZAS)
            _v(extra, "Mediana", 5000 + i, is_default=True)
            _v(extra, "Familiar", 9000 + i)

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        # 1 query for products + 1 for the variants prefetch; allow a
        # tiny constant overhead for COUNT / transaction setup.
        self.assertLessEqual(
            len(ctx.captured_queries),
            5,
            f"Expected <=5 queries, got {len(ctx.captured_queries)}",
        )


# ---------------------------------------------------------------------------
# /api/products/<slug>/  (detail)
# ---------------------------------------------------------------------------


class ProductDetailEndpointTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.pizza = _p("Pizza Margarita", category=Product.Category.PIZZAS)
        _v(self.pizza, "Mediana", 7500, is_default=True)

        self.coming = _p(
            "Coming",
            category=Product.Category.BOCADITOS,
            status=Product.Status.COMING_SOON,
        )
        self.sold = _p(
            "Sold",
            category=Product.Category.SWEETS,
            status=Product.Status.SOLD_OUT,
        )
        self.archived = _p(
            "Archived",
            category=Product.Category.SWEETS,
            status=Product.Status.INACTIVE,
        )

    def _url_for(self, product: Product) -> str:
        return reverse("catalog:product-detail", kwargs={"slug": product.slug})

    def test_active_product_returns_200_with_payload(self) -> None:
        response = self.client.get(self._url_for(self.pizza))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["slug"], self.pizza.slug)
        self.assertTrue(response.json()["is_orderable"])

    def test_coming_soon_product_is_accessible(self) -> None:
        response = self.client.get(self._url_for(self.coming))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["is_orderable"])
        self.assertEqual(response.json()["availability"], "PreOrder")

    def test_sold_out_product_is_accessible(self) -> None:
        response = self.client.get(self._url_for(self.sold))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["availability"], "OutOfStock")

    def test_inactive_product_returns_404(self) -> None:
        response = self.client.get(self._url_for(self.archived))
        self.assertEqual(response.status_code, 404)

    def test_unknown_slug_returns_404(self) -> None:
        response = self.client.get(
            reverse("catalog:product-detail", kwargs={"slug": "nope-no-existe"})
        )
        self.assertEqual(response.status_code, 404)

    def test_404_response_does_not_leak_cache_header(self) -> None:
        """``Cache-Control: public`` on a 404 would be bad — CDNs could
        cache the missing-resource response and serve it to other
        visitors. Our mixin only stamps cache headers on 2xx."""
        response = self.client.get(self._url_for(self.archived))
        # ``Cache-Control`` may or may not be set by Django defaults,
        # but it must NOT contain our public+s-maxage stamp.
        cache_control = response.get("Cache-Control", "")
        self.assertNotIn("s-maxage=300", cache_control)


# ---------------------------------------------------------------------------
# /api/supermarkets/
# ---------------------------------------------------------------------------


class SupermarketEndpointTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.url = reverse("catalog:supermarket-list")

        Supermarket.objects.create(
            name="AutoMercado Escazú",
            address="Multiplaza Escazú",
            province="San José",
            canton="Escazú",
            latitude=Decimal("9.918500"),
            longitude=Decimal("-84.139700"),
            display_order=10,
            is_active=True,
        )
        Supermarket.objects.create(
            name="Fresh Market Heredia",
            address="Av. Central",
            province="Heredia",
            canton="Heredia",
            display_order=20,
            is_active=True,
        )
        # Inactive — must not appear.
        Supermarket.objects.create(
            name="Cerrado",
            address="x",
            province="Alajuela",
            canton="Alajuela",
            display_order=5,
            is_active=False,
        )

    def test_returns_only_active_in_display_order(self) -> None:
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        names = [s["name"] for s in response.json()]
        self.assertEqual(names, ["AutoMercado Escazú", "Fresh Market Heredia"])

    def test_payload_includes_coordinates(self) -> None:
        response = self.client.get(self.url)
        escazu = response.json()[0]
        self.assertEqual(escazu["province"], "San José")
        self.assertEqual(escazu["canton"], "Escazú")
        self.assertEqual(escazu["latitude"], "9.918500")
        self.assertEqual(escazu["longitude"], "-84.139700")

    def test_response_includes_seo_friendly_headers(self) -> None:
        response = self.client.get(self.url)
        self.assertEqual(response["Content-Language"], "es-CR")
        self.assertIn("public", response["Cache-Control"])


# ---------------------------------------------------------------------------
# Schema / docs surface
# ---------------------------------------------------------------------------


@override_settings(DEBUG=True)
class SchemaEndpointTests(APITestCase):
    """drf-spectacular endpoints are part of the public contract too."""

    def test_schema_endpoint_returns_openapi_yaml(self) -> None:
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        # Three endpoint summaries we wrote in views.py via @extend_schema.
        self.assertIn("/api/products/", body)
        self.assertIn("/api/products/{slug}/", body)
        self.assertIn("/api/supermarkets/", body)
