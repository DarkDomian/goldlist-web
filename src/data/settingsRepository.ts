import type { Settings } from "@/domain/types";
import { DEFAULT_SETTINGS } from "@/domain/types";
import type { GoldlistDatabase } from "./db";

export async function readSettings(database: GoldlistDatabase): Promise<Settings> {
  const stored = await database.settings.get("app");
  return stored ?? { ...DEFAULT_SETTINGS };
}

export async function ensureSettings(database: GoldlistDatabase): Promise<Settings> {
  const stored = await database.settings.get("app");
  if (stored) {
    return stored;
  }

  await database.settings.put(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}

export async function getSettings(database: GoldlistDatabase): Promise<Settings> {
  return ensureSettings(database);
}

export async function updateSettings(
  database: GoldlistDatabase,
  patch: Partial<Omit<Settings, "id">>,
): Promise<Settings> {
  const current = await getSettings(database);
  const next: Settings = { ...current, ...patch, id: "app" };
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
