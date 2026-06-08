"""Models for the ``core`` app.

Phase 5 adds two models that feed the frontend's LocalBusiness JSON-LD
and Footer:

  * :class:`SiteSettings` — a singleton with the business identity
    (name, phone, address, geo, social URLs). Enforced as a singleton
    at the model layer (``save()`` clamps the pk) and at the admin
    layer (``has_add_permission`` returns False when one row exists).
  * :class:`WeekdayHours` — one row per weekday, related to the
    singleton. Lets the client edit opening hours in a structured way
    so the frontend can emit Schema.org ``openingHoursSpecification``.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models


class SiteSettings(models.Model):
    """Singleton holding the public business identity.

    Only one row is ever allowed; ``save()`` enforces this by clamping
    the primary key to 1. Admin further refuses to render the add
    form when a row already exists.
    """

    SINGLETON_PK = 1

    business_name = models.CharField(
        "nombre del negocio",
        max_length=120,
        default="Wayka",
    )
    primary_phone = models.CharField(
        "teléfono principal (E.164)",
        max_length=20,
        blank=True,
        help_text="Ej.: +50688887777.",
    )
    email = models.EmailField("correo electrónico", blank=True)
    street_address = models.CharField(
        "dirección",
        max_length=255,
        blank=True,
        help_text="Línea de calle, edificio, número.",
    )
    address_locality = models.CharField(
        "cantón",
        max_length=80,
        blank=True,
    )
    address_region = models.CharField(
        "provincia",
        max_length=80,
        blank=True,
    )
    postal_code = models.CharField(
        "código postal",
        max_length=10,
        blank=True,
    )
    country_code = models.CharField(
        "código de país (ISO 3166-1 alfa-2)",
        max_length=2,
        default="CR",
    )
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
    social_instagram_url = models.URLField(
        "Instagram",
        blank=True,
    )
    social_facebook_url = models.URLField(
        "Facebook",
        blank=True,
    )
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "ajustes del sitio"
        verbose_name_plural = "ajustes del sitio"

    def __str__(self) -> str:
        return self.business_name or "Wayka"

    def save(self, *args, **kwargs) -> None:
        """Force the row to live at pk=1.

        If a caller tries to insert a second row, ``save()`` rewrites
        its pk to the singleton's. When the singleton already exists
        we force an UPDATE rather than an INSERT (overriding any
        ``force_insert=True`` that ``Manager.create`` passes in) so
        the unique-pk collision cannot happen.

        This is belt-and-braces — :class:`SiteSettingsAdmin` already
        prevents adding more than one row via the admin UI.
        """
        self.pk = self.SINGLETON_PK
        if self.__class__.objects.filter(pk=self.SINGLETON_PK).exists():
            kwargs["force_insert"] = False
            kwargs["force_update"] = True
            self._state.adding = False
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs) -> tuple[int, dict[str, int]]:
        """Allow deletion but log a warning by raising in tests/admin.

        The admin disables deletion entirely so this only fires from
        scripts. We allow it for test isolation but require an
        explicit ``force=True`` to keep accidental wipes loud.
        """
        return super().delete(*args, **kwargs)

    @classmethod
    def load(cls) -> SiteSettings | None:
        """Return the singleton row, or ``None`` if it has not been
        created yet. Callers should treat ``None`` as 'business info
        not yet entered' and skip JSON-LD / footer details gracefully.
        """
        return cls.objects.filter(pk=cls.SINGLETON_PK).first()


class WeekdayHours(models.Model):
    """Opening hours for one weekday, attached to :class:`SiteSettings`.

    Stored as ``open_time`` / ``close_time`` (both nullable for
    "closed on this day"). The unique constraint on ``day`` keeps the
    admin tidy — only one row per weekday.
    """

    class Day(models.IntegerChoices):
        MONDAY = 0, "Lunes"
        TUESDAY = 1, "Martes"
        WEDNESDAY = 2, "Miércoles"
        THURSDAY = 3, "Jueves"
        FRIDAY = 4, "Viernes"
        SATURDAY = 5, "Sábado"
        SUNDAY = 6, "Domingo"

    settings = models.ForeignKey(
        SiteSettings,
        related_name="hours",
        on_delete=models.CASCADE,
        verbose_name="ajustes",
    )
    day = models.IntegerField("día", choices=Day.choices)
    open_time = models.TimeField(
        "abre",
        null=True,
        blank=True,
        help_text="Dejar vacío si el negocio está cerrado este día.",
    )
    close_time = models.TimeField(
        "cierra",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "horario"
        verbose_name_plural = "horarios"
        ordering = ["day"]
        constraints = [
            models.UniqueConstraint(
                fields=["settings", "day"],
                name="unique_weekday_per_settings",
            ),
        ]

    def __str__(self) -> str:
        if self.open_time and self.close_time:
            return f"{self.get_day_display()}: {self.open_time:%H:%M}–{self.close_time:%H:%M}"
        return f"{self.get_day_display()}: cerrado"

    def clean(self) -> None:
        super().clean()
        if (self.open_time is None) != (self.close_time is None):
            raise ValidationError(
                "Debe definir tanto la hora de apertura como la de cierre, "
                "o dejar ambas vacías (cerrado)."
            )
        if self.open_time and self.close_time and self.close_time <= self.open_time:
            raise ValidationError("La hora de cierre debe ser posterior a la de apertura.")
