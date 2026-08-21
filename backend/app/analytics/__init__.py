"""SolarHand analytics — transparent, pure-Python solar performance model.

The "Digital Twin Lite": estimate a PV system's *expected* energy from its
location and geometry plus free weather data, compare against the technician's
*actual* meter reading, and flag underperformance — all without any on-site
sensor. Deliberately dependency-free (no pvlib/numpy) so every calculation is
auditable and runs anywhere.
"""

from __future__ import annotations
