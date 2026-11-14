import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { runCutoff, createScheduler } from "@/services/scheduler";
import { useServices } from "@/services/ServicesContext";
import { requestPersistentStorage } from "@/services/storage";
import { SplashScreen } from "@/ui/SplashScreen";
import { useSettings } from "./SettingsContext";
import { AppShell } from "./AppShell";

const OnboardingPage = lazy(() => import("@/features/onboarding/OnboardingPage"));
const TodayPage = lazy(() => import("@/features/today/TodayPage"));
const DistillationPage = lazy(() => import("@/features/distillation/DistillationPage"));
const ArchivePage = lazy(() => import("@/features/archive/ArchivePage"));
const CardDetailPage = lazy(() => import("@/features/card-detail/CardDetailPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));

const PERSISTENCE_KEY = "goldlist-persist-requested";

function requestPersistenceOnce(): void {
  try {
    if (localStorage.getItem(PERSISTENCE_KEY)) {
      return;
    }
    localStorage.setItem(PERSISTENCE_KEY, "1");
  } catch {
    // Fall through and request anyway when the mirror is unavailable.
  }
  void requestPersistentStorage();
}

function RequireOnboarding() {
  const { settings } = useSettings();
  if (!settings.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

function OnboardingRoute() {
  const { settings } = useSettings();
  if (settings.onboardingCompleted) {
    return <Navigate to="/today" replace />;
  }
  return <OnboardingPage />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<SplashScreen message="Loading…" />}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route element={<RequireOnboarding />}>
          <Route
            element={
              <AppShell>
                <Outlet />
              </AppShell>
            }
          >
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/distillation" element={<DistillationPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/card/:id" element={<CardDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  const { database, mutex } = useServices();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    requestPersistenceOnce();
    mutex
      .run(() => runCutoff(database))
      .then(() => {
        if (active) {
          setReady(true);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason : new Error("Could not process the daily cutoff"));
        }
      });
    return () => {
      active = false;
    };
  }, [database, mutex]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const scheduler = createScheduler({
      database,
      mutex,
      onError: (reason) => console.error("Cutoff failed", reason),
    });
    scheduler.start();
    return () => scheduler.stop();
  }, [ready, database, mutex]);

  if (error) {
    return (
      <div className="splash splash--error" role="alert">
        <p>{error.message}</p>
        <p>Reload the page to try again.</p>
      </div>
    );
  }

  if (!ready) {
    return <SplashScreen />;
  }

  return <AppRoutes />;
}
