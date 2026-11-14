import { afterEach, describe, expect, it } from "vitest";
import { GoldlistDatabase } from "@/data/db";
import type { Card } from "@/domain/types";

let database: GoldlistDatabase;

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: crypto.randomUUID(),
    word: "curious",
    wordKey: "curious",
    translation: "любопытный",
    status: "copper",
    createdAt: new Date().toISOString(),
    statusChangedAt: new Date().toISOString(),
    scheduledFor: null,
    ...overrides,
  };
}

afterEach(async () => {
  await database?.delete();
});

describe("GoldlistDatabase", () => {
  it("opens all stores", async () => {
    database = new GoldlistDatabase(`db-open-${Date.now()}`);
    await database.open();
    expect(database.settings).toBeDefined();
    expect(database.cards).toBeDefined();
    expect(database.examples).toBeDefined();
    expect(database.attempts).toBeDefined();
    expect(database.tatoebaCache).toBeDefined();
  });

  it("rejects a duplicate wordKey", async () => {
    database = new GoldlistDatabase(`db-unique-${Date.now()}`);
    await database.cards.add(card({ id: "one", wordKey: "curious" }));
    await expect(
      database.cards.add(card({ id: "two", word: "Curious", wordKey: "curious" })),
    ).rejects.toMatchObject({ name: "ConstraintError" });
  });
});
