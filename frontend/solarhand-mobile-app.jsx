import React, { useState, useEffect } from "react";
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
  Shield,
  Zap,
} from "lucide-react";
import { fetchStationMetrics, fetchWorkOrders, postWorkOrder } from "./api";

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

@keyframes sm-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.sm-live-dot { animation: sm-blink 2s ease-in-out infinite; }

@keyframes sm-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.sm-rise { animation: sm-rise 0.28s ease-out both; }

@keyframes sm-pop {
  0% { transform: scale(0.7); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.sm-pop { animation: sm-pop 0.4s cubic-bezier(0.2,0.8,0.3,1.2) both; }

.sm-focusable:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.sm-tap { transition: transform 0.08s ease, background 0.15s ease; }
.sm-tap:active { transform: scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .sm-live-dot, .sm-rise, .sm-pop { animation: none; }
}
`;

const pendingJob = {
  id: "WO-3181",
  site: "Eldoret Water Board",
  fault: "Panel cleaning follow-up",
  distance: "6 km",
  due: "Submitted recently",
};

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 shrink-0">
      <span className="sm-mono text-[13px] font-medium" style={{ color: "var(--off-white)" }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-0.5 h-2.5">
          {[3, 5, 7, 9].map((h, i) => (
            <span key={i} className="w-0.5 rounded-sm" style={{ height: h, background: "var(--off-white-70)" }} />
          ))}
        </div>
        <div className="w-5 h-2.5 rounded-sm border flex items-center px-px" style={{ borderColor: "var(--off-white-50)" }}>
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
      {online ? <Wifi size={11} style={{ color: "var(--green-bright)" }} /> : <WifiOff size={11} style={{ color: "var(--blue-sync)" }} />}
      <span className="sm-mono text-[10px] font-medium" style={{ color: online ? "var(--green-bright)" : "var(--blue-sync)" }}>
        {online ? "API Synced" : `Offline · ${queued} saved`}
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
  const s = map[priority] || map.Medium;
  return (
    <span className="sm-mono text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: s.color, background: s.bg }}>
      {priority.toUpperCase()}
    </span>
  );
}

function JobCard({ job, onOpen }) {
  return (
    <button
      onClick={() => onOpen(job)}
      className="sm-tap sm-focusable sm-rise w-full text-left rounded-lg p-3.5 flex flex-col gap-2.5 cursor-pointer"
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
              <span className="sm-mono text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ color: "var(--blue-sync)", background: "rgba(108,143,163,0.14)" }}>
                <WifiOff size={9} /> API-ready
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold mt-1.5" style={{ color: "var(--off-white)" }}>{job.fault}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={11} style={{ color: "var(--off-white-35)" }} />
            <span className="text-xs" style={{ color: "var(--off-white-50)" }}>{job.site}</span>
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

function QueueScreen({ jobsList, apiOnline, onOpen }) {
  return (
    <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pb-24 pt-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs" style={{ color: "var(--off-white-50)" }}>Technician Queue</p>
          <h1 className="sm-display text-lg font-bold" style={{ color: "var(--off-white)" }}>Good morning, Otieno</h1>
        </div>
        <SyncPill online={apiOnline} queued={jobsList.length} />
      </div>

      <div className="sm-rise flex items-center gap-3 mt-4 mb-5 p-3 rounded-lg" style={{ background: "var(--green-deep)", border: "1px solid rgba(89,161,126,0.25)" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(242,239,230,0.1)" }}>
          <ShieldCheck size={17} style={{ color: "var(--green-bright)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium" style={{ color: "var(--off-white)" }}>Connected to Backend API</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--off-white-70)" }}>
            {apiOnline ? "Fetching telemetry & dispatches from http://localhost:8000" : "Connecting to API on port 8000…"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--off-white-50)" }}>
          Today's Dispatches · {jobsList.length}
        </h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {jobsList.map((job) => (
          <JobCard key={job.id} job={job} onOpen={onOpen} />
        ))}
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide mt-6 mb-2.5" style={{ color: "var(--off-white-50)" }}>
        Awaiting Verification
      </h2>
      <div className="rounded-lg p-3.5 flex items-center gap-3" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(227,167,61,0.14)" }}>
          <UploadCloud size={15} style={{ color: "var(--gold)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium" style={{ color: "var(--off-white)" }}>{pendingJob.fault}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--off-white-50)" }}>{pendingJob.site} · {pendingJob.due}</p>
        </div>
      </div>
    </div>
  );
}

function SyncScreen({ apiOnline }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("Just now");

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date().toLocaleTimeString());
    }, 1200);
  };

  return (
    <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pt-4 pb-24 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="sm-display text-lg font-bold" style={{ color: "var(--off-white)" }}>API Synchronization</h1>
        <SyncPill online={apiOnline} queued={0} />
      </div>

      <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--off-white-50)" }}>Server Target:</span>
          <span className="sm-mono text-xs" style={{ color: "var(--gold)" }}>http://localhost:8000</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--off-white-50)" }}>Last Sync:</span>
          <span className="sm-mono text-xs" style={{ color: "var(--off-white)" }}>{lastSync}</span>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="sm-tap sm-focusable w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 mt-2"
          style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing telemetry..." : "Sync Now"}
        </button>
      </div>
    </div>
  );
}

function UpdatesScreen({ jobsList }) {
  return (
    <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pt-4 pb-24 flex flex-col gap-3">
      <h1 className="sm-display text-lg font-bold" style={{ color: "var(--off-white)" }}>Live Updates & Logs</h1>

      <div className="flex flex-col gap-2.5">
        {jobsList.map((j, i) => (
          <div key={i} className="rounded-lg p-3 flex flex-col gap-1" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "var(--off-white)" }}>{j.site}</span>
              <span className="sm-mono text-[10px]" style={{ color: "var(--gold)" }}>{j.priority}</span>
            </div>
            <p className="text-[11px]" style={{ color: "var(--off-white-50)" }}>{j.cause}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen({ apiOnline }) {
  return (
    <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pt-4 pb-24 flex flex-col gap-4">
      <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: "var(--line)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center sm-display text-base font-bold" style={{ background: "var(--green-deep)", color: "var(--off-white)" }}>
          OA
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--off-white)" }}>Otieno Achieng</h2>
          <p className="text-xs" style={{ color: "var(--off-white-50)" }}>Field Technician · TECH-892</p>
        </div>
      </div>

      <div className="rounded-lg p-3.5 flex flex-col gap-2" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>Assigned Region</h3>
        <p className="text-xs font-medium" style={{ color: "var(--off-white)" }}>Kisumu & Ahero Clusters</p>
        <p className="text-[11px]" style={{ color: "var(--off-white-50)" }}>Safety Level 3 Certified (DC High Voltage & Solar Inverters)</p>
      </div>

      <div className="rounded-lg p-3.5 flex flex-col gap-2" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--off-white-50)" }}>API Status</h3>
        <p className="sm-mono text-xs" style={{ color: apiOnline ? "var(--green-bright)" : "var(--gold)" }}>
          {apiOnline ? "Live Connected to http://localhost:8000" : "Offline / Polling Mode"}
        </p>
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
          <span className="sm-mono text-[10px]" style={{ color: "var(--off-white-35)" }}>{job.id}</span>
          <h1 className="text-sm font-semibold truncate" style={{ color: "var(--off-white)" }}>{job.site}</h1>
        </div>
        <PriorityTag priority={job.priority} />
      </div>

      <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pt-4 pb-28 flex flex-col gap-4">
        <div>
          <h2 className="sm-display text-base font-bold" style={{ color: "var(--off-white)" }}>{job.fault}</h2>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--off-white-70)" }}>{job.cause}</p>
        </div>

        <div className="rounded-lg p-3.5 flex flex-col gap-2" style={{ background: "var(--charcoal-800)", border: "1px solid var(--line)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--off-white-50)" }}>Contact on site</h3>
          <p className="text-sm font-medium" style={{ color: "var(--off-white)" }}>{job.contact}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="sm-mono text-xs" style={{ color: "var(--gold)" }}>{job.contactPhone}</span>
            <button className="sm-tap sm-focusable flex items-center gap-1 text-xs px-2.5 py-1 rounded" style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}>
              <Phone size={12} /> Call
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pt-3" style={{ background: "linear-gradient(to top, var(--charcoal-950) 60%, transparent)" }}>
        <button onClick={onStart} className="sm-tap sm-focusable w-full py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" style={{ background: "var(--gold)", color: "var(--charcoal-950)" }}>
          <Wrench size={15} /> Start job checklist
        </button>
      </div>
    </>
  );
}

function ChecklistScreen({ job, onBack, onComplete }) {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleStep = (id) => {
    setCompletedSteps((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allDone = completedSteps.length === job.steps.length;

  const handleFinish = async () => {
    if (!allDone) return;
    setIsSubmitting(true);
    await postWorkOrder({
      jobId: job.id,
      site: job.site,
      fault: job.fault,
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
    });
    setIsSubmitting(false);
    onComplete();
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
        <button onClick={onBack} className="sm-tap sm-focusable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--charcoal-800)" }}>
          <ArrowLeft size={15} style={{ color: "var(--off-white)" }} />
        </button>
        <h1 className="text-sm font-semibold truncate" style={{ color: "var(--off-white)" }}>Checklist · {job.id}</h1>
      </div>

      <div className="flex-1 overflow-y-auto sm-scrollbar px-4 pt-4 pb-28 flex flex-col gap-3">
        {job.steps.map((st) => {
          const isDone = completedSteps.includes(st.id);
          return (
            <button
              key={st.id}
              onClick={() => toggleStep(st.id)}
              className="sm-tap sm-focusable text-left rounded-lg p-3.5 flex items-start gap-3"
              style={{
                background: isDone ? "rgba(89,161,126,0.08)" : "var(--charcoal-800)",
                border: `1px solid ${isDone ? "rgba(89,161,126,0.3)" : "var(--line)"}`,
              }}
            >
              {isDone ? <CheckCircle2 size={18} style={{ color: "var(--green-bright)" }} className="shrink-0 mt-0.5" /> : <Circle size={18} style={{ color: "var(--off-white-35)" }} className="shrink-0 mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold" style={{ color: isDone ? "var(--green-bright)" : "var(--off-white)" }}>{st.title}</p>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--off-white-50)" }}>{st.detail}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pt-3" style={{ background: "linear-gradient(to top, var(--charcoal-950) 60%, transparent)" }}>
        <button
          disabled={!allDone || isSubmitting}
          onClick={handleFinish}
          className="sm-tap sm-focusable w-full py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            background: allDone ? "var(--gold)" : "var(--charcoal-700)",
            color: allDone ? "var(--charcoal-950)" : "var(--off-white-35)",
          }}
        >
          {isSubmitting ? "Submitting to API…" : allDone ? "Submit for verification" : "Complete all steps to submit"}
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
        <h1 className="sm-display text-lg font-bold" style={{ color: "var(--off-white)" }}>Submitted to API</h1>
        <p className="text-xs mt-2 leading-relaxed max-w-[280px]" style={{ color: "var(--off-white-70)" }}>
          Your repair report for <span style={{ color: "var(--off-white)" }}>{job.site}</span> was posted to http://localhost:8000.
        </p>
      </div>
      <button onClick={onDone} className="sm-tap sm-focusable mt-2 px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "var(--green-deep)", color: "var(--off-white)" }}>
        Back to queue
      </button>
    </div>
  );
}

function BottomNav({ active, onChange }) {
  const items = [
    { key: "jobs", label: "Jobs", icon: ListChecks },
    { key: "sync", label: "Sync", icon: RefreshCw },
    { key: "updates", label: "Updates", icon: Bell },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div className="flex items-stretch shrink-0 z-20" style={{ background: "var(--charcoal-900)", borderTop: "1px solid var(--line)" }}>
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className="sm-tap sm-focusable flex-1 flex flex-col items-center gap-1 py-2.5 cursor-pointer"
          >
            <Icon size={17} style={{ color: isActive ? "var(--gold)" : "var(--off-white-35)" }} strokeWidth={isActive ? 2.3 : 2} />
            <span className="text-[10px] font-medium" style={{ color: isActive ? "var(--gold)" : "var(--off-white-35)" }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SolarHandMobileApp() {
  const [screen, setScreen] = useState("jobs");
  const [activeJob, setActiveJob] = useState(null);
  const [liveStations, setLiveStations] = useState([]);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const data = await fetchStationMetrics();
      if (!isMounted) return;
      if (data && Array.isArray(data) && data.length > 0) {
        setLiveStations(data);
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const jobsList = liveStations.length > 0
    ? liveStations
        .filter((s) => s.status !== "NORMAL")
        .slice(0, 5)
        .map((s, idx) => ({
          id: `WO-${4820 + idx}`,
          site: s.station_name,
          fault: `${s.status}: Telemetry Fault (${s.voltage ? s.voltage.toFixed(1) + "V" : "Anomaly"})`,
          priority: s.status === "FAULT" ? "Critical" : "High",
          distance: `${(2.4 + idx * 3.1).toFixed(1)} km`,
          due: "Due today",
          offlineReady: true,
          cause: `Telemetry reading flag: Voltage ${s.voltage?.toFixed(1)}V, Current ${s.current?.toFixed(1)}A, Temp ${s.temperature?.toFixed(1)}°C, Output ${s.power?.toFixed(0)}W.`,
          tools: ["Multimeter", "Torque driver set", "Replacement DC fuse", "Insulated gloves"],
          safety: "Isolate DC input before opening inverter housing. Confirm zero-energy state with multimeter.",
          contact: "Site Caretaker",
          contactPhone: "+254 712 000 111",
          history: "Live monitoring via API at http://localhost:8000.",
          steps: [
            { id: 1, title: "Confirm arrival on site", detail: "GPS check-in logs your location automatically." },
            { id: 2, title: "Inspect inverter housing and connectors", detail: "Check for loose terminals or heat damage." },
            { id: 3, title: "Validate fault with multimeter reading", detail: "Log string voltage and compare to telemetry." },
            { id: 4, title: "Repair or replace faulty component", detail: "Replace DC fuse if blown; re-seat connectors." },
            { id: 5, title: "Log parts used & capture photos", detail: "Record part name and take photo of the fix." },
          ],
        }))
    : [
        {
          id: "WO-4821",
          site: "Kisumu Central Mini-Grid",
          fault: "Inverter Array B fault",
          priority: "Critical",
          distance: "2.4 km",
          due: "Due 11:30",
          offlineReady: true,
          cause: "String voltage dropped 40% over 20 minutes.",
          tools: ["Multimeter", "Torque driver set", "Replacement DC fuse"],
          safety: "Isolate DC input before opening inverter housing.",
          contact: "Site caretaker — Naomi Achieng",
          contactPhone: "+254 712 445 908",
          history: "Last serviced 4 months ago.",
          steps: [
            { id: 1, title: "Confirm arrival on site", detail: "GPS check-in logs your location automatically." },
            { id: 2, title: "Inspect inverter housing and connectors", detail: "Check for loose terminals." },
            { id: 3, title: "Validate fault with multimeter", detail: "Log string voltage." },
          ],
        },
      ];

  const openJob = (job) => {
    setActiveJob(job);
    setScreen("detail");
  };

  const handleNavChange = (tabKey) => {
    setScreen(tabKey);
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
          {(screen === "jobs" || screen === "queue") && <QueueScreen jobsList={jobsList} apiOnline={apiOnline} onOpen={openJob} />}
          {screen === "sync" && <SyncScreen apiOnline={apiOnline} />}
          {screen === "updates" && <UpdatesScreen jobsList={jobsList} />}
          {screen === "profile" && <ProfileScreen apiOnline={apiOnline} />}
          {screen === "detail" && activeJob && (
            <DetailScreen job={activeJob} onBack={() => setScreen("jobs")} onStart={() => setScreen("checklist")} />
          )}
          {screen === "checklist" && activeJob && (
            <ChecklistScreen job={activeJob} onBack={() => setScreen("detail")} onComplete={() => setScreen("submitted")} />
          )}
          {screen === "submitted" && activeJob && (
            <SubmittedScreen job={activeJob} onDone={() => { setScreen("jobs"); setActiveJob(null); }} />
          )}
        </div>

        <BottomNav active={screen === "sync" ? "sync" : screen === "updates" ? "updates" : screen === "profile" ? "profile" : "jobs"} onChange={handleNavChange} />
      </div>
    </div>
  );
}
