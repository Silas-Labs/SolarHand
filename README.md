# SolarHand
SolarHand is a monitoring, predictive-maintenance, and field-service platform built for Kenya's fastest-growing and most underserved solar segment.It ingests telemetry from solar assets, flags faults before they cause downtime, and routes the right technician with GPS-verified dispatch through an offline-first mobile workflow.

---

## Problem Statement

Solar adoption across Kenya (and Africa broadly) is outpacing the operational capacity to keep systems running. Once a solar system is installed, providers, technicians, and site owners have no shared, reliable way to know when something is failing, who should fix it, or whether a fix actually worked.

This gap is worse than it looks because:

- Monitoring is siloed by hardware brand — each inverter/panel vendor has its own app or portal, so operations teams managing mixed-brand fleets have no unified view.
Connectivity is unreliable in the rural and semi-urban areas where a lot of solar deployment happens, so cloud-only tools fail exactly where they're needed most.
- There's no closed loop — an alert firing doesn't guarantee a technician is dispatched, a technician being dispatched doesn't guarantee the right skills/parts, and a "fix" being logged doesn't guarantee the system is actually healthy again.

The result: degraded systems run inefficiently for weeks before anyone notices, repair capacity is wasted on the wrong priorities, and the long-term ROI of solar investment erodes — undermining trust in solar as a reliable energy source.

---

## Solution

A cross-brand, offline-first operations platform that turns solar telemetry into verified repairs — not just alerts.

We're not building another vendor-specific monitoring dashboard. We're building the operations layer that sits above any hardware brand and closes the loop from fault to fix:

Telemetry → Rules Engine → Prioritized Alert → Work Order → Offline Technician Fix → Verified Closure

Three things make this different from existing solar monitoring tools:

- Brand-agnostic ingestion — an adapter layer normalizes telemetry from any inverter/panel brand into one common data model, so operations managers get one fleet view instead of five vendor apps.
- Offline-first field operations — technicians in low-connectivity areas can download work orders in advance, complete fixes (with photos/notes) fully offline, and sync automatically once back in range. Field service doesn't stop because signal does.
- Verified closure, not just logged closure — a work order isn't "done" because a technician says so; it's done when telemetry confirms the system recovered, or an ops manager reviews and approves it. This is what makes the loop trustworthy for owners and providers.

---

### Who it's for
Kenyan solar SMEs — the operations managers coordinating maintenance across a fleet, and the technicians doing the physical repair work in the field.

### Why now
Solar deployment in the region is growing faster than repair capacity and remote-service infrastructure can keep up. The bottleneck isn't installing more solar — it's keeping what's already installed running well.
