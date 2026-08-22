"""Telemetry: the connected-site path.

This package is what a connected system adds on top of the universal manual
path. It is deliberately layered so each piece is small, pure where possible,
and testable without a database:

* :mod:`app.telemetry.adapters` — normalize any device's raw payload into one
  canonical sample shape (normalize-at-the-edge, brand-agnostic by design).
* :mod:`app.telemetry.diagnosis` — a rule-based classifier that reads a sample's
  diagnostic channels and names a *probable cause* and *recommended parts*
  (the "why" a single energy number cannot give). Pure stdlib.
* :mod:`app.telemetry.rollup` — aggregate raw samples into a daily
  ``Reading(source="telemetry")`` and run it through the *same* Digital Twin
  Lite physics/fault pipeline the manual path uses.
* :mod:`app.telemetry.simulator` — a labeled device simulator that posts
  realistic telemetry (and injectable faults) to the real ingestion endpoint,
  standing in for a physical gateway on a roof.

The HTTP surface lives in :mod:`app.routers.telemetry`.
"""

from __future__ import annotations
