import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GoldlistDatabase } from "@/data/db";
import { createCard, listCardsWithExamples } from "@/data/cardRepository";
import { selectArchive, selectCurrentDay, selectDue } from "@/domain/selectors";
import { makeTestDatabase } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeTestDatabase();
});

afterEach(async () => {
  await database.delete();
});

describe("repository-backed selectors", () => {
  it("returns Current Day, due, and archive records from IndexedDB", async () => {
    await createCard(
      database,
      { word: "alpha", translation: "альфа", examples: [] },
      new Date(2026, 2, 1),
    );
    await createCard(
      database,
      { word: "beta", translation: "бета", examples: [] },
      new Date(2026, 2, 2),
    );
    await createCard(
      database,
      { word: "gamma", translation: "гамма", examples: [] },
      new Date(2026, 2, 3),
    );

    await database.cards.update(
      (await database.cards.where("wordKey").equals("beta").first())!.id,
      {
        status: "silver",
        scheduledFor: new Date(2026, 2, 16).toISOString(),
        statusChangedAt: new Date(2026, 2, 2).toISOString(),
      },
    );
    await database.cards.update(
      (await database.cards.where("wordKey").equals("gamma").first())!.id,
      {
        status: "learned",
        statusChangedAt: new Date(2026, 2, 3).toISOString(),
      },
    );

    const cards = await listCardsWithExamples(database);
    expect(selectCurrentDay(cards).map((card) => card.word)).toEqual(["alpha"]);
    expect(
      selectDue(cards, new Date(2026, 2, 17)).map((card) => card.word),
    ).toEqual(["beta"]);
    const blocks = selectArchive(cards);
    expect(blocks.learned.map((card) => card.word)).toEqual(["gamma"]);
    expect(blocks.waiting.map((card) => card.word)).toEqual(["beta"]);
  });
});
