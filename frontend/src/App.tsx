/* Application router.
   One PWA, role-aware. Unauthenticated users get the login/onboarding screen.
   Administrators work in the AdminShell (back-office console); technicians work
   in the offline-first AppShell (bottom-tab field app). The role decides which
   shell and route tree mount. */

import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/BrandMark";
import { Spinner } from "@/components/ui/Spinner";
import { LoginPage } from "@/features/auth/LoginPage";
import { JobsPage } from "@/features/jobs/JobsPage";
import { JobDetailPage } from "@/features/jobs/JobDetailPage";
import { AssetsPage } from "@/features/assets/AssetsPage";
import { AssetDetailPage } from "@/features/assets/AssetDetailPage";
import { ReadingCapture } from "@/features/readings/ReadingCapture";
import { SyncPage } from "@/features/sync/SyncPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { AdminShell } from "@/components/AdminShell";
import { AdminDashboard } from "@/features/admin/AdminDashboard";
import { FleetMap } from "@/features/admin/FleetMap";
import { Dispatch } from "@/features/admin/Dispatch";
import { Team } from "@/features/admin/Team";
import { Compliance } from "@/features/admin/Compliance";
import { AuditTrail } from "@/features/admin/AuditTrail";

function Splash() {
  return (
    <div className="sh-splash">
      <BrandMark className="sh-splash__mark" />
      <Spinner />
    </div>
  );
}

export default function App() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  // First paint, before bootstrap has resolved the cached session.
  if (status === "unknown") return <Splash />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.role === "admin") {
    return (
      <Routes>
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/map" element={<FleetMap />} />
          <Route path="/admin/jobs" element={<Dispatch />} />
          <Route path="/admin/team" element={<Team />} />
          <Route path="/admin/compliance" element={<Compliance />} />
          <Route path="/admin/audit" element={<AuditTrail />} />
          <Route index element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:id" element={<AssetDetailPage />} />
        <Route path="/assets/:id/reading" element={<ReadingCapture />} />
        <Route path="/sync" element={<SyncPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route index element={<Navigate to="/jobs" replace />} />
        <Route path="*" element={<Navigate to="/jobs" replace />} />
      </Route>
    </Routes>
  );
}
