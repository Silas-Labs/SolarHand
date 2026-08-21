"""Pure offline-sync conflict resolution (last-write-wins).

Isolated from FastAPI/SQLAlchemy so the decision rules — the part most likely
to harbour subtle bugs — can be unit-tested directly. The sync router calls
:func:`decide_sync_action` for every pushed record.

Rules
-----
* record absent on server            -> ``"create"``
* present, incoming has no timestamp  -> ``"skip"``  (can't prove it's newer;
                                          never clobber server state blindly)
* present, server has no timestamp    -> ``"update"`` (incoming is more
                                          authoritative than an untimed row)
* present, both timestamped           -> newest ``client_updated_at`` wins;
                                          ties favour the server (``"skip"``)
"""

from __future__ import annotations

from datetime import datetime

from app.timeutils import ensure_aware

CREATE = "create"
UPDATE = "update"
SKIP = "skip"


def decide_sync_action(
    *,
    record_exists: bool,
    incoming_ts: datetime | None,
    existing_ts: datetime | None,
) -> str:
    """Return ``"create"``, ``"update"`` or ``"skip"`` for one pushed record."""
    if not record_exists:
        return CREATE
    if incoming_ts is None:
        return SKIP
    if existing_ts is None:
        return UPDATE
    inc = ensure_aware(incoming_ts)
    exi = ensure_aware(existing_ts)
    return UPDATE if inc > exi else SKIP
