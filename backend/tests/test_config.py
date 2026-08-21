"""Settings parsing regression tests.

These guard the CORS-origins env handling. pydantic-settings tries to
JSON-decode complex-typed fields (``list[str]``) straight from the environment
source, *before* field validators run — so without ``NoDecode`` a plain value
like ``SOLARHAND_CORS_ORIGINS=http://localhost:8080`` (exactly what
docker-compose passes) raises ``SettingsError`` at import and the API never
boots. See app/config.py.
"""

from __future__ import annotations

from app.config import Settings


def _settings(monkeypatch, value: str | None) -> Settings:
    """Build a fresh Settings, ignoring any on-disk .env, with the CORS env set."""
    if value is None:
        monkeypatch.delenv("SOLARHAND_CORS_ORIGINS", raising=False)
    else:
        monkeypatch.setenv("SOLARHAND_CORS_ORIGINS", value)
    # _env_file=None keeps the test hermetic regardless of a local .env.
    return Settings(_env_file=None)


def test_cors_single_bare_url_does_not_crash(monkeypatch):
    # The exact docker-compose case that previously crashed the app on boot.
    settings = _settings(monkeypatch, "http://localhost:8080")
    assert settings.cors_origins == ["http://localhost:8080"]


def test_cors_comma_separated_env_parses_to_list(monkeypatch):
    settings = _settings(monkeypatch, "http://a.example,http://b.example")
    assert settings.cors_origins == ["http://a.example", "http://b.example"]


def test_cors_whitespace_and_empty_items_are_cleaned(monkeypatch):
    settings = _settings(monkeypatch, " http://a.example , , http://b.example ")
    assert settings.cors_origins == ["http://a.example", "http://b.example"]


def test_cors_falls_back_to_defaults_when_unset(monkeypatch):
    settings = _settings(monkeypatch, None)
    assert settings.cors_origins == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
