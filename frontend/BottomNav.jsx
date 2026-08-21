import React from "react";
import {
  Home,
  AlertBell,
  MessageCircle,
  User,
} from "lucide-react";

function BottomNav({ active }) {
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "alerts", label: "Alerts", icon: AlertBell },
    { key: "support", label: "Support", icon: MessageCircle },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div className="flex items-stretch shrink-0" style={{ background: "var(--charcoal-900)", borderTop: "1px solid var(--line)" }}>
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = it.key === active;
        return (
          <button key={it.key} className="ca-tap ca-focusable flex-1 flex flex-col items-center gap-1 py-2.5">
            <Icon size={17} style={{ color: isActive ? "var(--gold)" : "var(--off-white-35)" }} strokeWidth={isActive ? 2.3 : 2} />
            <span className="text-[10px] font-medium" style={{ color: isActive ? "var(--gold)" : "var(--off-white-35)" }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BottomNav;