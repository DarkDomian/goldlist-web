import type { TatoebaCacheEntry } from "@/domain/types";
import type { GoldlistDatabase } from "./db";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function getCachedExamples(
  database: GoldlistDatabase,
  queryKey: string,
  now: Date = new Date(),
  allowStale = false,
): Promise<string[] | undefined> {
  const entry = await database.tatoebaCache.get(queryKey);
  if (!entry) {
    return undefined;
  }

  const age = now.getTime() - new Date(entry.fetchedAt).getTime();
  if (!allowStale && age > CACHE_TTL_MS) {
    return undefined;
  }

  return entry.examples;
}

export async function putCachedExamples(
  database: GoldlistDatabase,
  queryKey: string,
  examples: string[],
  now: Date = new Date(),
): Promise<TatoebaCacheEntry> {
  const entry: TatoebaCacheEntry = {
    queryKey,
    examples,
    fetchedAt: now.toISOString(),
  };
  await database.tatoebaCache.put(entry);
  return entry;
}
