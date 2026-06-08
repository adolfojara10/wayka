"""QuerySet and manager for ``Product``.

Encodes the P2 sort rule once so that admin, public API, and tests all
agree on what "the right order" means:

    1. ``inactive`` is never returned (``.visible()``).
    2. ``active`` items come before unavailable items
       (``coming_soon`` / ``sold_out`` sink to the bottom).
    3. Within the same availability bucket, featured items come first.
    4. Then ``display_order`` ascending, then ``name`` as a stable
       tiebreaker.

P3's REST endpoints will compose these on top of category filters:
``Product.objects.visible().for_category("pizzas").ordered_for_display()``.
"""

from __future__ import annotations

from django.db import models
from django.db.models import Case, IntegerField, Value, When


class ProductQuerySet(models.QuerySet):
    def visible(self) -> ProductQuerySet:
        """Everything the public site is allowed to show."""
        from .models import Product

        return self.exclude(status=Product.Status.INACTIVE)

    def for_category(self, category: str) -> ProductQuerySet:
        return self.filter(category=category)

    def ordered_for_display(self) -> ProductQuerySet:
        """Apply the canonical Phase 2 sort rule.

        Annotates two integer ranks (lower = earlier) and orders by them
        before falling back to ``display_order`` and ``name``. Doing this
        with ``Case``/``When`` keeps it a single SQL query, regardless of
        DB backend.
        """
        from .models import Product

        return self.annotate(
            _availability_rank=Case(
                When(status=Product.Status.ACTIVE, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            ),
            _feature_rank=Case(
                When(is_featured=True, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            ),
        ).order_by(
            "_availability_rank",
            "_feature_rank",
            "display_order",
            "name",
        )


ProductManager = models.Manager.from_queryset(ProductQuerySet)
