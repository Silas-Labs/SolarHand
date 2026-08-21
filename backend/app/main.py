"""SolarHand API — application entrypoint / factory.

Run locally:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings
from app.database import init_db


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        summary="Field-service, compliance & no-telemetry performance checks "
        "for Kenya's solar installers.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _startup() -> None:
        # Create tables on boot. In production you'd use migrations; for the
        # hackathon this keeps a fresh clone one command away from running.
        init_db()

    @app.get("/", tags=["meta"], summary="Service banner")
    def root() -> dict:
        return {
            "service": settings.app_name,
            "version": __version__,
            "status": "ok",
            "docs": "/docs",
        }

    @app.get("/health", tags=["meta"], summary="Liveness probe")
    def health() -> dict:
        return {"status": "healthy"}

    # Feature routers are registered here as they are built.
    _register_routers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    """Attach feature routers."""
    from app.routers import (
        assets,
        audit_log,
        auth,
        companies,
        faults,
        jobs,
        readings,
        sync,
        users,
    )

    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(companies.router)
    app.include_router(assets.router)
    app.include_router(jobs.router)
    app.include_router(readings.router)
    app.include_router(faults.router)
    app.include_router(sync.router)
    app.include_router(audit_log.router)


app = create_app()
