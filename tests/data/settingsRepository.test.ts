import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GoldlistDatabase } from "@/data/db";
import {
  completeOnboarding,
  getSettings,
  normalizeSettings,
  setTheme,
  updateSettings,
} from "@/data/settingsRepository";
import type { Settings } from "@/domain/types";
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
      exampleSelectionMode: "auto",
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

  it("persists light, dark, and system themes", async () => {
    await setTheme(database, "system");
    expect((await database.settings.get("app"))?.theme).toBe("system");
    await setTheme(database, "light");
    expect((await database.settings.get("app"))?.theme).toBe("light");
    await setTheme(database, "dark");
    expect((await database.settings.get("app"))?.theme).toBe("dark");
  });

  it("persists the example selection mode", async () => {
    await updateSettings(database, { exampleSelectionMode: "manual" });
    expect((await getSettings(database)).exampleSelectionMode).toBe("manual");
  });

  it("fills missing fields on legacy records", async () => {
    await database.settings.put({
      id: "app",
      nativeLanguage: "ru",
      targetLanguage: "en",
      cutoffTime: "00:00",
      freezeDays: 14,
      theme: "system",
      onboardingCompleted: true,
    } as Settings);

    await expect(getSettings(database)).resolves.toMatchObject({
      theme: "system",
      exampleSelectionMode: "auto",
      onboardingCompleted: true,
    });
  });

  it("falls back for invalid stored values", async () => {
    await database.settings.put({
      ...normalizeSettings(),
      theme: "sepia",
      exampleSelectionMode: "sometimes",
    } as unknown as Settings);

    await expect(getSettings(database)).resolves.toMatchObject({
      theme: "light",
      exampleSelectionMode: "auto",
    });
  });
});
