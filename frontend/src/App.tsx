/* Application router.
   One PWA, role-aware. Unauthenticated users get the login/onboarding screen.
   Administrators work in the AdminShell (back-office console); technicians work
   in the offline-first AppShell (bottom-tab field app). The role decides which
   shell and route tree mount. */

import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { AppShell } from "@/components/AppShell";
import { AdminShell } from "@/components/AdminShell";
import { BrandMark } from "@/components/BrandMark";
import { Spinner } from "@/components/ui/Spinner";
import { LoginPage } from "@/features/auth/LoginPage";

/* Route components are code-split so each role only downloads what it uses.
   The service worker precaches every emitted JS chunk, so offline navigation
   still resolves these dynamic imports from cache.
   Named exports are adapted to the default export React.lazy expects. */

// Technician field app.
const JobsPage = lazy(() =>
  import("@/features/jobs/JobsPage").then((m) => ({ default: m.JobsPage })));
const JobDetailPage = lazy(() =>
  import("@/features/jobs/JobDetailPage").then((m) => ({ default: m.JobDetailPage })));
const AssetsPage = lazy(() =>
  import("@/features/assets/AssetsPage").then((m) => ({ default: m.AssetsPage })));
const AssetDetailPage = lazy(() =>
  import("@/features/assets/AssetDetailPage").then((m) => ({ default: m.AssetDetailPage })));
const ReadingCapture = lazy(() =>
  import("@/features/readings/ReadingCapture").then((m) => ({ default: m.ReadingCapture })));
const SyncPage = lazy(() =>
  import("@/features/sync/SyncPage").then((m) => ({ default: m.SyncPage })));
const ProfilePage = lazy(() =>
  import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));

// Admin console — heavier (Leaflet fleet map, data tables); loaded only for admins.
const AdminDashboard = lazy(() =>
  import("@/features/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const FleetMap = lazy(() =>
  import("@/features/admin/FleetMap").then((m) => ({ default: m.FleetMap })));
const Dispatch = lazy(() =>
  import("@/features/admin/Dispatch").then((m) => ({ default: m.Dispatch })));
const Team = lazy(() =>
  import("@/features/admin/Team").then((m) => ({ default: m.Team })));
const Compliance = lazy(() =>
  import("@/features/admin/Compliance").then((m) => ({ default: m.Compliance })));
const AuditTrail = lazy(() =>
  import("@/features/admin/AuditTrail").then((m) => ({ default: m.AuditTrail })));

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
