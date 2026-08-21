"""Audit-trail routes: browse entries and verify chain integrity (admin)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.audit import verify_chain
from app.deps import get_db, require_admin
from app.models import AuditLog, User
from app.schemas import AuditLogRead, AuditVerifyResult

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogRead])
def list_audit(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[AuditLog]:
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    return query.order_by(AuditLog.id.desc()).limit(limit).all()


@router.get("/verify", response_model=AuditVerifyResult)
def verify_audit(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> AuditVerifyResult:
    """Recompute the full hash chain and report tamper status."""
    entries = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    valid, first_bad = verify_chain(entries)
    return AuditVerifyResult(
        valid=valid, entries=len(entries), first_bad_hash=first_bad
    )
