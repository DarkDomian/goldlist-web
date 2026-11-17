import { describe, expect, it } from "vitest";
import { createProgressAggregator } from "@/services/translation/progress";

describe("createProgressAggregator", () => {
  it("uses loaded and total across files when available", () => {
    const aggregator = createProgressAggregator();
    expect(aggregator.update("a", { loaded: 25, total: 100 })).toBe(25);
    expect(aggregator.update("b", { loaded: 100, total: 100 })).toBe(62.5);
    expect(aggregator.update("a", { loaded: 50, total: 100 })).toBe(75);
  });

  it("averages per-file progress when totals are missing", () => {
    const aggregator = createProgressAggregator();
    expect(aggregator.update("a", { progress: 20 })).toBe(20);
    expect(aggregator.update("b", { progress: 60 })).toBe(40);
    expect(aggregator.update("a", { progress: 10 })).toBe(40);
  });

  it("reports completion and never decreases", () => {
    const aggregator = createProgressAggregator();
    expect(aggregator.update("a", { loaded: 40, total: 100 })).toBe(40);
    expect(aggregator.update("a", { loaded: 100, total: 100 })).toBe(100);
    expect(aggregator.update("a", { progress: 10 })).toBe(100);
  });
});
