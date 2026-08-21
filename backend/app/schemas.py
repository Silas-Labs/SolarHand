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
FaultSource = Literal["technician", "system"]


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


class ReadingCreate(ReadingBase):
    id: str | None = None
    client_updated_at: datetime | None = None


class ReadingRead(ORMModel, ReadingBase):
    id: str
    recorded_by: str | None = None
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
