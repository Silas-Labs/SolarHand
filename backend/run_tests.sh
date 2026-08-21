#!/usr/bin/env bash
#
# SolarHand backend test runner.
#
# Two tiers of tests:
#   1. Pure-logic unit tests (JWT, password hashing, audit hash-chain, sync
#      conflict resolution) — depend only on the Python stdlib + system bcrypt,
#      so they run ANYWHERE, including the offline build sandbox.
#   2. Full API/integration tests — require the installed stack (FastAPI,
#      SQLAlchemy, Pydantic) and run under pytest in the QA environment.
#
# Usage:
#   ./run_tests.sh            # auto: pytest if available, else stdlib only
#   ./run_tests.sh --pure     # only the stdlib-safe unit tests
#   ./run_tests.sh --cov      # pytest with coverage (needs pytest-cov)
#
set -euo pipefail
cd "$(dirname "$0")"

PURE_TESTS=(tests/test_security.py tests/test_audit.py tests/test_sync_logic.py tests/test_analytics.py)

run_pure() {
  echo "==> Pure-logic unit tests (stdlib unittest)"
  for t in "${PURE_TESTS[@]}"; do
    echo "--- $t"
    python3 "$t"
  done
}

run_pytest() {
  echo "==> Full test suite (pytest)"
  if [[ "${1:-}" == "--cov" ]]; then
    python3 -m pytest --cov=app --cov-report=term-missing
  else
    python3 -m pytest
  fi
}

case "${1:-}" in
  --pure)
    run_pure
    ;;
  --cov)
    run_pytest --cov
    ;;
  *)
    if python3 -c "import pytest, fastapi, sqlalchemy, pydantic" 2>/dev/null; then
      run_pytest
    else
      echo "NOTE: pytest/FastAPI stack not importable — running stdlib tests only."
      echo "      Install deps with:  pip install -r requirements-dev.txt"
      run_pure
    fi
    ;;
esac

echo "==> Done."
