import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GoldlistDatabase } from "@/data/db";
import { createCard, submitDistillation } from "@/data/cardRepository";
import { AsyncMutex, createScheduler, runCutoff } from "@/services/scheduler";
import { nextLocalMidnight } from "@/domain/scheduling";
import { makeTestDatabase } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeTestDatabase();
});

afterEach(async () => {
  vi.useRealTimers();
  await database.delete();
});

describe("runCutoff", () => {
  it("schedules only cards from earlier local days", async () => {
    await createCard(
      database,
      { word: "yesterday", translation: "вчера", examples: [] },
      new Date(2026, 2, 7, 23, 59),
    );
    await createCard(
      database,
      { word: "today", translation: "сегодня", examples: [] },
      new Date(2026, 2, 8, 0, 1),
    );

    const count = await runCutoff(database, new Date(2026, 2, 8, 0, 2));
    expect(count).toBe(1);

    const yesterday = await database.cards.where("wordKey").equals("yesterday").first();
    const today = await database.cards.where("wordKey").equals("today").first();
    expect(yesterday?.scheduledFor).toBe(new Date(2026, 2, 21, 0, 0).toISOString());
    expect(today?.scheduledFor).toBeNull();
  });

  it("accepts an attempt at the cutoff minute", async () => {
    const card = await createCard(
      database,
      { word: "cutoff", translation: "полночь", examples: [] },
      new Date(2026, 2, 7, 23, 59),
    );
    const cutoff = new Date(2026, 2, 8, 0, 0);
    expect(await runCutoff(database, cutoff)).toBe(1);

    const result = await submitDistillation(database, card.id, "полночь", cutoff);
    expect(result.card.status).toBe("learned");
    expect(result.card.scheduledFor).toBeNull();

    const missed = await createCard(
      database,
      { word: "midnight", translation: "полночь", examples: [] },
      new Date(2026, 2, 7, 23, 59),
    );
    await runCutoff(database, cutoff);
    const missedResult = await submitDistillation(database, missed.id, "неверно", cutoff);
    expect(missedResult.card.status).toBe("silver");
    expect(missedResult.card.scheduledFor).toBe(
      new Date(2026, 2, 22, 0, 0).toISOString(),
    );
  });
});

describe("AsyncMutex", () => {
  it("serializes async work", async () => {
    const mutex = new AsyncMutex();
    const order: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = mutex.run(async () => {
      order.push("attempt-start");
      await gate;
      order.push("attempt-end");
    });
    const second = mutex.run(async () => {
      order.push("cutoff");
    });

    release();
    await Promise.all([first, second]);
    expect(order).toEqual(["attempt-start", "attempt-end", "cutoff"]);
  });
});

describe("createScheduler", () => {
  it("runs at startup, at local midnight, and on focus/visibility", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 7, 23, 59, 0));
    const performCutoff = vi.fn(async () => 0);
    const scheduler = createScheduler({
      mutex: new AsyncMutex(),
      performCutoff,
      now: () => new Date(),
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(performCutoff).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(performCutoff.mock.calls.length).toBeGreaterThanOrEqual(2);

    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);
    expect(performCutoff.mock.calls.length).toBeGreaterThanOrEqual(3);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(performCutoff.mock.calls.length).toBeGreaterThanOrEqual(4);

    scheduler.stop();
  });

  it("recomputes the next local midnight when the timezone changes", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "America/New_York";
      const newYork = nextLocalMidnight(new Date(2026, 2, 7, 23, 30)).getTime();
      process.env.TZ = "Europe/Moscow";
      const moscow = nextLocalMidnight(new Date(2026, 2, 7, 23, 30)).getTime();
      expect(moscow).not.toBe(newYork);
    } finally {
      process.env.TZ = original;
    }
  });
});
