"""Catalog models — ``Product``, ``ProductVariant``, ``Supermarket``.

These are the customer-facing entities the Wayka client edits from
django-admin (see ``catalog/admin.py``). Per the Phase 2 spec they
own:

- product lifecycle (``status``: active / coming_soon / sold_out /
  inactive), with ``inactive`` being admin-only;
- portion variants with their own per-variant availability;
- supermarket pickup locations.

Pricing lives on ``ProductVariant`` only; ``Product`` has no single
price field. A product with one variant should render its price
directly on the frontend; with multiple, a size selector is required
before adding to the cart.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify

from .managers import ProductManager


class Product(models.Model):
    """A catalog item (e.g. an empanada, a pizza, a slice of pie)."""

    class Category(models.TextChoices):
        BOCADITOS = "bocaditos", "Bocaditos"
        SWEETS = "sweets", "Dulces"
        PIZZAS = "pizzas", "Pizzas"

    class Status(models.TextChoices):
        ACTIVE = "active", "Activo"
        COMING_SOON = "coming_soon", "Próximamente"
        SOLD_OUT = "sold_out", "Agotado"
        INACTIVE = "inactive", "Inactivo"

    name = models.CharField("nombre", max_length=120)
    slug = models.SlugField(
        "slug",
        max_length=140,
        unique=True,
        blank=True,
        help_text="Se genera automáticamente desde el nombre. Edítalo solo si sabes lo que haces.",
    )
    description = models.TextField("descripción")
    category = models.CharField(
        "categoría",
        max_length=20,
        choices=Category.choices,
        db_index=True,
    )
    status = models.CharField(
        "estado",
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    display_order = models.PositiveIntegerField(
        "orden",
        default=0,
        db_index=True,
        help_text="Posición dentro de la categoría. Menor número = aparece antes.",
    )
    is_featured = models.BooleanField(
        "destacado",
        default=False,
        help_text="Si está marcado, el producto se ancla al inicio de su categoría.",
    )
    image = models.ImageField(
        "imagen",
        upload_to="products/%Y/%m/",
        blank=True,
    )

    # SEO ----------------------------------------------------------------
    meta_description = models.CharField(
        "meta description (SEO)",
        max_length=160,
        blank=True,
        help_text="Idealmente entre 150 y 160 caracteres. Aparece en Google.",
    )
    alt_text = models.CharField(
        "texto alternativo de la imagen",
        max_length=160,
        blank=True,
        help_text="Descripción accesible de la foto. Importante para SEO y lectores de pantalla.",
    )

    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    objects = ProductManager()

    class Meta:
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["display_order", "name"]
        indexes = [
            models.Index(fields=["category", "status"]),
        ]

    # -----------------------------------------------------------------
    # Lifecycle
    # -----------------------------------------------------------------

    def __str__(self) -> str:
        return self.name

    def save(self, *args: object, **kwargs: object) -> None:
        """Auto-generate a unique slug from ``name`` when not set.

        Uniqueness is resolved by appending ``-2``, ``-3``, ... until a
        gap is found. This keeps slugs stable for existing products even
        when a new product collides.
        """
        if not self.slug:
            base = slugify(self.name) or "producto"
            candidate = base
            counter = 2
            qs = Product.objects.all()
            if self.pk is not None:
                qs = qs.exclude(pk=self.pk)
            while qs.filter(slug=candidate).exists():
                candidate = f"{base}-{counter}"
                counter += 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def clean(self) -> None:
        """Validate cross-field invariants enforced by the admin form."""
        super().clean()
        # The "at most one default variant" rule lives in the inline
        # formset's ``clean()`` (see admin.py) because at .clean() time
        # on the product itself the inline variants haven't been saved
        # yet. Hook left intentionally as a no-op for symmetry / future
        # business rules.

    # -----------------------------------------------------------------
    # Derived properties — read by serializers and templates.
    # -----------------------------------------------------------------

    @property
    def is_orderable(self) -> bool:
        """True iff the product accepts new orders right now."""
        return self.status == self.Status.ACTIVE

    @property
    def has_multiple_variants(self) -> bool:
        """Used by the frontend to decide whether to show a size selector."""
        return self.variants.count() > 1

    @property
    def default_variant(self) -> ProductVariant | None:
        """Return the variant marked ``is_default``, else the first by order.

        Resilient on purpose: we enforce single-default at the admin
        form layer (not the DB), so consumers must tolerate both 0 and
        2+ defaults gracefully. With 2+, we pick the first one by
        ``display_order``/``name``.
        """
        variants = list(self.variants.all())
        if not variants:
            return None
        defaults = [v for v in variants if v.is_default]
        if defaults:
            defaults.sort(key=lambda v: (v.display_order, v.name))
            return defaults[0]
        return variants[0]


class ProductVariant(models.Model):
    """A purchasable size/portion of a ``Product`` (Pequeña, Mediana, ...)."""

    product = models.ForeignKey(
        Product,
        related_name="variants",
        on_delete=models.CASCADE,
        verbose_name="producto",
    )
    name = models.CharField(
        "nombre",
        max_length=40,
        help_text='Ej.: "Pequeña", "Mediana", "Familiar".',
    )
    price = models.DecimalField(
        "precio (CRC ₡)",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    is_default = models.BooleanField(
        "predeterminada",
        default=False,
        help_text="La variante preseleccionada en la página del producto.",
    )
    is_available = models.BooleanField(
        "disponible",
        default=True,
        help_text="Desmarca para indicar que esta variante está agotada sin retirar las demás.",
    )
    display_order = models.PositiveIntegerField(
        "orden",
        default=0,
    )

    class Meta:
        verbose_name = "tamaño / variante"
        verbose_name_plural = "tamaños / variantes"
        ordering = ["display_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "name"],
                name="unique_variant_name_per_product",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} — {self.name}"

    def clean(self) -> None:
        super().clean()
        if self.price is not None and self.price < 0:
            raise ValidationError({"price": "El precio no puede ser negativo."})


class Supermarket(models.Model):
    """A physical pickup / retail location."""

    name = models.CharField("nombre", max_length=120)
    address = models.CharField("dirección", max_length=255)
    province = models.CharField("provincia", max_length=60)
    canton = models.CharField("cantón", max_length=60)
    latitude = models.DecimalField(
        "latitud",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    longitude = models.DecimalField(
        "longitud",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    display_order = models.PositiveIntegerField("orden", default=0)
    is_active = models.BooleanField(
        "activo",
        default=True,
        help_text="Desmarca para ocultar esta ubicación sin eliminarla.",
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "supermercado"
        verbose_name_plural = "supermercados"
        ordering = ["display_order", "name"]
        indexes = [models.Index(fields=["province"])]

    def __str__(self) -> str:
        return self.name
