import sys
from pathlib import Path

# Make the "app" package (backend/app) importable, since backend/app/main.py
# uses imports like `from app.config import settings` that assume `backend/`
# itself is on sys.path (mirroring how it's run locally: uvicorn app.main:app
# from inside backend/).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402