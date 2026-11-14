import { describe, expect, it } from "vitest";
import {
  isAnswerCorrect,
  normalizeAnswer,
  translationVariants,
  wordKey,
} from "@/domain/normalization";

describe("wordKey", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(wordKey("  Take   Off ")).toBe("take off");
  });
});

describe("normalizeAnswer", () => {
  it("ignores case, punctuation, and extra whitespace", () => {
    expect(normalizeAnswer("  Дом,   (жилище)! ")).toBe("дом жилище");
  });

  it("handles Cyrillic lowercasing", () => {
    expect(normalizeAnswer("ПРИВЕТ")).toBe("привет");
  });
});

describe("translationVariants", () => {
  it("splits on comma, semicolon, and slash", () => {
    expect(translationVariants("дом, жилище; здание / кров")).toEqual([
      "дом",
      "жилище",
      "здание",
      "кров",
    ]);
  });

  it("deduplicates normalized variants", () => {
    expect(translationVariants("Дом, дом")).toEqual(["дом"]);
  });
});

describe("isAnswerCorrect", () => {
  it("accepts any listed variant with different case and punctuation", () => {
    expect(isAnswerCorrect("ЖИЛИЩЕ!", "дом, жилище")).toBe(true);
  });

  it("rejects a different word", () => {
    expect(isAnswerCorrect("машина", "дом, жилище")).toBe(false);
  });

  it("rejects an empty answer", () => {
    expect(isAnswerCorrect("   ", "дом")).toBe(false);
  });
});
