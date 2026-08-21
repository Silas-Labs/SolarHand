import React, { useState } from "react";
import StatusBar from "./StatusBar";
import HomeScreen from "./HomeScreen";
import AlertsScreen from "./AlertsScreen";
import AlertDetailScreen from "./AlertDetailScreen";
import RequestScreen from "./RequestScreen";
import ConfirmationScreen from "./ConfirmationScreen";
import BottomNav from "./BottomNav";

const APPS = {
  client: { label: "Client App", Component: SolarHandClientApp },
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

export default function SolarHandClientApp() {
  const [screen, setScreen] = useState("home");
  const [activeAlert, setActiveAlert] = useState(null);
  const [prefillIssue, setPrefillIssue] = useState(null);
  const [requestData, setRequestData] = useState(null);

  const navActive = screen === "home" ? "home" : screen === "alerts" || screen === "alertDetail" ? "alerts" : screen === "request" || screen === "confirmation" ? "support" : "home";
  const showNav = screen === "home" || screen === "alerts";

  const goRequest = (prefill) => {
    setPrefillIssue(prefill || null);
    setScreen("request");
  };

  return (
    <div className="ca-root w-full min-h-screen flex items-center justify-center py-8 px-3" style={{ background: "var(--charcoal-950)" }}>
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
          {screen === "home" && (
            <HomeScreen
              onOpenAlerts={() => setScreen("alerts")}
              onOpenAlert={(a) => { setActiveAlert(a); setScreen("alertDetail"); }}
              onRequestAssistance={() => goRequest(null)}
            />
          )}
          {screen === "alerts" && (
            <AlertsScreen onBack={() => setScreen("home")} onOpenAlert={(a) => { setActiveAlert(a); setScreen("alertDetail"); }} />
          )}
          {screen === "alertDetail" && activeAlert && (
            <AlertDetailScreen alert={activeAlert} onBack={() => setScreen("alerts")} onRequestAssistance={(title) => goRequest(null)} />
          )}
          {screen === "request" && (
            <RequestScreen onBack={() => setScreen("home")} onSubmitted={(data) => { setRequestData(data); setScreen("confirmation"); }} prefill={prefillIssue} />
          )}
          {screen === "confirmation" && requestData && (
            <ConfirmationScreen requestData={requestData} onDone={() => { setScreen("home"); setRequestData(null); }} />
          )}
        </div>
        {showNav && <BottomNav active={navActive} />}
      </div>
    </div>
  );
}

import "./index.css";