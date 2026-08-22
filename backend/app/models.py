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

    # Telemetry / connectivity. A "connected" asset has a field gateway (or a
    # PAYG-style embedded GSM module) that streams state to the server. Most
    # assets are NOT connected — they are served by manual readings only, and
    # everything downstream works identically for both. ``device_id`` is the
    # gateway identifier a telemetry batch authenticates against.
    telemetry_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    device_id: Mapped[str | None] = mapped_column(String(64), index=True)

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
    telemetry_samples: Mapped[list["TelemetrySample"]] = relationship(
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

    # Origin of this reading: "manual" (a technician entered it) or "telemetry"
    # (rolled up from a connected gateway's samples). Everything downstream —
    # physics, faults, sync, audit — treats both identically. Defaults to
    # "manual" so existing rows and callers are unchanged.
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    # Cached results of the last Digital-Twin analysis of this reading, so the
    # trend forecaster has a time series without re-running physics. Nullable:
    # a reading is only scored once analysis has run against it.
    health_ratio: Mapped[float | None] = mapped_column(Float)  # actual / expected AC
    pr_iec: Mapped[float | None] = mapped_column(Float)        # IEC 61724 performance ratio

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
    # Structured extras for device-diagnosed / forecast faults: probable cause,
    # recommended_parts, a channel snapshot, or a forecast projection. Free-form
    # JSON so it stays additive; technician-reported faults leave it null.
    detail: Mapped[dict | None] = mapped_column(JSON)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class TelemetrySample(Base):
    """A single telemetry sample from a connected site's gateway.

    Telemetry arrives from a device gateway over cellular (in this build, from a
    labeled simulator posting to the same endpoint), **not** from the offline
    technician app — so there is no ``client_updated_at`` and no offline-sync
    bookkeeping here. Samples carry the device's own ``ts`` and are
    server-timestamped on arrival. A daily rollup aggregates samples into a
    ``Reading(source="telemetry")`` that flows through the normal physics/fault
    pipeline; the diagnostic channels below add the *cause* a single energy
    number cannot give.

    Idempotency: the ingestion endpoint de-duplicates on ``(asset_id, ts)`` so a
    gateway retrying over flaky signal does not double-count.
    """

    __tablename__ = "telemetry_samples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(
        ForeignKey("assets.id"), nullable=False, index=True
    )
    device_id: Mapped[str | None] = mapped_column(String(64), index=True)

    # Device's own timestamp for the sample (UTC).
    ts: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)

    # Energy channels.
    ac_power_w: Mapped[float | None] = mapped_column(Float)   # instantaneous AC power
    energy_kwh: Mapped[float | None] = mapped_column(Float)   # energy since previous sample

    # Diagnostic channels — the "why". Per-string DC voltages as a JSON list,
    # plus current, inverter status/fault code, module temperature and grid
    # voltage. All nullable: a device reports whatever subset it exposes.
    dc_string_voltages: Mapped[list | None] = mapped_column(JSON)
    dc_current_a: Mapped[float | None] = mapped_column(Float)
    inverter_status: Mapped[str | None] = mapped_column(String(20))  # ok/fault/offline
    inverter_code: Mapped[str | None] = mapped_column(String(40))    # vendor fault code
    module_temp_c: Mapped[float | None] = mapped_column(Float)
    grid_voltage_v: Mapped[float | None] = mapped_column(Float)

    # The pre-normalization payload the adapter received, kept for traceability
    # (shows the adapter turning a device's own shape into the canonical sample).
    raw: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    asset: Mapped["Asset"] = relationship(back_populates="telemetry_samples")


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
