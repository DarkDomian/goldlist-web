import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GoldlistDatabase } from "@/data/db";
import { getExamples, selectExamples } from "@/services/tatoeba";
import { makeTestDatabase } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeTestDatabase();
});

afterEach(async () => {
  await database.delete();
});

function responseFor(texts: string[]): Response {
  return new Response(JSON.stringify({ data: texts.map((text) => ({ text })) }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("selectExamples", () => {
  it("prefers exact word matches before stem matches", () => {
    const selected = selectExamples(
      ["I walked home.", "She walks daily.", "A walk in the park."],
      "walk",
    );
    expect(selected[0]).toBe("A walk in the park.");
    expect(selected).toContain("She walks daily.");
  });

  it("caps examples at three", () => {
    expect(
      selectExamples(
        ["walk one", "walk two", "walk three", "walk four"],
        "walk",
      ),
    ).toHaveLength(3);
  });
});

describe("getExamples", () => {
  it("requests only the word from the versioned endpoint", async () => {
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        responseFor(["A curious cat."]),
    );
    await getExamples("curious", { fetchImpl, database });

    const calledUrl = String(fetchImpl.mock.calls[0]?.[0]);
    const url = new URL(calledUrl);
    expect(url.origin + url.pathname).toBe("https://api.tatoeba.org/v1/sentences");
    expect(url.searchParams.get("q")).toBe("curious");
    expect(url.searchParams.get("lang")).toBe("eng");
    expect(url.searchParams.get("sort")).toBe("relevance");
    expect(url.searchParams.has("user")).toBe(false);
  });

  it("attaches examples and caches the response", async () => {
    const fetchImpl = vi.fn(async () => responseFor(["A curious cat."]));
    const first = await getExamples("curious", { fetchImpl, database });
    const second = await getExamples("curious", { fetchImpl, database });

    expect(first).toEqual([{ text: "A curious cat.", source: "tatoeba" }]);
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns no examples when the request fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(getExamples("curious", { fetchImpl, database })).resolves.toEqual([]);
  });

  it("returns no examples when Tatoeba returns nothing usable", async () => {
    const fetchImpl = vi.fn(async () => responseFor([]));
    await expect(getExamples("curious", { fetchImpl, database })).resolves.toEqual([]);
  });

  it("falls back to stale cache when the network fails", async () => {
    const success = vi.fn(async () => responseFor(["A curious cat."]));
    await getExamples("curious", {
      fetchImpl: success,
      database,
      now: () => new Date(2026, 0, 1),
    });

    const failing = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await getExamples("curious", {
      fetchImpl: failing,
      database,
      now: () => new Date(2026, 3, 1),
    });

    expect(result).toEqual([{ text: "A curious cat.", source: "tatoeba" }]);
  });

  it("times out a hanging request", async () => {
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const result = await getExamples("curious", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 5,
    });
    expect(result).toEqual([]);
  });
});
