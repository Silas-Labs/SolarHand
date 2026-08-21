/* Application router.
   One PWA, role-aware. Unauthenticated users get the login/onboarding screen;
   everyone else works inside the AppShell (bottom-tab layout). Admin-only routes
   are layered on in a later phase — the shell and guard are shared. */

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
