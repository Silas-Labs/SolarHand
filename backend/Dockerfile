# SolarHand API — production image.
#
# Uses the official Python image (no EXTERNALLY-MANAGED marker, so plain pip
# works). All runtime deps ship pure-Python or manylinux wheels (bcrypt,
# SQLAlchemy, pydantic-core, httpx), so no compiler/apt build stage is needed —
# the image stays slim and builds fast.
FROM python:3.11-slim

# - Don't write .pyc files; keep the image clean.
# - Unbuffered stdout/stderr so container logs stream in real time.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies first so this layer is cached until requirements change.
COPY requirements.txt ./
RUN pip install -r requirements.txt

# Application code.
COPY app ./app

# Run as an unprivileged user. /data holds the SQLite file and is a mount point
# for a named volume; a named volume inherits this directory's ownership on
# first creation, so the non-root user can write to it.
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /data \
    && chown -R appuser:appuser /app /data
USER appuser

# Persist the database outside the container layer by default.
ENV SOLARHAND_DATABASE_URL=sqlite:////data/solarhand.db

EXPOSE 8000

# Liveness probe hits the app's own /health endpoint using stdlib only (curl is
# not present in the slim image).
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).status==200 else 1)"

# Tables are created on startup by the app's lifespan hook (init_db), so a fresh
# volume is one command away from running.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
