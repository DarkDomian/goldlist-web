import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GoldlistDatabase } from "@/data/db";
import {
  completeOnboarding,
  getSettings,
  setTheme,
  updateSettings,
} from "@/data/settingsRepository";
import { makeTestDatabase } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeTestDatabase();
});

afterEach(async () => {
  await database.delete();
});

describe("settingsRepository", () => {
  it("creates and returns defaults on first read", async () => {
    const settings = await getSettings(database);
    expect(settings).toMatchObject({
      id: "app",
      nativeLanguage: "ru",
      targetLanguage: "en",
      cutoffTime: "00:00",
      freezeDays: 14,
      theme: "light",
      onboardingCompleted: false,
    });
    expect(await database.settings.get("app")).toEqual(settings);
  });

  it("updates settings and persists them", async () => {
    await updateSettings(database, { theme: "dark" });
    expect((await getSettings(database)).theme).toBe("dark");
  });

  it("completes onboarding", async () => {
    await completeOnboarding(database, "dark");
    const settings = await getSettings(database);
    expect(settings.onboardingCompleted).toBe(true);
    expect(settings.theme).toBe("dark");
  });

  it("persists a theme change", async () => {
    await setTheme(database, "dark");
    expect((await database.settings.get("app"))?.theme).toBe("dark");
  });
});
