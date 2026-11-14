import Dexie, { type Table } from "dexie";
import type {
  Card,
  DistillationAttempt,
  Example,
  Settings,
  TatoebaCacheEntry,
} from "@/domain/types";

export class GoldlistDatabase extends Dexie {
  settings!: Table<Settings, string>;
  cards!: Table<Card, string>;
  examples!: Table<Example, string>;
  attempts!: Table<DistillationAttempt, string>;
  tatoebaCache!: Table<TatoebaCacheEntry, string>;

  constructor(name = "goldlist") {
    super(name);

    this.version(1).stores({
      settings: "id",
      cards: "id, status, scheduledFor, createdAt, &wordKey",
      examples: "id, cardId",
      attempts: "id, cardId, attemptedAt",
      tatoebaCache: "queryKey, fetchedAt",
    });
  }
}

export const db = new GoldlistDatabase();
