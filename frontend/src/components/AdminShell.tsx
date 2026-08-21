/* AdminShell — the back-office layout for administrators.
   A persistent left sidebar on desktop; on phones it collapses behind a menu
   button into a slide-in drawer with a scrim. Admin work is online-first, so a
   connection indicator lives in the bar rather than the offline banner the
   field app uses. */

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  ScrollText,
  Send,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { ToastHost } from "./ui/Toast";
import { useAuth } from "@/store/auth";
import { useSync } from "@/store/sync";
import { cx } from "@/lib/util";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/map", label: "Fleet map", icon: Map, end: false },
  { to: "/admin/jobs", label: "Dispatch", icon: Send, end: false },
  { to: "/admin/team", label: "Team", icon: Users, end: false },
  { to: "/admin/compliance", label: "Compliance", icon: FileCheck2, end: false },
  { to: "/admin/audit", label: "Audit trail", icon: ScrollText, end: false },
] as const;

export function AdminShell() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const online = useSync((s) => s.online);
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className={cx("sh-adm", drawer && "is-drawer-open")}>
      <header className="sh-adm__bar">
        <button
          type="button"
          className="sh-adm__menu"
          aria-label="Open menu"
          aria-expanded={drawer}
          onClick={() => setDrawer((v) => !v)}
        >
          <Menu aria-hidden />
        </button>
        <div className="sh-brand">
          <BrandMark className="sh-brand__mark" />
          <span className="sh-brand__word">
            Solar<b>Hand</b>
          </span>
          <span className="sh-adm__console">Console</span>
        </div>
        <span className="sh-spacer" />
        <span
          className={cx("sh-adm__net", online ? "is-online" : "is-offline")}
          title={online ? "Connected" : "Offline — admin actions need a connection"}
        >
          {online ? <Wifi aria-hidden /> : <WifiOff aria-hidden />}
          <span className="sh-adm__net-label">{online ? "Online" : "Offline"}</span>
        </span>
      </header>

      <div className="sh-adm__body">
        <aside className="sh-adm__side" aria-label="Admin sections">
          <div className="sh-adm__side-head">
            <button
              type="button"
              className="sh-adm__close"
              aria-label="Close menu"
              onClick={() => setDrawer(false)}
            >
              <X aria-hidden />
            </button>
          </div>
          <nav className="sh-adm__nav">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx("sh-adm__link", isActive && "is-active")
                }
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sh-adm__side-foot">
            <div className="sh-adm__who">
              <span className="sh-adm__who-name">{user?.full_name ?? "Administrator"}</span>
              <span className="sh-adm__who-role">Administrator</span>
            </div>
            <button
              type="button"
              className="sh-adm__signout"
              onClick={() => void logout()}
            >
              <LogOut aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        <main className="sh-adm__main">
          <div className="sh-adm__content">
            <Outlet />
          </div>
        </main>
      </div>

      {drawer && (
        <div
          className="sh-adm__scrim"
          aria-hidden
          onClick={() => setDrawer(false)}
        />
      )}

      <ToastHost />
    </div>
  );
}
