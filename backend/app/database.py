"""Database engine, session factory, and the declarative Base.

Uses SQLAlchemy 2.0 style. SQLite is the zero-config default; any
``DATABASE_URL`` that SQLAlchemy understands (e.g. Postgres) also works.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _engine_kwargs() -> dict:
    """SQLite needs ``check_same_thread=False`` under FastAPI's threadpool."""
    if settings.is_sqlite:
        return {"connect_args": {"check_same_thread": False}}
    # Sensible pool defaults for Postgres/others.
    return {"pool_pre_ping": True}


engine = create_engine(settings.database_url, **_engine_kwargs())

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped session, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Safe to call repeatedly (idempotent)."""
    # Import models so they register on Base.metadata before create_all.
    from app import models  # noqa: F401  (side-effect import)

    Base.metadata.create_all(bind=engine)
