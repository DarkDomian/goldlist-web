import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ensureSettings,
  readSettings,
  updateSettings as persistSettings,
} from "@/data/settingsRepository";
import type { Settings, Theme } from "@/domain/types";
import { useServices } from "@/services/ServicesContext";
import { SplashScreen } from "@/ui/SplashScreen";

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Omit<Settings, "id">>) => Promise<Settings>;
  setTheme: (theme: Theme) => Promise<Settings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function applyTheme(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
  try {
    localStorage.setItem("goldlist-theme", theme);
  } catch {
    // The theme still applies for this session without the mirror.
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { database } = useServices();
  const liveSettings = useLiveQuery(() => readSettings(database), [database]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    ensureSettings(database).catch((reason: unknown) => {
      if (active) {
        setError(reason instanceof Error ? reason : new Error("Could not open the notebook"));
      }
    });
    return () => {
      active = false;
    };
  }, [database]);

  useEffect(() => {
    if (liveSettings) {
      applyTheme(liveSettings.theme);
    }
  }, [liveSettings]);

  const updateSettings = useCallback(
    async (patch: Partial<Omit<Settings, "id">>) => {
      const next = await persistSettings(database, patch);
      applyTheme(next.theme);
      return next;
    },
    [database],
  );

  const setTheme = useCallback(
    async (theme: Theme) => updateSettings({ theme }),
    [updateSettings],
  );

  if (error) {
    return (
      <div className="splash splash--error" role="alert">
        <p>{error.message}</p>
        <p>Reload the page to try again. Your browser may be blocking local storage.</p>
      </div>
    );
  }

  if (!liveSettings) {
    return <SplashScreen />;
  }

  return (
    <SettingsContext.Provider value={{ settings: liveSettings, updateSettings, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
}
