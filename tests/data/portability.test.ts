import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSnapshot,
  importSnapshot,
  parseSnapshot,
  parseSnapshotJson,
  previewSnapshot,
  type Snapshot,
} from "@/data/portability";
import { createCard } from "@/data/cardRepository";
import type { GoldlistDatabase } from "@/data/db";
import { DEFAULT_SETTINGS, type Settings } from "@/domain/types";
import { makeTestDatabase } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeTestDatabase();
});

afterEach(async () => {
  await database.delete();
});

const timestamp = "2026-11-15T12:00:00.000Z";

type RawSnapshot = {
  [key: string]: unknown;
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  payload: {
    settings: Record<string, unknown>;
    cards: Array<Record<string, unknown>>;
    examples: Array<Record<string, unknown>>;
    attempts: Array<Record<string, unknown>>;
  };
};

function makeRawSnapshot(): RawSnapshot {
  return {
    schemaVersion: 1,
    exportedAt: timestamp,
    appVersion: "0.1.0",
    payload: {
      settings: { ...DEFAULT_SETTINGS },
      cards: [
        {
          id: "card-1",
          word: "alpha",
          wordKey: "alpha",
          translation: "альфа",
          status: "copper",
          createdAt: timestamp,
          statusChangedAt: timestamp,
          scheduledFor: null,
        },
      ],
      examples: [
        {
          id: "example-1",
          cardId: "card-1",
          text: "An alpha sentence.",
          source: "tatoeba",
        },
      ],
      attempts: [
        {
          id: "attempt-1",
          cardId: "card-1",
          attemptedAt: timestamp,
          userAnswer: "альфа",
          expectedAnswer: "альфа",
          isCorrect: true,
          previousStatus: "copper",
          resultingStatus: "silver",
        },
      ],
    },
  };
}

function withSettings(settings: Partial<Settings>): RawSnapshot {
  const raw = makeRawSnapshot();
  raw.payload.settings = { ...raw.payload.settings, ...settings };
  return raw;
}

describe("snapshot export", () => {
  it("builds a versioned snapshot without the Tatoeba cache", async () => {
    await database.settings.put({ ...DEFAULT_SETTINGS, onboardingCompleted: true });
    await createCard(database, {
      word: "curious",
      translation: "любопытный",
      examples: [{ text: "A curious cat.", source: "user" }],
    });
    await database.tatoebaCache.put({
      queryKey: "curious",
      examples: ["A curious cat."],
      fetchedAt: timestamp,
    });

    const snapshot = await buildSnapshot(database, new Date(timestamp));

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      exportedAt: timestamp,
      appVersion: "test-version",
    });
    expect(snapshot.payload.cards).toHaveLength(1);
    expect(snapshot.payload.examples).toHaveLength(1);
    expect(snapshot).not.toHaveProperty("tatoebaCache");
    expect(previewSnapshot(snapshot)).toEqual({
      settings: 1,
      cards: 1,
      examples: 1,
      attempts: 0,
    });
  });
});

describe("snapshot parsing", () => {
  it("validates records, ignores unknown fields, and ignores wordKey drift", () => {
    const raw = makeRawSnapshot();
    raw.unknown = true;
    raw.payload.cards[0]!.unknown = "ignored";
    raw.payload.cards[0]!.wordKey = "DRIFTED";

    const snapshot = parseSnapshot(raw);

    expect(snapshot.payload.cards[0]).not.toHaveProperty("unknown");
    expect(snapshot.payload.cards[0]!.wordKey).toBe("alpha");
    expect(snapshot.payload.settings).not.toHaveProperty("unknown");
  });

  it("rejects missing payloads, invalid records, and orphaned dependents", () => {
    expect(() => parseSnapshot({ ...makeRawSnapshot(), payload: undefined })).toThrow(
      /payload/i,
    );

    const invalidStatus = makeRawSnapshot();
    invalidStatus.payload.cards[0]!.status = "platinum";
    expect(() => parseSnapshot(invalidStatus)).toThrow(/status/i);

    const orphan = makeRawSnapshot();
    orphan.payload.examples[0]!.cardId = "missing";
    expect(() => parseSnapshot(orphan)).toThrow(/missing card/i);

    const orphanAttempt = makeRawSnapshot();
    orphanAttempt.payload.attempts[0]!.cardId = "missing";
    expect(() => parseSnapshot(orphanAttempt)).toThrow(/missing card/i);

    const invalidDate = makeRawSnapshot();
    invalidDate.payload.cards[0]!.createdAt = "not-a-date";
    expect(() => parseSnapshot(invalidDate)).toThrow(/valid date/i);
  });

  it("rejects duplicate ids and malformed JSON", () => {
    const duplicate = makeRawSnapshot();
    duplicate.payload.cards.push({ ...duplicate.payload.cards[0] });
    expect(() => parseSnapshot(duplicate)).toThrow(/duplicate id/i);

    expect(() => parseSnapshotJson("{not json")).toThrow(/not valid JSON/i);
  });

  it("migrates an older snapshot and rejects a newer one", () => {
    const old = makeRawSnapshot();
    old.schemaVersion = 0;
    delete old.payload.settings.exampleSelectionMode;

    expect(parseSnapshot(old).payload.settings.exampleSelectionMode).toBe("auto");

    const newer = makeRawSnapshot();
    newer.schemaVersion = 2;
    expect(() => parseSnapshot(newer)).toThrow(/supports up to 1/i);
  });
});

describe("merge import", () => {
  it("imports settings only when the current settings are defaults", async () => {
    await database.settings.put({ ...DEFAULT_SETTINGS });
    const snapshot = parseSnapshot(withSettings({ theme: "dark" }));

    const result = await importSnapshot(database, snapshot, "merge");

    expect(result.imported.settings).toBe(1);
    expect((await database.settings.get("app"))?.theme).toBe("dark");
  });

  it("keeps customized settings and skips id and word collisions", async () => {
    await database.settings.put({ ...DEFAULT_SETTINGS, theme: "dark" });
    const existing = await createCard(database, {
      word: "beta",
      translation: "бета",
      examples: [],
    });

    const raw = makeRawSnapshot();
    raw.payload.settings = { ...raw.payload.settings, theme: "light" };
    raw.payload.cards[0]!.id = existing.id;
    raw.payload.cards.push({
      ...raw.payload.cards[0],
      id: "card-2",
      word: "BETA",
      wordKey: "beta",
    });
    raw.payload.cards.push({
      ...raw.payload.cards[0],
      id: "card-3",
      word: "gamma",
      wordKey: "gamma",
    });
    raw.payload.examples[0]!.cardId = existing.id;
    raw.payload.examples.push({
      ...raw.payload.examples[0],
      id: "example-2",
      cardId: "card-2",
    });
    raw.payload.examples.push({
      ...raw.payload.examples[0],
      id: "example-3",
      cardId: "card-3",
    });
    raw.payload.attempts[0]!.cardId = existing.id;
    raw.payload.attempts.push({
      ...raw.payload.attempts[0],
      id: "attempt-2",
      cardId: "card-2",
    });
    raw.payload.attempts.push({
      ...raw.payload.attempts[0],
      id: "attempt-3",
      cardId: "card-3",
    });

    const result = await importSnapshot(database, parseSnapshot(raw), "merge");

    expect(result.skipped).toEqual({
      settings: 1,
      cards: 2,
      examples: 2,
      attempts: 2,
    });
    expect(result.imported).toEqual({
      settings: 0,
      cards: 1,
      examples: 1,
      attempts: 1,
    });
    expect(await database.cards.count()).toBe(2);
    expect((await database.settings.get("app"))?.theme).toBe("dark");
    const gamma = await database.cards.where("wordKey").equals("gamma").first();
    expect(await database.examples.where("cardId").equals(gamma!.id).count()).toBe(1);
    expect(await database.attempts.where("cardId").equals(gamma!.id).count()).toBe(1);
  });
});

describe("replace import", () => {
  it("downloads a backup before replacing all data", async () => {
    await createCard(database, {
      word: "old",
      translation: "старый",
      examples: [],
    });
    const backup = vi.fn(async (_snapshot: Snapshot) => undefined);

    const result = await importSnapshot(
      database,
      parseSnapshot(makeRawSnapshot()),
      "replace",
      { beforeReplace: backup },
    );

    expect(backup).toHaveBeenCalledTimes(1);
    expect(backup.mock.calls[0]![0].payload.cards[0]!.word).toBe("old");
    expect(result.imported).toEqual({
      settings: 1,
      cards: 1,
      examples: 1,
      attempts: 1,
    });
    expect(await database.cards.count()).toBe(1);
    expect((await database.cards.toArray())[0]!.word).toBe("alpha");
  });

  it("aborts before writing when the backup fails", async () => {
    await createCard(database, {
      word: "old",
      translation: "старый",
      examples: [],
    });

    await expect(
      importSnapshot(database, parseSnapshot(makeRawSnapshot()), "replace", {
        beforeReplace: async () => {
          throw new Error("download blocked");
        },
      }),
    ).rejects.toThrow("download blocked");

    expect(await database.cards.count()).toBe(1);
    expect((await database.cards.toArray())[0]!.word).toBe("old");
  });

  it("rolls back when a write fails inside the transaction", async () => {
    await createCard(database, {
      word: "old",
      translation: "старый",
      examples: [],
    });
    const raw = makeRawSnapshot();
    raw.payload.cards.push({
      ...raw.payload.cards[0],
      id: "card-2",
      word: "ALPHA",
      wordKey: "alpha",
    });

    await expect(
      importSnapshot(database, parseSnapshot(raw), "replace"),
    ).rejects.toBeTruthy();

    expect(await database.cards.count()).toBe(1);
    expect((await database.cards.toArray())[0]!.word).toBe("old");
    expect(await database.examples.count()).toBe(0);
  });
});
