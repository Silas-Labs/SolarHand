"""Pydantic v2 request/response schemas.

Enums are expressed as ``Literal[...]`` so validation lives here and the DB
stays plain strings (portable across SQLite/Postgres). Read models use
``from_attributes=True`` to serialise straight from ORM rows.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# --- Shared literals -------------------------------------------------------
Role = Literal["admin", "technician"]
AssetStatus = Literal["active", "inactive", "maintenance"]
JobType = Literal["install", "inspection", "repair", "cleaning", "commissioning"]
JobStatus = Literal["pending", "in_progress", "done", "cancelled"]
JobPriority = Literal["low", "normal", "high", "urgent"]
ComponentKind = Literal["module", "inverter", "battery", "charge_controller", "other"]
RatingUnit = Literal["Wp", "kVA", "kWh", "A", "V"]
FaultCategory = Literal[
    "soiling", "shading", "string_outage", "inverter_fault",
    "clipping", "wiring", "other",
]
FaultSeverity = Literal["info", "warning", "critical"]
# "technician" = reported by a person; "system" = Digital-Twin performance check
# on a reading; "telemetry" = diagnosed from a connected device's channels;
# "forecast" = raised pre-emptively by the trend forecaster.
FaultSource = Literal["technician", "system", "telemetry", "forecast"]
# Where a reading came from. Both origins run the identical physics/fault path.
ReadingSource = Literal["manual", "telemetry"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Auth ------------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminSignup(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=200)
    epra_technician_license: str | None = None


class RegisterRequest(BaseModel):
    """Onboard a new installer company together with its first admin user."""

    company: "CompanyCreate"
    admin: AdminSignup


class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    company: "CompanyRead"
    user: "UserRead"


# --- Company ---------------------------------------------------------------
class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    epra_contractor_license: str | None = None
    county: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    epra_contractor_license: str | None = None
    county: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None


class CompanyRead(ORMModel, CompanyBase):
    id: str
    created_at: datetime
    updated_at: datetime


# --- User ------------------------------------------------------------------
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    role: Role = "technician"
    company_id: str | None = None
    epra_technician_license: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=200)


class UserRead(ORMModel, UserBase):
    id: str
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    role: Role | None = None
    epra_technician_license: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=200)


# --- Component -------------------------------------------------------------
class ComponentBase(BaseModel):
    kind: ComponentKind
    make: str | None = None
    model: str | None = None
    rating_value: float | None = Field(default=None, ge=0)
    rating_unit: RatingUnit | None = None
    quantity: int = Field(default=1, ge=1)
    serial_number: str | None = None


class ComponentCreate(ComponentBase):
    pass


class ComponentRead(ORMModel, ComponentBase):
    id: str
    asset_id: str
    created_at: datetime


# --- Asset -----------------------------------------------------------------
class AssetBase(BaseModel):
    customer_name: str = Field(min_length=1, max_length=200)
    customer_phone: str | None = None
    location_name: str = Field(min_length=1, max_length=200)
    county: str | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    tilt_deg: float = Field(default=10.0, ge=0, le=90)
    azimuth_deg: float = Field(default=0.0, ge=0, le=360)
    system_kwp: float = Field(gt=0)
    inverter_kva: float | None = Field(default=None, ge=0)
    battery_kwh: float | None = Field(default=None, ge=0)
    module_type: str | None = None
    telemetry_enabled: bool = False
    device_id: str | None = None
    install_date: date | None = None
    status: AssetStatus = "active"
    notes: str | None = None


class AssetCreate(AssetBase):
    # Client may supply an id (offline-created) and its local edit time.
    id: str | None = None
    client_updated_at: datetime | None = None


class AssetUpdate(BaseModel):
    customer_name: str | None = Field(default=None, min_length=1, max_length=200)
    customer_phone: str | None = None
    location_name: str | None = Field(default=None, min_length=1, max_length=200)
    county: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    tilt_deg: float | None = Field(default=None, ge=0, le=90)
    azimuth_deg: float | None = Field(default=None, ge=0, le=360)
    system_kwp: float | None = Field(default=None, gt=0)
    inverter_kva: float | None = Field(default=None, ge=0)
    battery_kwh: float | None = Field(default=None, ge=0)
    module_type: str | None = None
    telemetry_enabled: bool | None = None
    device_id: str | None = None
    install_date: date | None = None
    status: AssetStatus | None = None
    notes: str | None = None
    client_updated_at: datetime | None = None


class AssetRead(ORMModel, AssetBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime
    client_updated_at: datetime | None = None


class AssetDetail(AssetRead):
    components: list[ComponentRead] = []


# --- Job -------------------------------------------------------------------
class JobBase(BaseModel):
    asset_id: str
    assigned_to: str | None = None
    type: JobType
    status: JobStatus = "pending"
    priority: JobPriority = "normal"
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    scheduled_date: date | None = None


class JobCreate(JobBase):
    id: str | None = None
    client_updated_at: datetime | None = None


class JobUpdate(BaseModel):
    assigned_to: str | None = None
    type: JobType | None = None
    status: JobStatus | None = None
    priority: JobPriority | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    scheduled_date: date | None = None
    completed_at: datetime | None = None
    client_updated_at: datetime | None = None


class JobRead(ORMModel, JobBase):
    id: str
    created_by: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    client_updated_at: datetime | None = None


# --- Reading ---------------------------------------------------------------
class ReadingBase(BaseModel):
    asset_id: str
    job_id: str | None = None
    reading_date: date
    energy_kwh: float = Field(ge=0)
    period_days: int = Field(default=1, ge=1)
    meter_value: float | None = Field(default=None, ge=0)
    notes: str | None = None
    source: ReadingSource = "manual"


class ReadingCreate(ReadingBase):
    id: str | None = None
    client_updated_at: datetime | None = None


class ReadingRead(ORMModel, ReadingBase):
    id: str
    recorded_by: str | None = None
    health_ratio: float | None = None
    pr_iec: float | None = None
    created_at: datetime
    client_updated_at: datetime | None = None


# --- Fault -----------------------------------------------------------------
class FaultReportBase(BaseModel):
    asset_id: str
    job_id: str | None = None
    reading_id: str | None = None
    category: FaultCategory
    severity: FaultSeverity = "warning"
    source: FaultSource = "technician"
    description: str | None = None
    detail: dict | None = None


class FaultReportCreate(FaultReportBase):
    id: str | None = None


class FaultReportRead(ORMModel, FaultReportBase):
    id: str
    resolved: bool
    created_at: datetime


# --- Audit -----------------------------------------------------------------
class AuditLogRead(ORMModel):
    id: int
    entity_type: str
    entity_id: str
    action: str
    actor_id: str | None = None
    payload: dict
    payload_hash: str
    prev_hash: str
    hash: str
    created_at: datetime


class AuditVerifyResult(BaseModel):
    valid: bool
    entries: int
    first_bad_hash: str | None = None


# --- Analytics (Digital Twin Lite) -----------------------------------------
AnalyticsSeverity = Literal[
    "healthy", "minor", "moderate", "severe", "anomalous", "unknown"
]


class AnalyzeRequest(BaseModel):
    """Ad-hoc performance check for an asset over a recent window.

    ``energy_kwh`` is the metered generation over ``period_days`` ending on
    ``reading_date``; the engine compares it against the physics-modelled
    expected yield for the same window.
    """

    energy_kwh: float = Field(ge=0)
    reading_date: date
    period_days: int = Field(default=1, ge=1, le=92)
    persist_fault: bool = False


class AnalysisResponse(BaseModel):
    asset_id: str
    reading_id: str | None = None
    severity: AnalyticsSeverity
    summary: str
    health_ratio: float | None = None          # actual / expected AC (~1 = healthy)
    performance_ratio_iec: float | None = None  # classic IEC PR (~0.8 = healthy)
    actual_kwh: float
    expected_ac_kwh: float
    expected_dc_ideal_kwh: float
    reference_yield_hours: float
    poa_insolation_kwh_m2: float
    sample_count: int
    window_start: datetime | None = None
    window_end: datetime | None = None
    likely_causes: list[str] = []
    fault_id: str | None = None                 # set if a fault was persisted


# --- Telemetry (connected sites) -------------------------------------------
class TelemetrySampleIn(BaseModel):
    """One normalized telemetry sample as it reaches the ingestion endpoint.

    A device adapter produces this canonical shape from whatever a specific
    gateway/inverter emits. All channels except ``ts`` are optional — a device
    reports whatever subset it exposes.
    """

    ts: datetime
    ac_power_w: float | None = Field(default=None, ge=0)
    energy_kwh: float | None = Field(default=None, ge=0)
    dc_string_voltages: list[float] | None = None
    dc_current_a: float | None = Field(default=None, ge=0)
    inverter_status: str | None = None
    inverter_code: str | None = None
    module_temp_c: float | None = None
    grid_voltage_v: float | None = Field(default=None, ge=0)
    raw: dict | None = None


class TelemetryBatchIn(BaseModel):
    """A batch a gateway POSTs to ``/telemetry`` (authenticated by gateway key).

    ``format`` names the adapter that normalizes ``samples`` — "canonical" is the
    shape our gateway/simulator emits; other values map to real-protocol
    adapters (a documented stub in this build). The device is resolved to its
    asset by ``device_id``; ``asset_id`` may be supplied to disambiguate.
    """

    device_id: str = Field(min_length=1, max_length=64)
    asset_id: str | None = None
    format: str = "canonical"
    samples: list[dict] = Field(min_length=1)


class TelemetryIngestResponse(BaseModel):
    asset_id: str
    device_id: str
    accepted: int
    duplicates: int
    diagnosis_fault_id: str | None = None  # set if ingest diagnosed a live fault


class TelemetrySampleRead(ORMModel):
    id: str
    asset_id: str
    device_id: str | None = None
    ts: datetime
    ac_power_w: float | None = None
    energy_kwh: float | None = None
    dc_string_voltages: list[float] | None = None
    dc_current_a: float | None = None
    inverter_status: str | None = None
    inverter_code: str | None = None
    module_temp_c: float | None = None
    grid_voltage_v: float | None = None
    created_at: datetime


class RollupResultItem(BaseModel):
    asset_id: str
    reading_id: str
    reading_date: date
    energy_kwh: float
    severity: AnalyticsSeverity
    health_ratio: float | None = None
    fault_id: str | None = None


class RollupResponse(BaseModel):
    processed_assets: int
    readings: list[RollupResultItem] = []


class ForecastResponse(BaseModel):
    """Statistical trend projection over a connected site's PR history.

    Pure least-squares slope on ``health_ratio`` vs. time — explainable, no ML.
    ``early_warning`` is true when a healthy site is trending toward the
    attention threshold within the projection horizon.
    """

    asset_id: str
    points: int
    current_health_ratio: float | None = None
    slope_per_day: float | None = None
    threshold: float
    projected_cross_date: date | None = None
    days_to_threshold: int | None = None
    early_warning: bool = False
    summary: str


# --- Offline sync ----------------------------------------------------------
class SyncPushRequest(BaseModel):
    """A batch of records queued offline on a device, pushed on reconnect."""

    assets: list[AssetCreate] = []
    jobs: list[JobCreate] = []
    readings: list[ReadingCreate] = []
    faults: list[FaultReportCreate] = []


class SyncItemResult(BaseModel):
    entity: str
    id: str
    action: Literal["created", "updated", "skipped", "error"]
    detail: str | None = None


class SyncPushResponse(BaseModel):
    server_time: datetime
    created: int
    updated: int
    skipped: int
    errors: int
    results: list[SyncItemResult]


class SyncPullResponse(BaseModel):
    server_time: datetime
    assets: list[AssetRead]
    jobs: list[JobRead]
    readings: list[ReadingRead]
    faults: list[FaultReportRead]


# Resolve forward references (RegisterRequest/RegisterResponse point at models
# defined further down the module).
RegisterRequest.model_rebuild()
RegisterResponse.model_rebuild()
