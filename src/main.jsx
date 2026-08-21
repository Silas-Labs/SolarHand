import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SolarHandClientApp from "../frontend/solarhand-client-app.jsx";
import SolarHandDashboard from "../frontend/solarhand-dashboard.jsx";
import SolarHandMobileApp from "../frontend/solarhand-mobile-app.jsx";

const APPS = {
  client: { label: "Client App", Component: SolarHandClientApp },
  dashboard: { label: "Dashboard", Component: SolarHandDashboard },
  mobile: { label: "Mobile App", Component: SolarHandMobileApp },
};

function Launcher() {
  const [active, setActive] = useState("dashboard");
  const { Component } = APPS[active];

  return (
    <div>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          gap: 8,
          padding: "8px 12px",
          background: "#14181B",
          borderBottom: "1px solid rgba(242,239,230,0.09)",
        }}
      >
        {Object.entries(APPS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid rgba(242,239,230,0.18)",
              background: active === key ? "#1F4D3A" : "transparent",
              color: "#F2EFE6",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ paddingTop: 44 }}>
        <Component />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Launcher />);
