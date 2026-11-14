import { describe, expect, it } from "vitest";
import { dueAt } from "@/domain/scheduling";
import { transitionCard } from "@/domain/transitions";

describe("transitionCard", () => {
  const attemptedAt = new Date(2026, 2, 7, 18, 30);
  const freeze = dueAt(attemptedAt).toISOString();

  it("copper passes to learned", () => {
    expect(transitionCard("copper", true, attemptedAt)).toEqual({
      status: "learned",
      scheduledFor: null,
    });
  });

  it("silver passes to learned", () => {
    expect(transitionCard("silver", true, attemptedAt)).toEqual({
      status: "learned",
      scheduledFor: null,
    });
  });

  it("gold passes to learned", () => {
    expect(transitionCard("gold", true, attemptedAt)).toEqual({
      status: "learned",
      scheduledFor: null,
    });
  });

  it("copper fails to silver and freezes for 14 days", () => {
    expect(transitionCard("copper", false, attemptedAt)).toEqual({
      status: "silver",
      scheduledFor: freeze,
    });
  });

  it("silver fails to gold and freezes for 14 days", () => {
    expect(transitionCard("silver", false, attemptedAt)).toEqual({
      status: "gold",
      scheduledFor: freeze,
    });
  });

  it("gold fails to unlearned with no schedule", () => {
    expect(transitionCard("gold", false, attemptedAt)).toEqual({
      status: "unlearned",
      scheduledFor: null,
    });
  });
});
