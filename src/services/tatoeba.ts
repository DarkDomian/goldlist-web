import type { GoldlistDatabase } from "@/data/db";
import { getCachedExamples, putCachedExamples } from "@/data/tatoebaCacheRepository";
import { wordKey } from "@/domain/normalization";
import type { ExampleDraft } from "@/domain/types";

export const TATOEBA_ENDPOINT = "https://api.tatoeba.org/v1/sentences";
export const MAX_EXAMPLES = 3;
const DEFAULT_TIMEOUT_MS = 8_000;

export interface TatoebaOptions {
  database?: GoldlistDatabase;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
  limit?: number;
}

type TatoebaResponse = {
  data?: Array<{ text?: unknown }>;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stemWord(word: string): string {
  const lower = word.toLocaleLowerCase("en");
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (lower.length > suffix.length + 2 && lower.endsWith(suffix)) {
      return lower.slice(0, -suffix.length);
    }
  }
  return lower;
}

function containsExact(sentence: string, word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed) {
    return false;
  }
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(trimmed)}($|[^\\p{L}\\p{N}])`,
    "iu",
  );
  return pattern.test(sentence);
}

function containsStem(sentence: string, word: string): boolean {
  const firstToken = word.trim().split(/\s+/)[0] ?? "";
  const stem = stemWord(firstToken);
  if (stem.length < 3) {
    return false;
  }

  return sentence
    .toLocaleLowerCase("en")
    .split(/[^\p{L}\p{N}]+/u)
    .some((token) => stemWord(token) === stem);
}

export function selectExamples(
  sentences: string[],
  word: string,
  limit = MAX_EXAMPLES,
): string[] {
  const unique = Array.from(new Set(sentences.map((sentence) => sentence.trim()))).filter(
    Boolean,
  );
  const exact = unique.filter((sentence) => containsExact(sentence, word));
  const selected = [...exact];

  if (selected.length < limit) {
    for (const sentence of unique) {
      if (selected.length >= limit) {
        break;
      }
      if (!selected.includes(sentence) && containsStem(sentence, word)) {
        selected.push(sentence);
      }
    }
  }

  return selected.slice(0, limit);
}

async function fetchSentences(
  word: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  limit: number,
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(TATOEBA_ENDPOINT);
    url.searchParams.set("lang", "eng");
    url.searchParams.set("q", word);
    url.searchParams.set("sort", "relevance");
    url.searchParams.set("limit", String(limit));

    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Tatoeba responded with ${response.status}`);
    }

    const payload = (await response.json()) as TatoebaResponse;
    return (payload.data ?? [])
      .map((item) => (typeof item.text === "string" ? item.text : ""))
      .filter(Boolean);
  } finally {
    clearTimeout(timer);
  }
}

export async function getExamples(
  word: string,
  options: TatoebaOptions = {},
): Promise<ExampleDraft[]> {
  const queryKey = wordKey(word);
  if (!queryKey) {
    return [];
  }

  const now = options.now?.() ?? new Date();
  const database = options.database;
  const cached = database
    ? await getCachedExamples(database, queryKey, now)
    : undefined;

  if (cached) {
    return cached.map((text) => ({ text, source: "tatoeba" }));
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const limit = options.limit ?? 20;

  try {
    const sentences = await fetchSentences(word, fetchImpl, timeoutMs, limit);
    const examples = selectExamples(sentences, word);
    if (database) {
      await putCachedExamples(database, queryKey, examples, now);
    }
    return examples.map((text) => ({ text, source: "tatoeba" }));
  } catch {
    const stale = database
      ? await getCachedExamples(database, queryKey, now, true)
      : undefined;
    return (stale ?? []).map((text) => ({ text, source: "tatoeba" }));
  }
}
