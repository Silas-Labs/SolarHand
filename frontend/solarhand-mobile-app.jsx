import React, { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Wifi,
  WifiOff,
  Camera,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Wrench,
  Phone,
  ChevronRight,
  Home,
  ListChecks,
  RefreshCw,
  Bell,
  User,
  AlertTriangle,
  Navigation,
  UploadCloud,
  PackagePlus,
} from "lucide-react";

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --charcoal-950: #14181B;
  --charcoal-900: #191E21;
  --charcoal-800: #1F262A;
  --charcoal-700: #2A3236;
  --charcoal-600: #384145;
  --line: rgba(242,239,230,0.09);
  --line-strong: rgba(242,239,230,0.18);
  --green-deep: #1F4D3A;
  --green-bright: #59A17E;
  --gold: #E3A73D;
  --gold-dim: #B98A34;
  --off-white: #F2EFE6;
  --off-white-70: rgba(242,239,230,0.7);
  --off-white-50: rgba(242,239,230,0.5);
  --off-white-35: rgba(242,239,230,0.35);
  --red: #C24B34;
  --red-dim: rgba(194,75,52,0.16);
  --blue-sync: #6C8FA3;
  --font-display: 'Archivo', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}

.sm-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.sm-root { font-family: var(--font-body); }
.sm-display { font-family: var(--font-display); letter-spacing: -0.01em; }
.sm-mono { font-family: var(--font-mono); letter-spacing: 0.01em; }

.sm-scrollbar::-webkit-scrollbar { width: 0px; }

@keyframes sm-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.sm-live-dot { animation: sm-blink 2s ease-in-out infinite; }

@keyframes sm-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.sm-rise { animation: sm-rise 0.28s ease-out both; }

@keyframes sm-pop {
  0% { transform: scale(0.7); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.sm-pop { animation: sm-pop 0.4s cubic-bezier(0.2,0.8,0.3,1.2) both; }

.sm-focusable:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.sm-tap {
  transition: transform 0.08s ease, background 0.15s ease;
}
.sm-tap:active { transform: scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .sm-live-dot, .sm-rise, .sm-pop { animation: none; }
}
`;

const jobs = [
  {
    id: "WO-4821",
    site: "Kisumu Central Mini-Grid",
    fault: "Inverter Array B fault",
    priority: "Critical",
    distance: "2.4 km",
    due: "Due 11:30",
    offlineReady: true,
    cause: "String voltage dropped 40% over 20 minutes. Suspected loose DC connector or failed MPPT channel.",
    tools: ["Multimeter", "Torque driver set", "Replacement DC fuse (10A)", "Insulated gloves"],
    safety: "Isolate DC input before opening inverter housing. Confirm zero-energy state with multimeter before contact.",
    contact: "Site caretaker — Naomi Achieng",
    contactPhone: "+254 712 445 908",
    history: "Last serviced 4 months ago — fan replacement, no prior inverter faults.",
    steps: [
      { id: 1, title: "Confirm arrival on site", detail: "GPS check-in logs your location automatically." },
      { id: 2, title: "Inspect inverter housing and DC connectors", detail: "Check for corrosion, loose terminals, or heat damage." },
      { id: 3, title: "Validate fault with multimeter reading", detail: "Log string voltage and compare to expected range." },
      { id: 4, title: "Repair or replace faulty component", detail: "Replace DC fuse if blown; re-seat any loose connectors." },
      { id: 5, title: "Log parts used", detail: "Record part name, quantity, and serial if applicable." },
      { id: 6, title: "Capture before-and-after photos", detail: "At least one photo of the fault and one of the fix." },
    ],
  },
  {
    id: "WO-4826",
    site: "Nakuru Agri Cooperative",
    fault: "Grid connection point down",
    priority: "Critical",
    distance: "14 km",
    due: "Due 13:00",
    offlineReady: true,
    cause: "Zero output recorded for 45 minutes. Possible breaker trip at the point of common coupling.",
    tools: ["Multimeter", "Insulated gloves", "Breaker reset key", "Torque driver set"],
    safety: "Coordinate with site supervisor before resetting any breaker. Confirm no active load before switching.",
    contact: "Cooperative supervisor — Peter Kamau",
    contactPhone: "+254 720 118 662",
    history: "No prior grid connection faults recorded for this site.",
    steps: [
      { id: 1, title: "Confirm arrival on site", detail: "GPS check-in logs your location automatically." },
      { id: 2, title: "Inspect breaker panel and connection point", detail: "Look for tripped breakers or visible damage." },
      { id: 3, title: "Validate fault with multimeter reading", detail: "Confirm voltage present at each stage of the connection." },
      { id: 4, title: "Reset or repair connection", detail: "Reset breaker if safe; repair wiring if damaged." },
      { id: 5, title: "Log parts used", detail: "Record part name, quantity, and serial if applicable." },
      { id: 6, title: "Capture before-and-after photos", detail: "At least one photo of the fault and one of the fix." },
    ],
  },
  {
    id: "WO-4819",
    site: "Turkana Solar Pump Station 4",
    fault: "Battery bank anomaly",
    priority: "High",
    distance: "38 km",
    due: "Due tomorrow, 09:00",
    offlineReady: true,
    cause: "Charge cycle anomaly detected. Capacity fade suspected in Bank 2, cell 3 or 4.",
    tools: ["Battery hydrometer", "Torque driver set", "Insulated gloves", "Cell balancer"],
    safety: "Wear insulated gloves at all times when handling battery terminals. Ventilate enclosure before opening.",
    contact: "Pump operator — Ekiru Loduk",
    contactPhone: "+254 733 902 271",
    history: "Battery bank replaced 14 months ago. First anomaly since installation.",
    steps: [
      { id: 1, title: "Confirm arrival on site", detail: "GPS check-in logs your location automatically." },
      { id: 2, title: "Inspect battery bank and terminals", detail: "Check for corrosion, swelling, or loose connections." },
      { id: 3, title: "Validate fault with cell-level readings", detail: "Log voltage per cell and flag any outliers." },
      { id: 4, title: "Balance or isolate faulty cell", detail: "Isolate cell 3 or 4 if confirmed faulty." },
      { id: 5, title: "Log parts used", detail: "Record part name, quantity, and serial if applicable." },
      { id: 6, title: "Capture before-and-after photos", detail: "At least one photo of the fault and one of the fix." },
    ],
  },
];

const pendingJob = {
  id: "WO-3181",
  site: "Eldoret Water Board",
  fault: "Panel cleaning follow-up",
  distance: "6 km",
  due: "Submitted yesterday, 15:40",
};

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 shrink-0">
      <span className="sm-mono text-[13px] font-medium" style={{ color: "var(--off-white)" }}>
        9:41
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-0.5 h-2.5">
          {[3, 5, 7, 9].map((h, i) => (
            <span
              key={i}
              className="w-0.5 rounded-sm"
              style={{ height: h, background: "var(--off-white-70)" }}
            />
          ))}
        </div>
        <div
          className="w-5 h-2.5 rounded-sm border flex items-center px-px"
          style={{ borderColor: "var(--off-white-50)" }}
        >
          <span className="block h-full rounded-[1px]" style={{ width: "70%", background: "var(--off-white-70)" }} />
        </div>
      </div>
    </div>
  );
}

function SyncPill({ online, queued }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
      style={{
        background: online ? "rgba(89,161,126,0.14)" : "rgba(108,143,163,0.16)",
        border: `1px solid ${online ? "rgba(89,161,126,0.3)" : "rgba(108,143,163,0.3)"}`,
      }}
    >
      {online ? (
        <Wifi size={11} style={{ color: "var(--green-bright)" }} />
      ) : (
        <WifiOff size={11} style={{ color: "var(--blue-sync)" }} />
      )}
      <span
        className="sm-mono text-[10px] font-medium"
        style={{ color: online ? "var(--green-bright)" : "var(--blue-sync)" }}
      >
        {online ? "Synced" : `Offline · ${queued} saved`}
      </span>
    </div>
  );
}

function PriorityTag({ priority }) {
  const map = {
    Critical: { color: "var(--red)", bg: "var(--red-dim)" },
    High: { color: "var(--gold)", bg: "rgba(227,167,61,0.14)" },
    Medium: { color: "var(--off-white-70)", bg: "rgba(242,239,230,0.08)" },
  };
  const s = map[priority];
  return (
    <span
      className="sm-mono text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ color: s.color, background: s.bg }}
    >
      {priority.toUpperCase()}
    </span>
  );
}

function JobCard({ job, onOpen }) {
  return (
    <button
      onClick={() => onOpen(job)}
      className="sm-tap sm-focusable sm-rise w-full text-left rounded-lg p-3.5 flex flex-col gap-2.5"
      style={{
        background: "var(--charcoal-800)",
        border: "1px solid var(--line)",
        borderLeft: `3px solid ${job.priority === "Critical" ? "var(--red)" : job.priority === "High" ? "var(--gold)" : "var(--off-white-35)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityTag priority={job.priority} />
            {job.offlineReady && (
              <span
                className="sm-mono text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{ color: "var(--blue-sync)", background: "rgba(108,143,163,0.14)" }}
              >
                <WifiOff size={9} /> Offline-ready
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold mt-1.5" style={{ color: "var(--off-white)" }}>
            {job.fault}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={11} style={{ color: "var(--off-white-35)" }} />
            <span className="text-xs" style={{ color: "var(--off-white-50)" }}>
              {job.site}
            </span>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "var(--off-white-35)" }} className="shrink-0 mt-1" />
      </div>
      <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
        <span className="flex items-center gap-1 sm-mono text-[11px]" style={{ color: "var(--off-white-50)" }}>
          <Navigation size={10} /> {job.distance}
        </span>
        <span className="flex items-center gap-1 sm-mono text-[11px]" style={{ color: "var(--off-white-50)" }}>
          <Clock size={10} /> {job.due}
        </span>
      </div>
    </button>
  );
}

function QueueScreen({ onOpen }) {
  return (
    <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pb-24 pt-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs" style={{ color: "var(--off-white-50)" }}>
            Friday, 21 August
          </p>
          <h1 className="sm-display text-lg font-bold" style={{ color: "var(--off-white)" }}>
            Good morning, Otieno
          </h1>
        </div>
        <SyncPill online={false} queued={3} />
      </div>

      <div
        className="sm-rise flex items-center gap-3 mt-4 mb-5 p-3 rounded-lg"
        style={{ background: "var(--green-deep)", border: "1px solid rgba(89,161,126,0.25)" }}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(242,239,230,0.1)" }}>
          <ShieldCheck size={17} style={{ color: "var(--green-bright)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium" style={{ color: "var(--off-white)" }}>
            You can keep working offline
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--off-white-70)" }}>
            3 jobs are downloaded and ready. Everything saves locally and syncs when you're back online.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--off-white-50)" }}>
          Today's Queue · {jobs.length}
        </h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onOpen={onOpen} />
        ))}
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide mt-6 mb-2.5" style={{ color: "var(--off-white-50)" }}>
        Awaiting Verification
      </h2>
      <div
        className="rounded-lg p-3.5 flex items-center gap-3"
        style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(227,167,61,0.14)" }}>
          <UploadCloud size={15} style={{ color: "var(--gold)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium" style={{ color: "var(--off-white)" }}>
            {pendingJob.fault}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--off-white-50)" }}>
            {pendingJob.site} · {pendingJob.due}
          </p>
        </div>
        <span
          className="sm-mono text-[10px] font-medium px-2 py-1 rounded shrink-0"
          style={{ color: "var(--gold)", background: "rgba(227,167,61,0.12)" }}
        >
          Pending
        </span>
      </div>
    </div>
  );
}

function DetailScreen({ job, onBack, onStart }) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <button onClick={onBack} className="sm-tap sm-focusable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--charcoal-800)" }}>
          <ArrowLeft size={15} style={{ color: "var(--off-white)" }} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="sm-mono text-[10px]" style={{ color: "var(--off-white-35)" }}>{job.id}</p>
          <h1 className="text-sm font-semibold truncate" style={{ color: "var(--off-white)" }}>{job.site}</h1>
        </div>
        <PriorityTag priority={job.priority} />
      </div>

      <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pt-4 pb-28 flex flex-col gap-4">
        <div>
          <h2 className="sm-display text-base font-bold" style={{ color: "var(--off-white)" }}>{job.fault}</h2>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--off-white-70)" }}>{job.cause}</p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 rounded-lg p-3" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
            <span className="flex items-center gap-1 sm-mono text-[10px]" style={{ color: "var(--off-white-35)" }}>
              <Navigation size={10} /> DISTANCE
            </span>
            <p className="text-sm font-medium mt-1" style={{ color: "var(--off-white)" }}>{job.distance}</p>
          </div>
          <div className="flex-1 rounded-lg p-3" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
            <span className="flex items-center gap-1 sm-mono text-[10px]" style={{ color: "var(--off-white-35)" }}>
              <Clock size={10} /> DUE
            </span>
            <p className="text-sm font-medium mt-1" style={{ color: "var(--off-white)" }}>{job.due}</p>
          </div>
        </div>

        <div className="rounded-lg p-3.5" style={{ background: "var(--red-dim)", border: "1px solid rgba(194,75,52,0.3)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={13} style={{ color: "var(--red)" }} />
            <h3 className="text-xs font-semibold" style={{ color: "var(--red)" }}>Safety note</h3>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--off-white-70)" }}>{job.safety}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--off-white-50)" }}>
            Tools &amp; parts needed
          </h3>
          <div className="flex flex-col gap-1.5">
            {job.tools.map((t) => (
              <div key={t} className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
                <Wrench size={12} style={{ color: "var(--off-white-35)" }} />
                <span className="text-xs" style={{ color: "var(--off-white-70)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--off-white-50)" }}>
            Site contact
          </h3>
          <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--green-deep)" }}>
              <User size={15} style={{ color: "var(--off-white)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium" style={{ color: "var(--off-white)" }}>{job.contact}</p>
              <p className="sm-mono text-[11px]" style={{ color: "var(--off-white-50)" }}>{job.contactPhone}</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--green-deep)" }}>
              <Phone size={13} style={{ color: "var(--green-bright)" }} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--off-white-50)" }}>
            Service history
          </h3>
          <p className="text-xs leading-relaxed rounded-lg p-3" style={{ color: "var(--off-white-70)", background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
            {job.history}
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pt-3" style={{ background: "linear-gradient(to top, var(--charcoal-950) 60%, transparent)" }}>
        <button
          onClick={onStart}
          className="sm-tap sm-focusable w-full py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}
        >
          Start Job
          <ChevronRight size={15} />
        </button>
      </div>
    </>
  );
}

function ChecklistScreen({ job, onBack, onComplete }) {
  const [checked, setChecked] = useState({});
  const [photos, setPhotos] = useState(0);

  const doneCount = Object.values(checked).filter(Boolean).length;
  const total = job.steps.length;
  const pct = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <button onClick={onBack} className="sm-tap sm-focusable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--charcoal-800)" }}>
          <ArrowLeft size={15} style={{ color: "var(--off-white)" }} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--off-white)" }}>Repair checklist</p>
          <p className="text-[11px]" style={{ color: "var(--off-white-50)" }}>{job.site}</p>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="sm-mono text-[11px]" style={{ color: "var(--off-white-50)" }}>{doneCount} of {total} steps</span>
          <span className="sm-mono text-[11px] font-medium" style={{ color: "var(--green-bright)" }}>{pct}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--charcoal-800)" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "var(--green-bright)" }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pt-3 pb-28 flex flex-col gap-2.5">
        {job.steps.map((step) => {
          const isPhotoStep = step.id === 6;
          const done = isPhotoStep ? photos >= 2 && checked[step.id] : !!checked[step.id];
          return (
            <div
              key={step.id}
              className="rounded-lg p-3 flex flex-col gap-2"
              style={{
                background: done ? "rgba(89,161,126,0.08)" : "var(--charcoal-800)",
                border: `1px solid ${done ? "rgba(89,161,126,0.3)" : "var(--line)"}`,
              }}
            >
              <button
                onClick={() => !isPhotoStep && toggle(step.id)}
                className="sm-tap sm-focusable flex items-start gap-3 text-left w-full"
              >
                <span className="mt-0.5 shrink-0">
                  {checked[step.id] || (isPhotoStep && photos >= 2) ? (
                    <CheckCircle2 size={18} style={{ color: "var(--green-bright)" }} className="sm-pop" />
                  ) : (
                    <Circle size={18} style={{ color: "var(--off-white-35)" }} />
                  )}
                </span>
                <span className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--off-white)" }}>
                    {step.id}. {step.title}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--off-white-50)" }}>
                    {step.detail}
                  </p>
                </span>
              </button>

              {isPhotoStep && (
                <div className="flex items-center gap-2 pl-8">
                  <button
                    onClick={() => {
                      const next = Math.min(photos + 1, 2);
                      setPhotos(next);
                      if (next >= 2) setChecked((c) => ({ ...c, [step.id]: true }));
                    }}
                    className="sm-tap sm-focusable flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
                    style={{ background: "var(--charcoal-700)", color: "var(--off-white-70)", border: "1px solid var(--line-strong)" }}
                  >
                    <Camera size={12} /> Add photo
                  </button>
                  <span className="sm-mono text-[11px]" style={{ color: "var(--off-white-35)" }}>{photos} of 2 added</span>
                </div>
              )}
            </div>
          );
        })}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide mt-2 mb-2" style={{ color: "var(--off-white-50)" }}>
            Parts used
          </h3>
          <button
            className="sm-tap sm-focusable w-full flex items-center gap-2 rounded-lg p-3 text-xs"
            style={{ background: "var(--charcoal-800)", border: "1px dashed var(--line-strong)", color: "var(--off-white-50)" }}
          >
            <PackagePlus size={14} />
            Add a part or component used
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pt-3" style={{ background: "linear-gradient(to top, var(--charcoal-950) 60%, transparent)" }}>
        <button
          disabled={!allDone}
          onClick={onComplete}
          className="sm-tap sm-focusable w-full py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            background: allDone ? "var(--gold)" : "var(--charcoal-700)",
            color: allDone ? "var(--charcoal-950)" : "var(--off-white-35)",
          }}
        >
          {allDone ? "Submit for verification" : `Complete all steps to submit`}
        </button>
      </div>
    </>
  );
}

function SubmittedScreen({ job, onDone }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="sm-pop w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(227,167,61,0.14)" }}>
        <UploadCloud size={28} style={{ color: "var(--gold)" }} />
      </div>
      <div>
        <h1 className="sm-display text-lg font-bold" style={{ color: "var(--off-white)" }}>
          Submitted, awaiting verification
        </h1>
        <p className="text-xs mt-2 leading-relaxed max-w-[280px]" style={{ color: "var(--off-white-70)" }}>
          Your repair report for <span style={{ color: "var(--off-white)" }}>{job.site}</span> is saved. Final closure
          happens once telemetry confirms the fix or a manager reviews your evidence.
        </p>
      </div>
      <div
        className="w-full max-w-[280px] rounded-lg p-3 flex items-center gap-2.5 text-left"
        style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}
      >
        <WifiOff size={14} style={{ color: "var(--blue-sync)" }} className="shrink-0" />
        <p className="text-[11px]" style={{ color: "var(--off-white-50)" }}>
          No signal here — this report will upload automatically once you're back in range.
        </p>
      </div>
      <button
        onClick={onDone}
        className="sm-tap sm-focusable mt-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
        style={{ background: "var(--green-deep)", color: "var(--off-white)" }}
      >
        Back to queue
      </button>
    </div>
  );
}

function BottomNav({ active }) {
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "jobs", label: "Jobs", icon: ListChecks },
    { key: "sync", label: "Sync", icon: RefreshCw },
    { key: "updates", label: "Updates", icon: Bell },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div
      className="flex items-stretch shrink-0"
      style={{ background: "var(--charcoal-900)", borderTop: "1px solid var(--line)" }}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            className="sm-tap sm-focusable flex-1 flex flex-col items-center gap-1 py-2.5"
          >
            <Icon size={17} style={{ color: isActive ? "var(--gold)" : "var(--off-white-35)" }} strokeWidth={isActive ? 2.3 : 2} />
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? "var(--gold)" : "var(--off-white-35)" }}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function SolarHandMobileApp() {
  const [screen, setScreen] = useState("queue");
  const [activeJob, setActiveJob] = useState(null);

  const openJob = (job) => {
    setActiveJob(job);
    setScreen("detail");
  };

  return (
    <div className="sm-root w-full min-h-screen flex items-center justify-center py-8 px-3" style={{ background: "var(--charcoal-950)" }}>
      <style>{fontImport}</style>

      <div
        className="relative w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 390,
          height: 780,
          background: "var(--charcoal-950)",
          borderRadius: 40,
          border: "10px solid var(--charcoal-900)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--line)",
        }}
      >
        <StatusBar />

        <div className="flex-1 relative flex flex-col min-h-0">
          {screen === "queue" && <QueueScreen onOpen={openJob} />}
          {screen === "detail" && activeJob && (
            <DetailScreen job={activeJob} onBack={() => setScreen("queue")} onStart={() => setScreen("checklist")} />
          )}
          {screen === "checklist" && activeJob && (
            <ChecklistScreen
              job={activeJob}
              onBack={() => setScreen("detail")}
              onComplete={() => setScreen("submitted")}
            />
          )}
          {screen === "submitted" && activeJob && (
            <SubmittedScreen job={activeJob} onDone={() => { setScreen("queue"); setActiveJob(null); }} />
          )}
        </div>

        {screen === "queue" && <BottomNav active="jobs" />}
      </div>
    </div>
  );
}
