import { useState } from "react";
import { BadgeCheck, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useSync } from "@/store/sync";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

export function ProfilePage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const pending = useSync((s) => s.pending);
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  const initials = user.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">Your account</p>
          <h1>Profile</h1>
        </div>
      </div>

      <div className="sh-stack">
        <Card>
          <div className="sh-profile">
            <div className="sh-avatar" aria-hidden>
              {initials || <UserRound aria-hidden />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="sh-profile__name">{user.full_name}</div>
              <Chip tone={user.role === "admin" ? "info" : "neutral"} dot>
                {user.role === "admin" ? "Administrator" : "Technician"}
              </Chip>
            </div>
          </div>
        </Card>

        <Card flush>
          <ul className="sh-datalist">
            <li className="sh-datalist__row">
              <div className="sh-row" style={{ gap: "var(--sh-sp-3)", minWidth: 0 }}>
                <Mail aria-hidden className="sh-faint" />
                <span className="sh-truncate">{user.email}</span>
              </div>
            </li>
            <li className="sh-datalist__row">
              <div className="sh-row" style={{ gap: "var(--sh-sp-3)", minWidth: 0 }}>
                <BadgeCheck aria-hidden className="sh-faint" />
                <span className="sh-truncate">
                  EPRA licence:{" "}
                  {user.epra_technician_license ? (
                    <span className="sh-mono">{user.epra_technician_license}</span>
                  ) : (
                    <span className="sh-faint">Not on file</span>
                  )}
                </span>
              </div>
            </li>
            <li className="sh-datalist__row">
              <div className="sh-row" style={{ gap: "var(--sh-sp-3)", minWidth: 0 }}>
                <ShieldCheck aria-hidden className="sh-faint" />
                <span>
                  {pending > 0
                    ? `${pending} change${pending > 1 ? "s" : ""} waiting to sync`
                    : "All changes synced"}
                </span>
              </div>
            </li>
          </ul>
        </Card>

        {pending > 0 && (
          <div className="sh-note sh-note--amber">
            <ShieldCheck aria-hidden />
            <span>
              You have unsynced changes on this device. Sign out only once
              they've uploaded, or they'll be lost.
            </span>
          </div>
        )}

        <Button
          variant="danger"
          block
          icon={<LogOut aria-hidden />}
          loading={loggingOut}
          onClick={onLogout}
        >
          Sign out
        </Button>

        <p className="sh-faint" style={{ fontSize: "var(--sh-fs-xs)", textAlign: "center" }}>
          SolarHand · offline-first field &amp; compliance
        </p>
      </div>
    </>
  );
}
