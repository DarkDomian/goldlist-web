import { describe, expect, it } from "vitest";
import {
  hasArchiveContent,
  selectArchive,
  selectCurrentDay,
  selectDue,
  selectWaiting,
} from "@/domain/selectors";
import type { Card } from "@/domain/types";

function card(overrides: Partial<Card>): Card {
  return {
    id: "card",
    word: "word",
    wordKey: "word",
    translation: "слово",
    status: "copper",
    createdAt: new Date(2026, 2, 1).toISOString(),
    statusChangedAt: new Date(2026, 2, 1).toISOString(),
    scheduledFor: null,
    ...overrides,
  };
}

const now = new Date(2026, 2, 20, 12, 0);

const cards: Card[] = [
  card({ id: "current-1", word: "alpha", wordKey: "alpha" }),
  card({
    id: "current-2",
    word: "beta",
    wordKey: "beta",
    createdAt: new Date(2026, 2, 1, 10).toISOString(),
  }),
  card({
    id: "future",
    word: "gamma",
    wordKey: "gamma",
    status: "silver",
    scheduledFor: new Date(2026, 2, 25).toISOString(),
  }),
  card({
    id: "due-late",
    word: "delta",
    wordKey: "delta",
    status: "gold",
    scheduledFor: new Date(2026, 2, 20).toISOString(),
  }),
  card({
    id: "due-early",
    word: "epsilon",
    wordKey: "epsilon",
    status: "copper",
    scheduledFor: new Date(2026, 2, 19).toISOString(),
  }),
  card({
    id: "learned-old",
    word: "zeta",
    wordKey: "zeta",
    status: "learned",
    statusChangedAt: new Date(2026, 2, 10).toISOString(),
  }),
  card({
    id: "learned-new",
    word: "eta",
    wordKey: "eta",
    status: "learned",
    statusChangedAt: new Date(2026, 2, 12).toISOString(),
  }),
  card({
    id: "unlearned",
    word: "theta",
    wordKey: "theta",
    status: "unlearned",
    statusChangedAt: new Date(2026, 2, 11).toISOString(),
  }),
];

describe("selectors", () => {
  it("selects Current Day cards only", () => {
    expect(selectCurrentDay(cards).map((item) => item.id)).toEqual([
      "current-1",
      "current-2",
    ]);
  });

  it("selects waiting cards outside Current Day and archive", () => {
    expect(selectWaiting(cards).map((item) => item.id).sort()).toEqual([
      "due-early",
      "due-late",
      "future",
    ]);
  });

  it("selects due cards ordered by soonest due date", () => {
    expect(selectDue(cards, now).map((item) => item.id)).toEqual([
      "due-early",
      "due-late",
    ]);
  });

  it("builds ordered archive blocks", () => {
    const blocks = selectArchive(cards);
    expect(blocks.learned.map((item) => item.id)).toEqual(["learned-new", "learned-old"]);
    expect(blocks.unlearned.map((item) => item.id)).toEqual(["unlearned"]);
    expect(blocks.waiting.map((item) => item.id)).toEqual([
      "due-early",
      "due-late",
      "future",
    ]);
    expect(hasArchiveContent(blocks)).toBe(true);
  });

  it("reports an empty archive", () => {
    expect(hasArchiveContent({ learned: [], unlearned: [], waiting: [] })).toBe(false);
  });
});
