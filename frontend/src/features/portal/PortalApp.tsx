/* Portal app — the /portal route tree and session bootstrap. Mounted from the
   top-level router (App.tsx) for any /portal path, independent of the
   installer/technician/admin auth state, because the portal has its own
   (demo) session. */

import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { usePortal } from "./portalSession";
import { PortalLanding } from "./PortalLanding";
import { PortalLogin } from "./PortalLogin";
import { PortalShell } from "./PortalShell";
import { PortalOverview } from "./PortalOverview";
import { PortalReports } from "./PortalReports";
import { PortalSupport } from "./PortalSupport";

export function PortalApp() {
  const status = usePortal((s) => s.status);
  const bootstrap = usePortal((s) => s.bootstrap);

  useEffect(() => {
    if (status === "unknown") bootstrap();
  }, [status, bootstrap]);

  return (
    <Routes>
      <Route path="/portal" element={<PortalLanding />} />
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route element={<PortalShell />}>
        <Route path="/portal/overview" element={<PortalOverview />} />
        <Route path="/portal/reports" element={<PortalReports />} />
        <Route path="/portal/support" element={<PortalSupport />} />
      </Route>
      <Route path="/portal/*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
