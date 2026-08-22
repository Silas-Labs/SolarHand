"""Seed the SolarHand database with realistic demo data.

Run it against whatever ``SOLARHAND_DATABASE_URL`` points at:

    python -m app.seed            # seed once; no-op if already seeded
    SEED_FORCE=1 python -m app.seed   # wipe every table, then reseed

The dataset is a small but complete installer world set around Kisumu, Kenya:
one licensed contractor, an admin and four field technicians, six installed PV
systems (each with EPRA-relevant components), a spread of jobs across every
status, metered readings — including one clearly under-performing site — and a
mix of technician-reported and system-detected faults.

Every write is mirrored into the hash-chained audit log through the same
:func:`app.audit.record_event` adapter the API uses, so the seeded history is
indistinguishable from real activity and passes ``GET /audit/verify``.
"""

from __future__ import annotations

import os
import sys
from datetime import date, datetime, timedelta

from app import audit, models
from app.database import SessionLocal, init_db
from app.security import hash_password
from app.timeutils import utcnow

# --- Demo constants --------------------------------------------------------
DEMO_PASSWORD = "solarhand"  # shared demo password; documented in the README
ADMIN_EMAIL = "admin@lakesidesolar.co.ke"

_TODAY = date.today()
_NOW = utcnow()


def _days_ago(n: int) -> date:
    return _TODAY - timedelta(days=n)


def _dt_days_ago(n: int) -> datetime:
    return _NOW - timedelta(days=n)


# --- Small helpers that create a row AND its audit entry -------------------
# Each mirrors the entity_type / action / payload the real routers emit.
class Seeder:
    def __init__(self, db):
        self.db = db
        self.actor_id: str | None = None  # whoever is "doing" the actions
        self.counts: dict[str, int] = {}

    def _bump(self, key: str) -> None:
        self.counts[key] = self.counts.get(key, 0) + 1

    def _add(self, row):
        self.db.add(row)
        self.db.flush()  # assign the id before we hash it into the audit chain
        return row

    def _event(self, *, entity_type, entity_id, action, payload, actor_id=None):
        audit.record_event(
            self.db,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id if actor_id is not None else self.actor_id,
            payload=payload,
        )

    # -- Entities -----------------------------------------------------------
    def company(self, **kw) -> models.Company:
        c = self._add(models.Company(**kw))
        self._bump("companies")
        self._event(entity_type="company", entity_id=c.id, action="create",
                    payload={"name": c.name})
        return c

    def user(self, **kw) -> models.User:
        password = kw.pop("password", DEMO_PASSWORD)
        u = self._add(models.User(hashed_password=hash_password(password), **kw))
        self._bump("users")
        self._event(entity_type="user", entity_id=u.id, action="create",
                    payload={"email": u.email, "role": u.role})
        return u

    def login(self, user: models.User) -> None:
        # A representative login event, exactly as the auth router records it.
        self._event(entity_type="user", entity_id=user.id, action="login",
                    payload={"email": user.email}, actor_id=user.id)

    def asset(self, **kw) -> models.Asset:
        a = self._add(models.Asset(**kw))
        self._bump("assets")
        self._event(entity_type="asset", entity_id=a.id, action="create",
                    payload={"customer": a.customer_name, "kwp": a.system_kwp})
        return a

    def component(self, **kw) -> models.Component:
        c = self._add(models.Component(**kw))
        self._bump("components")
        self._event(entity_type="component", entity_id=c.id, action="create",
                    payload={"kind": c.kind, "asset_id": c.asset_id})
        return c

    def job(self, **kw) -> models.Job:
        j = self._add(models.Job(**kw))
        self._bump("jobs")
        self._event(entity_type="job", entity_id=j.id, action="create",
                    payload={"asset_id": j.asset_id, "type": j.type, "title": j.title})
        return j

    def job_update(self, job: models.Job, fields: list[str], actor_id=None) -> None:
        self._event(entity_type="job", entity_id=job.id, action="update",
                    payload={"fields": sorted(fields)}, actor_id=actor_id)

    def reading(self, **kw) -> models.Reading:
        r = self._add(models.Reading(**kw))
        self._bump("readings")
        self._event(entity_type="reading", entity_id=r.id, action="create",
                    payload={"asset_id": r.asset_id, "energy_kwh": r.energy_kwh})
        return r

    def fault_reported(self, **kw) -> models.FaultReport:
        """A technician-reported fault — mirrors POST /faults."""
        f = self._add(models.FaultReport(source="technician", **kw))
        self._bump("faults")
        self._event(entity_type="fault", entity_id=f.id, action="create",
                    payload={"asset_id": f.asset_id, "category": f.category,
                             "severity": f.severity})
        return f

    def fault_detected(self, *, health_ratio: float, **kw) -> models.FaultReport:
        """A Digital-Twin-detected fault — mirrors the analytics router."""
        f = self._add(models.FaultReport(source="system", **kw))
        self._bump("faults")
        self._event(entity_type="fault_report", entity_id=f.id, action="detect",
                    payload={"asset_id": f.asset_id, "severity": f.severity,
                             "health_ratio": health_ratio})
        return f

    def telemetry_sample(self, **kw) -> models.TelemetrySample:
        """A single sample from a connected gateway (machine-origin).

        No per-sample audit event — telemetry is high-volume; the ingestion
        endpoint audits the batch, and the seed mirrors that.
        """
        t = self._add(models.TelemetrySample(**kw))
        self._bump("telemetry_samples")
        return t

    def fault_diagnosed(self, **kw) -> models.FaultReport:
        """A telemetry-diagnosed fault — mirrors the ingestion classifier.

        Carries a structured ``detail`` (probable cause, recommended parts, a
        channel snapshot) so the work order can dispatch with the *why*.
        """
        f = self._add(models.FaultReport(source="telemetry", **kw))
        self._bump("faults")
        self._event(entity_type="fault_report", entity_id=f.id, action="detect",
                    payload={"asset_id": f.asset_id, "severity": f.severity,
                             "source": "telemetry"})
        return f

    def resolve(self, fault: models.FaultReport, actor_id=None) -> None:
        fault.resolved = True
        self.db.flush()
        self._event(entity_type="fault", entity_id=fault.id, action="update",
                    payload={"resolved": True}, actor_id=actor_id)


# --- The dataset -----------------------------------------------------------
def _build(db) -> dict[str, int]:
    s = Seeder(db)

    company = s.company(
        name="Lakeside Solar Solutions Ltd",
        epra_contractor_license="EPRA/SPV/C1/2024/0417",
        county="Kisumu",
        contact_email="hello@lakesidesolar.co.ke",
        contact_phone="+254712345678",
    )

    # The admin is the actor for the company/user provisioning, just like a real
    # sign-up + team build-out.
    admin = s.user(
        email=ADMIN_EMAIL, full_name="Achieng Odhiambo", role="admin",
        company_id=company.id, epra_technician_license="EPRA/SPV/T1/2021/0088",
    )
    s.actor_id = admin.id

    brian = s.user(email="brian@lakesidesolar.co.ke", full_name="Brian Otieno",
                   role="technician", company_id=company.id,
                   epra_technician_license="EPRA/SPV/T3/2023/1182")
    mercy = s.user(email="mercy@lakesidesolar.co.ke", full_name="Mercy Akinyi",
                   role="technician", company_id=company.id,
                   epra_technician_license="EPRA/SPV/T3/2022/0934")
    kevin = s.user(email="kevin@lakesidesolar.co.ke", full_name="Kevin Omondi",
                   role="technician", company_id=company.id,
                   epra_technician_license="EPRA/SPV/T2/2024/2210")
    # A trainee without a licence yet — exercises the "no licence on file" paths.
    faith = s.user(email="faith@lakesidesolar.co.ke", full_name="Faith Wanjiku",
                   role="technician", company_id=company.id,
                   epra_technician_license=None)

    s.login(admin)  # one representative login in the trail

    def std_components(asset, *, modules, module_wp, inverter_kva,
                       battery_kwh=None, cc_amps=None, module_make="Jinko Solar",
                       module_model="Tiger Neo 550W", inverter_make="Deye"):
        s.component(asset_id=asset.id, kind="module", make=module_make,
                    model=module_model, rating_value=module_wp, rating_unit="Wp",
                    quantity=modules, serial_number=None)
        s.component(asset_id=asset.id, kind="inverter", make=inverter_make,
                    model=f"{inverter_kva:g}kVA hybrid", rating_value=inverter_kva,
                    rating_unit="kVA", quantity=1,
                    serial_number=f"INV-{asset.id[:6].upper()}")
        if battery_kwh is not None:
            s.component(asset_id=asset.id, kind="battery", make="Pylontech",
                        model="Force-H2", rating_value=battery_kwh,
                        rating_unit="kWh", quantity=1,
                        serial_number=f"BAT-{asset.id[:6].upper()}")
        if cc_amps is not None:
            s.component(asset_id=asset.id, kind="charge_controller",
                        make="Victron", model="SmartSolar MPPT",
                        rating_value=cc_amps, rating_unit="A", quantity=1)

    # -- Assets (installed PV systems around Kisumu) -----------------------
    a1 = s.asset(company_id=company.id, customer_name="Kisumu Central Clinic",
                 customer_phone="+254720111222", location_name="Milimani, Kisumu",
                 county="Kisumu", latitude=-0.1000, longitude=34.7517,
                 tilt_deg=10, azimuth_deg=0, system_kwp=12.5, inverter_kva=10,
                 battery_kwh=20, module_type="Monocrystalline",
                 telemetry_enabled=True, device_id="GW-CLINIC-01",
                 install_date=date(2024, 3, 11), status="active",
                 notes="Rooftop array over the outpatient wing; critical load backup.")
    std_components(a1, modules=24, module_wp=550, inverter_kva=10,
                   battery_kwh=20, cc_amps=60)

    a2 = s.asset(company_id=company.id, customer_name="Ahero Rice Mills",
                 customer_phone="+254733444555", location_name="Ahero Town",
                 county="Kisumu", latitude=-0.1747, longitude=34.9186,
                 tilt_deg=8, azimuth_deg=0, system_kwp=30.0, inverter_kva=25,
                 battery_kwh=None, module_type="Monocrystalline",
                 install_date=date(2023, 11, 2), status="active",
                 notes="Grid-tied, offsets daytime milling load. No storage.")
    std_components(a2, modules=55, module_wp=550, inverter_kva=25,
                   inverter_make="Huawei")

    a3 = s.asset(company_id=company.id, customer_name="Maseno University Hostel",
                 customer_phone="+254701222333", location_name="Maseno",
                 county="Kisumu", latitude=-0.0043, longitude=34.6000,
                 tilt_deg=10, azimuth_deg=0, system_kwp=18.0, inverter_kva=15,
                 battery_kwh=15, module_type="Monocrystalline",
                 install_date=date(2024, 6, 20), status="active",
                 notes="Student hostel; evening load carried by battery.")
    std_components(a3, modules=33, module_wp=550, inverter_kva=15, battery_kwh=15)

    a4 = s.asset(company_id=company.id, customer_name="Kombewa Sub-County Hospital",
                 customer_phone="+254712889900", location_name="Kombewa",
                 county="Kisumu", latitude=-0.1339, longitude=34.5069,
                 tilt_deg=10, azimuth_deg=0, system_kwp=22.0, inverter_kva=20,
                 battery_kwh=40, module_type="Monocrystalline",
                 install_date=date(2022, 9, 15), status="active",
                 notes="Large storage bank for theatre and cold chain.")
    std_components(a4, modules=40, module_wp=550, inverter_kva=20,
                   battery_kwh=40, cc_amps=100)

    # The under-performer: flagged for maintenance, low recent yield, faults.
    a5 = s.asset(company_id=company.id, customer_name="Muhoroni Sugar Depot",
                 customer_phone="+254799001122", location_name="Muhoroni",
                 county="Kisumu", latitude=-0.1569, longitude=35.1969,
                 tilt_deg=8, azimuth_deg=0, system_kwp=40.0, inverter_kva=36,
                 battery_kwh=None, module_type="Polycrystalline",
                 telemetry_enabled=True, device_id="GW-MUHORONI-01",
                 install_date=date(2023, 5, 30), status="maintenance",
                 notes="Output declining — suspected soiling from cane dust/bagasse.")
    std_components(a5, modules=73, module_wp=550, inverter_kva=36,
                   inverter_make="Sungrow")

    a6 = s.asset(company_id=company.id, customer_name="Nyamasaria Shopping Centre",
                 customer_phone="+254700334455", location_name="Nyamasaria, Kisumu",
                 county="Kisumu", latitude=-0.1050, longitude=34.8100,
                 tilt_deg=10, azimuth_deg=0, system_kwp=8.0, inverter_kva=6,
                 battery_kwh=10, module_type="Monocrystalline",
                 install_date=date(2024, 1, 18), status="active",
                 notes="Small commercial roof; powers shops and security lights.")
    std_components(a6, modules=15, module_wp=550, inverter_kva=6,
                   battery_kwh=10, cc_amps=40)

    # -- Jobs (spread across every status/type/priority) -------------------
    s.job(asset_id=a1.id, assigned_to=brian.id, created_by=admin.id,
          type="commissioning", status="done", priority="normal",
          title="Commission clinic array", scheduled_date=date(2024, 3, 11),
          completed_at=datetime(2024, 3, 11, 15, 30),
          description="Final commissioning and handover of the 12.5 kWp system.")
    s.job(asset_id=a1.id, assigned_to=mercy.id, created_by=admin.id,
          type="inspection", status="done", priority="low",
          title="Quarterly inspection — Kisumu Clinic",
          scheduled_date=_days_ago(30), completed_at=_dt_days_ago(29),
          description="Routine check of array, inverter logs and battery health.")

    # In-progress repair on the under-performer.
    j_repair = s.job(asset_id=a5.id, assigned_to=kevin.id, created_by=admin.id,
                     type="repair", status="in_progress", priority="high",
                     title="Investigate low output — Muhoroni",
                     scheduled_date=_days_ago(2),
                     description="Yield down ~40%. Inspect for soiling and string faults.")
    # Show an assign + status change in the audit trail for this job.
    s.job_update(j_repair, ["assigned_to", "status"], actor_id=admin.id)

    s.job(asset_id=a2.id, assigned_to=faith.id, created_by=admin.id,
          type="cleaning", status="pending", priority="normal",
          title="Panel cleaning — Ahero Rice Mills", scheduled_date=_days_ago(-3),
          description="Scheduled wash-down; dusty harvest season.")
    s.job(asset_id=a3.id, assigned_to=brian.id, created_by=admin.id,
          type="inspection", status="pending", priority="normal",
          title="Post-install inspection — Maseno", scheduled_date=_days_ago(-1))
    s.job(asset_id=a4.id, assigned_to=mercy.id, created_by=admin.id,
          type="repair", status="done", priority="urgent",
          title="Replace faulty inverter fan — Kombewa",
          scheduled_date=_days_ago(11), completed_at=_dt_days_ago(10),
          description="Inverter over-temperature alarm; fan module replaced.")
    s.job(asset_id=a6.id, assigned_to=kevin.id, created_by=admin.id,
          type="inspection", status="in_progress", priority="low",
          title="Check wiring warning — Nyamasaria", scheduled_date=_days_ago(1))
    s.job(asset_id=a2.id, assigned_to=None, created_by=admin.id,
          type="repair", status="cancelled", priority="normal",
          title="Duplicate ticket (cancelled)", scheduled_date=_days_ago(6),
          description="Cancelled — merged into the cleaning job.")

    # -- Readings (metered generation windows) -----------------------------
    # Healthy sites read near their physics-modelled expectation; Muhoroni reads
    # well below, which is what the Digital Twin flags.
    s.reading(asset_id=a1.id, recorded_by=mercy.id, reading_date=_days_ago(29),
              energy_kwh=1320.0, period_days=30, notes="Monthly total, clinic.")
    s.reading(asset_id=a2.id, recorded_by=faith.id, reading_date=_days_ago(20),
              energy_kwh=3180.0, period_days=30)
    s.reading(asset_id=a3.id, recorded_by=brian.id, reading_date=_days_ago(15),
              energy_kwh=1900.0, period_days=30)
    s.reading(asset_id=a4.id, recorded_by=mercy.id, reading_date=_days_ago(10),
              energy_kwh=2260.0, period_days=30)
    s.reading(asset_id=a6.id, recorded_by=kevin.id, reading_date=_days_ago(8),
              energy_kwh=845.0, period_days=30)
    # Muhoroni: a healthy baseline two months ago, then a depressed recent month.
    s.reading(asset_id=a5.id, recorded_by=brian.id, reading_date=_days_ago(62),
              energy_kwh=4280.0, period_days=30, notes="Baseline, pre-decline.")
    s.reading(asset_id=a5.id, recorded_by=kevin.id, reading_date=_days_ago(2),
              energy_kwh=2600.0, period_days=30,
              notes="Down sharply vs baseline — logged during repair visit.")

    # -- Telemetry (connected sites: a1 clinic, a5 Muhoroni) ----------------
    # Only connected assets carry telemetry. a1 is healthy but on a gentle
    # downward slope — the forecaster's early-warning demo; a5 has a collapsed
    # DC string that the diagnostic channels expose — the "move with facts" demo.
    #
    # These telemetry Readings carry a pre-computed health_ratio/pr_iec, standing
    # in for readings the daily rollup has already scored via the physics engine,
    # so the trend forecaster has a series to project the moment the app boots.
    a1_trend = [
        # (days_ago, energy_kwh, health_ratio, pr_iec)
        (12, 56.0, 1.000, 0.840),
        (10, 55.2, 0.990, 0.832),
        (8, 54.4, 0.980, 0.824),
        (6, 53.8, 0.972, 0.817),
        (4, 53.2, 0.963, 0.809),
        (2, 52.8, 0.955, 0.802),
    ]
    for days, kwh, hr, pr in a1_trend:
        s.reading(asset_id=a1.id, recorded_by=None, reading_date=_days_ago(days),
                  energy_kwh=kwh, period_days=1, source="telemetry",
                  health_ratio=hr, pr_iec=pr,
                  notes="Daily rollup from connected gateway GW-CLINIC-01.")

    def _sample_time(day_offset: int, hour: int) -> datetime:
        d = _TODAY - timedelta(days=day_offset)
        return datetime(d.year, d.month, d.day, hour, 0, 0)

    # a1 — a healthy diurnal curve for today (feeds the live telemetry panel).
    a1_curve = [
        # (hour, ac_power_w, [string V], module_temp_c, grid_V, energy_kwh)
        (7, 2800.0, [618.0, 616.0], 31.0, 239.0, 4.4),
        (9, 7400.0, [611.0, 609.0], 41.0, 240.0, 12.8),
        (11, 10200.0, [604.0, 602.0], 51.0, 241.0, 19.2),
        (13, 9600.0, [601.0, 599.0], 55.0, 241.0, 18.4),
        (15, 6300.0, [603.0, 601.0], 47.0, 240.0, 11.6),
        (17, 2100.0, [612.0, 610.0], 36.0, 239.0, 3.4),
    ]
    for hour, w, strings, temp, grid, kwh in a1_curve:
        s.telemetry_sample(
            asset_id=a1.id, device_id="GW-CLINIC-01", ts=_sample_time(0, hour),
            ac_power_w=w, energy_kwh=kwh, dc_string_voltages=strings,
            dc_current_a=round(w / (sum(strings) or 1), 2),
            inverter_status="ok", module_temp_c=temp, grid_voltage_v=grid,
            raw={"src": "GW-CLINIC-01", "fmt": "canonical"})

    # a5 — same clock, but DC string 2 has collapsed to 0 V while strings 1 & 3
    # hold: the signature of an open string (blown fuse / disconnected MC4). AC
    # output sits ~a third down; the inverter itself still reports OK.
    a5_curve = [
        (9, 12800.0, [612.0, 0.0, 606.0], 39.0, 241.0, 22.0),
        (12, 17600.0, [604.0, 0.0, 601.0], 46.0, 242.0, 31.0),
        (15, 11200.0, [606.0, 0.0, 603.0], 43.0, 241.0, 19.5),
    ]
    for hour, w, strings, temp, grid, kwh in a5_curve:
        s.telemetry_sample(
            asset_id=a5.id, device_id="GW-MUHORONI-01", ts=_sample_time(0, hour),
            ac_power_w=w, energy_kwh=kwh, dc_string_voltages=strings,
            dc_current_a=round(w / (sum(v for v in strings if v) or 1), 2),
            inverter_status="ok", module_temp_c=temp, grid_voltage_v=grid,
            raw={"src": "GW-MUHORONI-01", "fmt": "canonical"})

    # -- Faults -------------------------------------------------------------
    # Technician-reported soiling on the under-performer.
    s.fault_reported(asset_id=a5.id, job_id=j_repair.id, category="soiling",
                     severity="warning",
                     description="Visible dust/bagasse film across the array.")
    # Digital-Twin-detected under-performance on the same site (system source).
    s.fault_detected(asset_id=a5.id, category="string_outage", severity="critical",
                     health_ratio=0.58,
                     description="Digital Twin Lite: measured yield ~58% of "
                                 "modelled expectation; possible string outage.")
    # Telemetry-diagnosed on the same connected site: the device's per-string
    # channels localize *which* string and *why* — the cause + parts the manual
    # readings alone could not give. Tied to the open repair job so the work
    # order dispatches with facts, not a guess.
    s.fault_diagnosed(
        asset_id=a5.id, job_id=j_repair.id, category="string_outage",
        severity="critical",
        description="Telemetry: DC string 2 open-circuit (0 V) while strings 1 & 3 "
                    "nominal — an isolated string outage, not array-wide soiling.",
        detail={
            "probable_cause": "String 2 open-circuit — blown DC string fuse or a "
                              "disconnected/arcing MC4 connector on that string.",
            "recommended_parts": [
                "DC string fuse (gPV, matched rating)",
                "MC4 connector pair",
                "spare DC combiner gland",
            ],
            "channels": {
                "dc_string_voltages": [604.0, 0.0, 601.0],
                "inverter_status": "ok",
                "module_temp_c": 46.0,
            },
            "confidence": "high",
            "source_samples": len(a5_curve),
        })
    # A resolved inverter fault at Kombewa (shows a closed item in the trail).
    resolved = s.fault_reported(asset_id=a4.id, category="inverter_fault",
                                severity="critical",
                                description="Inverter over-temperature shutdowns.")
    s.resolve(resolved, actor_id=mercy.id)
    # A low-severity wiring note at Nyamasaria, still open.
    s.fault_reported(asset_id=a6.id, category="wiring", severity="info",
                     description="Loose DC combiner gland flagged for tidy-up.")

    db.commit()
    return s.counts


# --- Entry point -----------------------------------------------------------
def _wipe(db) -> None:
    """Delete every row, children first (safe under enforced FKs too)."""
    for model in (models.AuditLog, models.FaultReport, models.Reading,
                  models.TelemetrySample, models.Job, models.Component,
                  models.Asset, models.User, models.Company):
        db.query(model).delete(synchronize_session=False)
    db.commit()


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def run() -> int:
    init_db()  # ensure tables exist (idempotent)
    force = _truthy(os.environ.get("SEED_FORCE"))
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(
            models.User.email == ADMIN_EMAIL).first()
        if existing and not force:
            print(f"[skip] Already seeded (found {ADMIN_EMAIL}). "
                  f"Set SEED_FORCE=1 to wipe and reseed.")
            return 0
        if force:
            print("[force] SEED_FORCE set - wiping all tables...")
            _wipe(db)

        counts = _build(db)

        # Report + a self-check that the seeded audit chain verifies.
        rows = db.query(models.AuditLog).order_by(models.AuditLog.id.asc()).all()
        valid, first_bad = audit.verify_chain(rows)
        summary = ", ".join(f"{v} {k}" for k, v in sorted(counts.items()))
        print(f"[OK] Seeded: {summary}.")
        print(f"[chain] Audit chain: {len(rows)} entries, "
              f"{'intact' if valid else f'BROKEN at {first_bad}'}.")
        print(f"[login] Demo login: {ADMIN_EMAIL} / {DEMO_PASSWORD} (all demo "
              f"users share this password).")
        return 0 if valid else 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(run())
