import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  dueAt,
  isDue,
  needsCutoff,
  nextLocalMidnight,
  processCutoffs,
  startOfDay,
} from "@/domain/scheduling";
import type { Card } from "@/domain/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    word: "curious",
    wordKey: "curious",
    translation: "любопытный",
    status: "copper",
    createdAt: new Date(2026, 2, 7, 23, 30).toISOString(),
    statusChangedAt: new Date(2026, 2, 7, 23, 30).toISOString(),
    scheduledFor: null,
    ...overrides,
  };
}

describe("calendar scheduling", () => {
  it("returns local midnight for startOfDay", () => {
    const date = new Date(2026, 2, 7, 23, 59, 59);
    const start = startOfDay(date);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(7);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it("adds calendar days across DST without shifting the local clock", () => {
    const result = addCalendarDays(new Date(2026, 2, 7, 12, 0), 14);
    expect(result.getHours()).toBe(12);
    expect(result.getDate()).toBe(21);
    expect(result.getMonth()).toBe(2);
  });

  it("dueAt is local midnight on day D+14 regardless of creation time", () => {
    const evening = dueAt(new Date(2026, 2, 7, 23, 30));
    const morning = dueAt(new Date(2026, 2, 7, 6, 15));
    expect(evening.getTime()).toBe(morning.getTime());
    expect(evening.getDate()).toBe(21);
    expect(evening.getHours()).toBe(0);
  });

  it("handles the fall DST boundary", () => {
    const result = dueAt(new Date(2026, 9, 25, 22, 0));
    expect(result.getMonth()).toBe(10);
    expect(result.getDate()).toBe(8);
    expect(result.getHours()).toBe(0);
  });

  it("only cuts off copper cards created before the current local day", () => {
    const now = new Date(2026, 2, 8, 0, 1);
    expect(needsCutoff(makeCard(), now)).toBe(true);
    expect(
      needsCutoff(makeCard({ createdAt: new Date(2026, 2, 8, 0, 0).toISOString() }), now),
    ).toBe(false);
  });

  it("processes missed cutoffs and preserves the status", () => {
    const now = new Date(2026, 2, 12, 9, 0);
    const updates = processCutoffs([makeCard()], now);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.status).toBe("copper");
    expect(updates[0]?.scheduledFor).toBe(dueAt(new Date(2026, 2, 7)).toISOString());
    expect(updates[0]?.statusChangedAt).toBe(now.toISOString());
  });

  it("uses consecutive due dates for consecutive additions", () => {
    const first = dueAt(new Date(2026, 2, 7));
    const second = dueAt(new Date(2026, 2, 8));
    expect(second.getTime() - first.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("calculates the next local midnight", () => {
    const next = nextLocalMidnight(new Date(2026, 2, 7, 14, 5));
    expect(next.getDate()).toBe(8);
    expect(next.getHours()).toBe(0);
  });

  it("treats a scheduled card as due at its local midnight", () => {
    const card = makeCard({
      scheduledFor: new Date(2026, 2, 21, 0, 0).toISOString(),
    });
    expect(isDue(card, new Date(2026, 2, 20, 23, 59))).toBe(false);
    expect(isDue(card, new Date(2026, 2, 21, 0, 0))).toBe(true);
  });
});
