import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GoldlistDatabase } from "@/data/db";
import {
  createCard,
  deleteCardCascade,
  findCardByWord,
  getAttemptsForCard,
  getCardWithExamples,
  listCardsWithExamples,
  relearnCard,
  submitDistillation,
  updateCardTranslation,
} from "@/data/cardRepository";
import { DuplicateWordError } from "@/data/errors";
import { makeTestDatabase } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeTestDatabase();
});

afterEach(async () => {
  await database.delete();
});

async function createSample(now = new Date()) {
  return createCard(
    database,
    {
      word: "curious",
      translation: "любопытный, интересующийся",
      examples: [{ text: "A curious cat watched us.", source: "tatoeba" }],
    },
    now,
  );
}

describe("cardRepository", () => {
  it("creates a copper card with examples and timestamps", async () => {
    const now = new Date(2026, 2, 7, 12, 0);
    const card = await createSample(now);
    expect(card.status).toBe("copper");
    expect(card.scheduledFor).toBeNull();
    expect(card.createdAt).toBe(now.toISOString());
    expect(card.statusChangedAt).toBe(now.toISOString());
    expect(card.examples).toHaveLength(1);
    expect(card.examples[0]?.source).toBe("tatoeba");
  });

  it("blocks duplicates by normalized word", async () => {
    await createSample();
    await expect(createSample()).rejects.toBeInstanceOf(DuplicateWordError);
    expect(await findCardByWord(database, "  CURIOUS ")).toBeDefined();
  });

  it("updates a translation", async () => {
    const card = await createSample();
    const updated = await updateCardTranslation(database, card.id, "новый перевод");
    expect(updated.translation).toBe("новый перевод");
    expect((await getCardWithExamples(database, card.id))?.translation).toBe(
      "новый перевод",
    );
  });

  it("re-learns an archived card and preserves history", async () => {
    const card = await createSample();
    await submitDistillation(database, card.id, "wrong", new Date());
    await database.cards.update(card.id, { status: "learned" });
    const relearned = await relearnCard(database, card.id);
    expect(relearned.status).toBe("copper");
    expect(relearned.scheduledFor).toBeNull();
    expect(await getAttemptsForCard(database, card.id)).toHaveLength(1);
  });

  it("deletes the card, examples, and attempts together", async () => {
    const card = await createSample();
    await submitDistillation(database, card.id, "неверно", new Date());
    await deleteCardCascade(database, card.id);
    expect(await database.cards.get(card.id)).toBeUndefined();
    expect(await database.examples.where("cardId").equals(card.id).count()).toBe(0);
    expect(await database.attempts.where("cardId").equals(card.id).count()).toBe(0);
  });

  it("lists cards with their examples", async () => {
    await createSample();
    const cards = await listCardsWithExamples(database);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.examples).toHaveLength(1);
  });

  it("records a correct attempt as learned", async () => {
    const card = await createSample();
    const result = await submitDistillation(database, card.id, "ЛЮБОПЫТНЫЙ", new Date());
    expect(result.isCorrect).toBe(true);
    expect(result.card.status).toBe("learned");
    expect(result.card.scheduledFor).toBeNull();
    const attempts = await getAttemptsForCard(database, card.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      previousStatus: "copper",
      resultingStatus: "learned",
      isCorrect: true,
    });
  });

  it("records an incorrect attempt and advances the stage", async () => {
    const card = await createSample();
    const now = new Date(2026, 2, 7, 18, 0);
    const result = await submitDistillation(database, card.id, "неверно", now);
    expect(result.isCorrect).toBe(false);
    expect(result.card.status).toBe("silver");
    expect(result.card.scheduledFor).not.toBeNull();
    const attempts = await getAttemptsForCard(database, card.id);
    expect(attempts[0]).toMatchObject({
      previousStatus: "copper",
      resultingStatus: "silver",
      isCorrect: false,
      userAnswer: "неверно",
      expectedAnswer: card.translation,
    });
  });
});
