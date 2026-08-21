"""Field-service jobs against assets (company-scoped)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import audit
from app.deps import get_current_user, get_db, require_admin
from app.models import Asset, Job, User
from app.schemas import JobCreate, JobRead, JobStatus, JobUpdate
from app.timeutils import utcnow

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _assert_asset_in_company(db: Session, asset_id: str, company_id: str) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None or asset.company_id != company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


def _assert_assignee_in_company(db: Session, user_id: str | None, company_id: str) -> None:
    if user_id is None:
        return
    assignee = db.get(User, user_id)
    if assignee is None or assignee.company_id != company_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Assignee not in your company")


def _get_company_job(db: Session, job_id: str, company_id: str) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    # A job's company is its asset's company.
    asset = db.get(Asset, job.asset_id)
    if asset is None or asset.company_id != company_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return job


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    _assert_asset_in_company(db, payload.asset_id, current_user.company_id)
    _assert_assignee_in_company(db, payload.assigned_to, current_user.company_id)

    data = payload.model_dump(exclude_none=True)
    supplied_id = data.pop("id", None)
    if supplied_id and db.get(Job, supplied_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Job id already exists")

    job = Job(created_by=current_user.id, **data)
    if supplied_id:
        job.id = supplied_id
    db.add(job)
    db.flush()
    audit.record_event(
        db, entity_type="job", entity_id=job.id, action="create",
        actor_id=current_user.id,
        payload={"asset_id": job.asset_id, "type": job.type, "title": job.title},
    )
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobRead])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: JobStatus | None = Query(default=None, alias="status"),
    asset_id: str | None = None,
    mine: bool = False,
) -> list[Job]:
    query = (
        db.query(Job)
        .join(Asset, Job.asset_id == Asset.id)
        .filter(Asset.company_id == current_user.company_id)
    )
    if status_filter:
        query = query.filter(Job.status == status_filter)
    if asset_id:
        query = query.filter(Job.asset_id == asset_id)
    if mine:
        query = query.filter(Job.assigned_to == current_user.id)
    return query.order_by(Job.created_at.desc()).all()


@router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    return _get_company_job(db, job_id, current_user.company_id)


@router.patch("/{job_id}", response_model=JobRead)
def update_job(
    job_id: str,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Job:
    job = _get_company_job(db, job_id, current_user.company_id)
    data = payload.model_dump(exclude_unset=True)
    if "assigned_to" in data:
        _assert_assignee_in_company(db, data["assigned_to"], current_user.company_id)

    for field, value in data.items():
        setattr(job, field, value)

    # Auto-stamp completion time when a job is marked done.
    if data.get("status") == "done" and job.completed_at is None:
        job.completed_at = utcnow()

    db.flush()
    audit.record_event(
        db, entity_type="job", entity_id=job.id, action="update",
        actor_id=current_user.id, payload={"fields": sorted(data.keys())},
    )
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    job = _get_company_job(db, job_id, admin.company_id)
    db.delete(job)
    audit.record_event(
        db, entity_type="job", entity_id=job_id, action="delete",
        actor_id=admin.id, payload={"asset_id": job.asset_id},
    )
    db.commit()
