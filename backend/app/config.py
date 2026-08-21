"""Application configuration, loaded from environment / .env.

All settings are prefixed ``SOLARHAND_`` in the environment so they don't
collide with anything else on the host. Defaults are safe for local dev and
let the test-suite and a fresh clone run with zero configuration.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings."""

    model_config = SettingsConfigDict(
        env_prefix="SOLARHAND_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App metadata ---
    app_name: str = "SolarHand API"
    environment: str = "development"

    # --- Database ---
    # SQLite by default; Postgres-ready via a DATABASE_URL override.
    database_url: str = "sqlite:///./solarhand.db"

    # --- Auth / JWT ---
    jwt_secret_key: str = "dev-only-insecure-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720  # 12h — long enough for a field shift

    # --- CORS ---
    # Accepts a comma-separated string in the env; normalised to a list.
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # --- Open-Meteo (analytics phase) ---
    open_meteo_base_url: str = "https://api.open-meteo.com/v1"
    open_meteo_archive_url: str = "https://archive-api.open-meteo.com/v1"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, value: object) -> object:
        """Allow ``SOLARHAND_CORS_ORIGINS=a,b,c`` in the environment."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton (import-safe, test-overridable)."""
    return Settings()


settings = get_settings()
