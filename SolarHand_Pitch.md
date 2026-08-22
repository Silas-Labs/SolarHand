# SolarHand — 3-Minute Pitch Guide

**Format:** 3 minutes, 2 presenters. Presenter **A** = story & business. Presenter **B** = product & live demo.
**Core segments (as requested):** Pain 30s · Without SolarHand 30s · With SolarHand + demo 60s · Why us vs competition 20s. A short hook and close bookend these.

---

## Run of show (say-this script)

### 0:00–0:20 — Hook · Presenter A
> "Kenya is the largest off-grid solar market in East Africa — millions of systems installed. But here's the question nobody's answering: once a system is on a roof, how does anyone know it's still working — and when it isn't, *why*? We're SolarHand, and we keep installed solar running."

### 0:20–0:50 — The pain (30s) · Presenter A
> "Solar companies here manage fleets spread across rural counties, and four things break down. Systems quietly underperform for weeks before anyone notices. When a fault *is* spotted, all you get is 'it's down' — not why — so a technician drives hours out and leaves again for the right part. The places solar serves have the weakest internet, so cloud dashboards fail where the technician is standing. And EPRA now licenses solar contractors and expects a defensible maintenance record — which today lives in WhatsApp and on paper."

### 0:50–1:20 — Life without SolarHand (30s) · Presenter A
> "So what happens now? A fault is spotted late, if at all. A technician drives out with no history and guesses the cause, fixes something, texts 'done,' and no one confirms the system actually recovered. Half the time the real part is back at the depot, so that's a second trip. There's no proof for the regulator, no data for the financier, and the customer's trust in solar erodes. Maintenance is reactive, expensive, and blind."

### 1:20–2:20 — Life with SolarHand + live demo (60s) · Presenter B
> "SolarHand closes that loop — and moves it earlier. Watch." **[DEMO — one continuous flow]**
> - **[Admin dashboard → connected site]** "One console for the whole fleet. Here's a connected system. We didn't just get an energy number — the gateway reports its internal channels, so SolarHand names the cause: one string has dropped out. *(Note: the feed here is a labeled simulator over our real ingestion pipeline.)*"
> - **[Work order]** "The work order is already tagged with the cause and the parts to bring — the technician moves with facts, not a guess."
> - **[Dispatch]** "One click assigns it."
> - **[Technician app — toggle network OFF]** "Now I'm the technician in the field with no signal. I still open my job, see the diagnosed cause and parts, run the checklist, capture a reading — instant verdict on-site."
> - **[Toggle network ON → Sync]** "Back in range, it syncs automatically."
> - **[Dashboard → early warning]** "And on another site, no fault yet — but the trend is sliding. SolarHand projects when it'll cross the line and flags it early, so we act before it's lost generation."
> - **[Audit → Verify]** "Every step — including the device-reported ones — is in a tamper-evident log. One click proves it hasn't been altered. That's the EPRA story."

### 2:20–2:40 — Why us vs the competition (20s) · Presenter A
> "Manufacturer apps see only their own brand and only work online. Generic field-service tools know nothing about solar or EPRA. SolarHand covers a mixed fleet — connected *and* manual — works fully offline, tells the technician the *why* and the parts before dispatch, forecasts failures before they happen, and turns a fault into a *verified* fix with an audit trail regulators accept."

### 2:40–3:00 — Close & ask · Both
> A: "Kenya doesn't need more panels on roofs — it needs the ones already there to keep working."
> B: "SolarHand is the operations layer that makes that happen. We're looking for [pilot partners / judges' vote / funding] to put it in the hands of the first ten installers."

---

## Section 1 — Pains addressed (with sourced facts)

- **A massive installed base with no upkeep layer.** Kenya is the largest off-grid solar market in East Africa — roughly **74% of regional off-grid solar kit sales** (H2 2023), part of **2.5M+ units** sold in East Africa in that half-year, and it has drawn more private off-grid-solar investment than any African country. Every one of those systems eventually needs maintenance. *(ESI-Africa; GOGLA)*
- **Electricity access still depends on solar staying alive.** About **15.9M Kenyans still lack electricity**, and rural electrification (**61.7%**) trails urban (**90.8%**). When a rural solar system fails, there's often no grid to fall back on. *(GOGLA / World Bank)*
- **Systems fail silently — and dispatch is blind to the cause.** Equipment failure is the "unseen cost" of off-grid solar, with **batteries the most common failure point**, feeding a growing e-waste problem — and underperformance usually goes undetected until it's severe, then diagnosed only on arrival. *(ESI-Africa)*
- **Connectivity fails where technicians work.** Reliable internet reaches only about **a quarter of Kenyan households (~23.8%)** and rural areas lag furthest, even though SIM penetration is high — so cloud-only tools break in exactly the places solar serves. *(Airtel Kenya / Communications Authority / KICTANet)*
- **Connected devices are already the norm in rural solar.** The market runs largely on **PAYG** solar, where devices carry embedded cellular and report state to providers to manage payments — proof that gateway-connected assets over GSM are an established, dominant model in the settings SolarHand targets. *(GOGLA)*
- **Regulation now demands proof.** EPRA licenses solar PV contractors (**Class C1** for design and installation) and extends licensing to technicians and vendors — so contractors must keep a defensible, auditable maintenance record. *(Kenya Investment Authority eRegulations; EPRA licensing notices)*

## Section 2 — What SolarHand is (and is not)

**SolarHand IS:**
- An **offline-first field-service platform** for solar operations teams and their technicians.
- **Dual-source**: it reads systems from **manual meter readings** (universal, any brand, works offline) *and* from **telemetry** streamed by connected site gateways.
- A **physics-based performance check** ("Digital Twin Lite") that flags underperformance by comparing expected vs. actual output on *any* source — no extra hardware required.
- **Diagnostic**: on connected sites it names the **probable cause** and **recommended parts** from the device's channels, so technicians move with facts.
- **Predictive, honestly**: a statistical trend forecast projects a declining site past its threshold for an **early warning** — explainable arithmetic, not a black box.
- An **EPRA-ready system of record** with a tamper-evident, hash-chained audit trail.

**SolarHand is NOT:**
- **Not** claiming a live fleet in this build — the telemetry **feed is a labeled simulator** over a real ingestion → physics → fault pipeline; swapping in a real gateway changes nothing downstream.
- **Not** "reads every brand out of the box" — it is brand-agnostic by **normalizing at the edge**; this build ships one canonical-gateway adapter plus a documented stub for real vendor protocols.
- **Not** dependent on connectivity for coverage — unconnected and offline sites are fully served by manual readings and the same physics.
- **Not** an AI/ML black box — diagnosis is rule-based and forecasting is statistical; both are inspectable. (Trained-model forecasting is optional future work.)
- **Not** a generic ticketing tool — it understands solar performance and Kenyan compliance.

## Section 3 — How it addresses each pain

- **Silent underperformance →** the Digital Twin Lite scores every system's expected-vs-actual output and surfaces the worst offenders first, on connected and manual sites alike.
- **Blind dispatch →** diagnostic channels name the cause and the parts *before* the technician leaves, turning a guess-and-return trip into a first-time fix.
- **No connectivity →** the technician app runs entirely offline (service worker + on-device database) and syncs when signal returns; the connected-site gateway is a separate path that never blocks field work.
- **Broken fault-to-fix loop →** dispatch, checklists, photos and a *verified closure* step mean a job isn't done until the system is confirmed healthy.
- **Failures caught too late →** the trend forecaster flags a sliding site before it crosses into failure, converting reactive repairs into planned maintenance.
- **Compliance burden →** every action is hash-chained into an audit trail that can be verified in one click and exported for EPRA.

## Section 4 — Who it's for

- **Primary buyer:** Kenyan solar SMEs / EPRA-licensed installers and O&M contractors managing fleets of installed systems.
- **Primary users:** the operations manager (admin console) and field technicians (offline mobile app).
- **Adjacent beneficiaries:** PAYGo/asset financiers and development partners who need portfolio health and proof their financed assets are being maintained.

## Section 5 — How it makes money

- **SaaS subscription** to installers/contractors, priced **per active site under management** and/or **per technician seat**, billed monthly (M-Pesa-friendly).
- **Tiered plans** by fleet size — a low starter tier for small installers, scaling to larger fleets.
- **Connected-site tier** — a premium per-site rate for gateway telemetry, diagnosis and forecasting on top of the manual baseline.
- **Compliance add-on** — EPRA reporting and exportable audit packs as a paid module.
- **Onboarding fee** — data import and technician training at rollout.
- **Future B2B2B** — anonymized fleet-health analytics for financiers and manufacturers who need to protect deployed assets.

---

## Honesty notes for Q&A (so the team never overclaims)

- If asked "is this live data?" — say plainly: "The pipeline is real and tested; the feed in the demo is a simulated gateway. In production a bundled gateway or a PAYG-style module posts to the same endpoint."
- If asked "does it work with any inverter?" — "The physics check does, on any source. Telemetry is brand-agnostic by design because we normalize each device to one format at ingestion; we ship one adapter today and a documented stub for the next protocol."
- If asked "is the prediction AI?" — "It's explainable statistics — a trend line projected to a threshold — plus rule-based diagnosis. No black box. Trained ML is a future option, not a claim we're making."

---

## Sources

- [Kenya continues to dominate East Africa off-grid solar market — ESI-Africa](https://www.esi-africa.com/renewable-energy/solar/kenya-continues-to-dominate-east-africa-off-grid-solar-market/)
- [Kenya Country Brief (off-grid solar market, electrification stats) — GOGLA / World Bank](https://gogla.org/wp-content/uploads/2024/11/Kenya-Country-Brief.pdf)
- [Equipment failure: the unseen cost of off-grid solar — ESI-Africa](https://www.esi-africa.com/industry-sectors/customer-services/the-unseen-cost-of-off-grid-solar-equipment-failure-report/)
- [How Airtel is reshaping Kenya classrooms through internet connectivity (household internet stat) — Airtel Kenya](https://www.airtelkenya.com/ke/about/how-airtel-reshaping-kenya-classrooms-through-internet-connectivity)
- [Digital divide in Kenya: ICT access and usage — KICTANet](https://www.kictanet.or.ke/digital-divide-in-kenya-ict-access-and-usage-data-reveals-disparities/)
- [Solar photovoltaic licence (Class C1) — Kenya Investment Authority eRegulations](https://eprocedures.investkenya.go.ke/procedure/243?l=en)
- [EPRA issues new licensing rules for solar technicians, contractors and manufacturers — Kenyans.co.ke](https://www.kenyans.co.ke/news/124509-epra-issues-new-licensing-notice-solar-contractors-manufacturers-and-vendors)
