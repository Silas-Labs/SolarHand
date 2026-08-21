"""Small time helpers shared across the app.

Everything the backend stores or signs is UTC. Centralising this avoids the
classic bug where some rows are naive-local and others are aware-UTC.
"""

from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Timezone-aware current UTC time."""
    return datetime.now(timezone.utc)


def to_iso(dt: datetime | None) -> str | None:
    """Serialise a datetime to ISO-8601, or ``None``."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def ensure_aware(dt: datetime | None) -> datetime | None:
    """Return an aware-UTC datetime, treating naive input as UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
