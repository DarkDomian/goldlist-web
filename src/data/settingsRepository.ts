import type {
  ExampleSelectionMode,
  Settings,
  Theme,
} from "@/domain/types";
import { DEFAULT_SETTINGS } from "@/domain/types";
import type { GoldlistDatabase } from "./db";

const THEMES: readonly Theme[] = ["light", "dark", "system"];
const EXAMPLE_SELECTION_MODES: readonly ExampleSelectionMode[] = ["auto", "manual"];

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEMES.includes(value as Theme);
}

function isExampleSelectionMode(value: unknown): value is ExampleSelectionMode {
  return (
    typeof value === "string" &&
    EXAMPLE_SELECTION_MODES.includes(value as ExampleSelectionMode)
  );
}

export function normalizeSettings(stored?: Partial<Settings> | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    id: "app",
    nativeLanguage: "ru",
    targetLanguage: "en",
    cutoffTime: "00:00",
    freezeDays: 14,
    theme: isTheme(stored?.theme) ? stored.theme : DEFAULT_SETTINGS.theme,
    exampleSelectionMode: isExampleSelectionMode(stored?.exampleSelectionMode)
      ? stored.exampleSelectionMode
      : DEFAULT_SETTINGS.exampleSelectionMode,
    onboardingCompleted:
      typeof stored?.onboardingCompleted === "boolean"
        ? stored.onboardingCompleted
        : DEFAULT_SETTINGS.onboardingCompleted,
  };
}

export async function readSettings(database: GoldlistDatabase): Promise<Settings> {
  const stored = await database.settings.get("app");
  return normalizeSettings(stored);
}

export async function ensureSettings(database: GoldlistDatabase): Promise<Settings> {
  const stored = await database.settings.get("app");
  const normalized = normalizeSettings(stored);
  if (!stored) {
    await database.settings.put(normalized);
  }
  return normalized;
}

export async function getSettings(database: GoldlistDatabase): Promise<Settings> {
  return ensureSettings(database);
}

export async function updateSettings(
  database: GoldlistDatabase,
  patch: Partial<Omit<Settings, "id">>,
): Promise<Settings> {
  const current = await getSettings(database);
  const next: Settings = normalizeSettings({ ...current, ...patch, id: "app" });
  await database.settings.put(next);
  return next;
}

export async function completeOnboarding(
  database: GoldlistDatabase,
  theme: Settings["theme"] = "light",
): Promise<Settings> {
  return updateSettings(database, { onboardingCompleted: true, theme });
}

export async function setTheme(
  database: GoldlistDatabase,
  theme: Settings["theme"],
): Promise<Settings> {
  return updateSettings(database, { theme });
}
