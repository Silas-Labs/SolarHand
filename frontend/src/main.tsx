import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

/* Self-hosted fonts (bundled for offline use — no CDN at the work site).
   Latin subset only: the UI is English/Swahili, so shipping Cyrillic/Greek/
   Vietnamese subsets would only bloat the offline precache. */
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";

import App from "./App";
import { useAuth } from "@/store/auth";
import { useSync } from "@/store/sync";

// Restore the cached session and start the offline sync engine.
void useAuth.getState().bootstrap();
useSync.getState().init();

// Keep the installed app fresh (no-op during `vite dev`).
registerSW({ immediate: true });

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Root element "#root" was not found.');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
