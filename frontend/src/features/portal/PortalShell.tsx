/* Portal shell — the layout for a signed-in site owner.
   A calm top-nav web console (not the technician's bottom-tab field app, nor
   the admin sidebar): owners visit from a desktop or phone browser, so this is
   a conventional account portal. Guards its own routes against the portal
   session. */

import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Gauge, FileText, LifeBuoy, LogOut } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { cx } from "@/lib/util";
import { usePortal } from "./portalSession";

const NAV = [
  { to: "/portal/overview", label: "Overview", icon: Gauge },
  { to: "/portal/reports", label: "Reports", icon: FileText },
  { to: "/portal/support", label: "Support", icon: LifeBuoy },
] as const;

export function PortalShell() {
  const navigate = useNavigate();
  const status = usePortal((s) => s.status);
  const customer = usePortal((s) => s.customer);
  const logout = usePortal((s) => s.logout);

  if (status === "unknown") return null;
  if (status !== "authed" || !customer) {
    return <Navigate to="/portal/login" replace />;
  }

  const initials = customer.contactName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  function signOut() {
    logout();
    navigate("/portal", { replace: true });
  }

  return (
    <div className="sh-pt">
      <header className="sh-pt__bar">
        <div className="sh-pt__wrap sh-pt__bar-inner">
          <NavLink to="/portal/overview" className="sh-pt__brand">
            <BrandMark />
            <span>
              Solar<b>Hand</b>
            </span>
            <span className="sh-pt__tag">Owner portal</span>
          </NavLink>

          <nav className="sh-pt__nav" aria-label="Portal">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cx("sh-pt__navlink", isActive && "is-active")}
              >
                <Icon size={17} aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sh-pt__account">
            <span className="sh-pt__avatar" aria-hidden>
              {initials}
            </span>
            <span className="sh-pt__who">
              <b>{customer.contactName}</b>
              <small>{customer.org}</small>
            </span>
            <button type="button" className="sh-pt__signout" onClick={signOut} title="Sign out">
              <LogOut size={17} aria-hidden />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="sh-pt__main">
        <div className="sh-pt__wrap">
          <Outlet />
        </div>
      </main>

      <footer className="sh-pt__foot">
        <div className="sh-pt__wrap sh-pt__foot-inner">
          <span>
            Maintained by <b>{customer.installer}</b> · EPRA-licensed
          </span>
          <span className="sh-pt__foot-note">
            Performance is modelled from verified readings — SolarHand never streams data off your inverters.
          </span>
        </div>
      </footer>
    </div>
  );
}
