"""SQLAlchemy 2.0 ORM models for SolarHand.

Design notes
------------
* **String UUID primary keys.** Records can be created *offline* on a
  technician's phone, so the client generates the id (a UUID) and the server
  accepts it. This makes the offline-sync path collision-free without a
  server round-trip to allocate ids.
* **``client_updated_at``** on syncable tables powers last-write-wins conflict
  resolution when a queued offline edit finally reaches the server.
* **Enums as strings.** Status/role/category fields are plain strings,
  validated at the Pydantic layer (``Literal[...]``). This keeps SQLite and
  Postgres identical and avoids enum-migration pain during a 48h build.
* **AuditLog** uses an integer autoincrement id — audit rows are always
  server-generated and strictly ordered, never created offline.
"""

from __future__ import annotations

from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.timeutils import utcnow


def _uuid() -> str:
    return str(uuid4())


class TimestampMixin:
    """created_at / updated_at maintained server-side."""

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


class Company(TimestampMixin, Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    epra_contractor_license: Mapped[str | None] = mapped_column(String(100))
    county: Mapped[str | None] = mapped_column(String(100))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))

    users: Mapped[list["User"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    assets: Mapped[list["Asset"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    # "admin" (office/company manager) or "technician" (field worker).
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="technician")
    company_id: Mapped[str | None] = mapped_column(ForeignKey("companies.id"))
    epra_technician_license: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    company: Mapped["Company | None"] = relationship(back_populates="users")


class Asset(TimestampMixin, Base):
    """An installed solar PV system (the thing being serviced)."""

    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), nullable=False)

    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_phone: Mapped[str | None] = mapped_column(String(50))
    location_name: Mapped[str] = mapped_column(String(200), nullable=False)
    county: Mapped[str | None] = mapped_column(String(100))

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # PV geometry. Azimuth follows pvlib convention: degrees clockwise from
    # North (0=N, 90=E, 180=S, 270=W). Kenya is near the equator, so tilt is
    # typically low (~10°).
    tilt_deg: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    azimuth_deg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    system_kwp: Mapped[float] = mapped_column(Float, nullable=False)  # DC nameplate
    inverter_kva: Mapped[float | None] = mapped_column(Float)
    battery_kwh: Mapped[float | None] = mapped_column(Float)
    module_type: Mapped[str | None] = mapped_column(String(100))

    install_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    # Offline-sync bookkeeping (last-write-wins).
    client_updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    company: Mapped["Company"] = relationship(back_populates="assets")
    components: Mapped[list["Component"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )
    jobs: Mapped[list["Job"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )
    readings: Mapped[list["Reading"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )


class Component(Base):
    """An EPRA-rated part of an asset (needed for the Completion Certificate)."""

    __tablename__ = "components"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # module/inverter/...
    make: Mapped[str | None] = mapped_column(String(120))
    model: Mapped[str | None] = mapped_column(String(120))
    rating_value: Mapped[float | None] = mapped_column(Float)
    rating_unit: Mapped[str | None] = mapped_column(String(20))  # Wp/kVA/kWh/A
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    asset: Mapped["Asset"] = relationship(back_populates="components")


class Job(TimestampMixin, Base):
    """A field service task against an asset."""

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    type: Mapped[str] = mapped_column(String(30), nullable=False)  # inspection/repair/...
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="normal", nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    client_updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    asset: Mapped["Asset"] = relationship(back_populates="jobs")


class Reading(Base):
    """A meter/energy reading captured during a visit.

    ``energy_kwh`` is the generation measured over ``period_days`` ending on
    ``reading_date`` — this is what the analytics engine compares against the
    physics-modelled expected yield.
    """

    __tablename__ = "readings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), nullable=False)
    job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"))
    recorded_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    reading_date: Mapped[date] = mapped_column(Date, nullable=False)
    energy_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    period_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    meter_value: Mapped[float | None] = mapped_column(Float)  # optional cumulative meter
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    client_updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    asset: Mapped["Asset"] = relationship(back_populates="readings")


class FaultReport(Base):
    """A detected or reported fault, either by a technician or the classifier."""

    __tablename__ = "fault_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), nullable=False)
    job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"))
    reading_id: Mapped[str | None] = mapped_column(ForeignKey("readings.id"))

    category: Mapped[str] = mapped_column(String(30), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="warning", nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="technician", nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class AuditLog(Base):
    """Tamper-evident, hash-chained audit trail.

    Each row hashes its own canonical payload together with the previous row's
    hash, forming a chain: altering any historical row breaks verification of
    every row after it. This is the blockchain-free integrity story for EPRA
    compliance records.
    """

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(36))
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
