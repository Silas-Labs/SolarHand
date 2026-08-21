"""Database engine, session factory, and the declarative Base.

Uses SQLAlchemy 2.0 style. SQLite is the zero-config default; any
``DATABASE_URL`` that SQLAlchemy understands (e.g. Postgres) also works.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
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


def install_sqlite_savepoint_support(target: Engine) -> None:
    """Make SAVEPOINT / nested transactions behave correctly on pysqlite.

    Python's ``sqlite3`` driver emits ``BEGIN`` implicitly and commits before
    DDL, which subverts SQLAlchemy's transaction control and, critically,
    breaks ``Session.begin_nested()`` (SAVEPOINT). The offline-sync endpoint
    wraps each record in its own SAVEPOINT so a single bad record can't abort
    the batch — that guarantee depends on this fix. This is SQLAlchemy's
    documented workaround: disable the driver's implicit BEGIN and emit our own.
    """

    @event.listens_for(target, "connect")
    def _sqlite_do_connect(dbapi_connection, connection_record):  # noqa: ANN001
        dbapi_connection.isolation_level = None  # autocommit → we drive txns

    @event.listens_for(target, "begin")
    def _sqlite_do_begin(conn):  # noqa: ANN001
        conn.exec_driver_sql("BEGIN")


engine = create_engine(settings.database_url, **_engine_kwargs())

if settings.is_sqlite:
    install_sqlite_savepoint_support(engine)

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
