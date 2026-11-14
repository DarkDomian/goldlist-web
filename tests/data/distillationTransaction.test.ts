import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GoldlistDatabase } from "@/data/db";
import { commitDistillation } from "@/data/cardRepository";
import type { Card, DistillationAttempt } from "@/domain/types";
import { makeTestDatabase } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeTestDatabase();
});

afterEach(async () => {
  await database.delete();
});

function card(id: string, wordKey: string): Card {
  return {
    id,
    word: wordKey,
    wordKey,
    translation: "перевод",
    status: "copper",
    createdAt: new Date().toISOString(),
    statusChangedAt: new Date().toISOString(),
    scheduledFor: null,
  };
}

describe("distillation transaction", () => {
  it("commits the attempt and card update together", async () => {
    await database.cards.add(card("one", "alpha"));
    const attempt: DistillationAttempt = {
      id: "attempt-1",
      cardId: "one",
      attemptedAt: new Date().toISOString(),
      userAnswer: "перевод",
      expectedAnswer: "перевод",
      isCorrect: true,
      previousStatus: "copper",
      resultingStatus: "learned",
    };

    await commitDistillation(
      database,
      { ...card("one", "alpha"), status: "learned" },
      attempt,
    );

    expect(await database.attempts.get("attempt-1")).toBeDefined();
    expect((await database.cards.get("one"))?.status).toBe("learned");
  });

  it("rolls back the attempt when the card update fails", async () => {
    await database.cards.add(card("one", "alpha"));
    await database.cards.add(card("two", "beta"));
    const attempt: DistillationAttempt = {
      id: "attempt-2",
      cardId: "two",
      attemptedAt: new Date().toISOString(),
      userAnswer: "перевод",
      expectedAnswer: "перевод",
      isCorrect: true,
      previousStatus: "copper",
      resultingStatus: "learned",
    };

    await expect(
      commitDistillation(
        database,
        { ...card("two", "alpha"), status: "learned" },
        attempt,
      ),
    ).rejects.toThrow();

    expect(await database.attempts.get("attempt-2")).toBeUndefined();
    expect((await database.cards.get("two"))?.status).toBe("copper");
  });
});
