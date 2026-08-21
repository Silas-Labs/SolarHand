import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, RefreshCw, Sun, User, WifiOff } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { SyncPill } from "./SyncPill";
import { ToastHost } from "./ui/Toast";
import { Loading } from "./ui/Spinner";
import { useSync } from "@/store/sync";
import { cx } from "@/lib/util";

const TABS = [
  { to: "/jobs", label: "Jobs", icon: ClipboardList },
  { to: "/assets", label: "Assets", icon: Sun },
  { to: "/sync", label: "Sync", icon: RefreshCw },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell() {
  const online = useSync((s) => s.online);
  const pending = useSync((s) => s.pending);

  return (
    <div className="sh-app">
      <header className="sh-appbar">
        <div className="sh-brand">
          <BrandMark className="sh-brand__mark" />
          <span className="sh-brand__word">
            Solar<b>Hand</b>
          </span>
        </div>
        <SyncPill />
      </header>

      {!online && (
        <div className="sh-offline">
          <WifiOff aria-hidden />
          <span>
            Working offline — changes are saved on this device
            {pending ? ` (${pending} queued)` : ""}.
          </span>
        </div>
      )}

      <main className="sh-main">
        <div className="sh-container">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <nav className="sh-tabbar" aria-label="Primary">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cx("sh-tab", isActive && "is-active")}>
            <Icon aria-hidden />
            <span>{label}</span>
            {to === "/sync" && pending > 0 ? (
              <span className="sh-tab__badge">{pending > 99 ? "99+" : pending}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <ToastHost />
    </div>
  );
}
