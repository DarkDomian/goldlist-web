import type {
  Card,
  CardStatus,
  DistillationAttempt,
  DistillableStatus,
  Example,
  ExampleSelectionMode,
  Settings,
  Theme,
} from "@/domain/types";
import { DEFAULT_SETTINGS } from "@/domain/types";
import type { GoldlistDatabase } from "./db";
import { InvalidSnapshotError } from "./errors";
import { wordKey } from "@/domain/normalization";
import { readSettings } from "./settingsRepository";

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const MIN_SNAPSHOT_SCHEMA_VERSION = 0;

export interface SnapshotPayload {
  settings: Settings;
  cards: Card[];
  examples: Example[];
  attempts: DistillationAttempt[];
}

export interface Snapshot {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  payload: SnapshotPayload;
}

export interface SnapshotCounts {
  settings: number;
  cards: number;
  examples: number;
  attempts: number;
}

export interface ImportResult {
  imported: SnapshotCounts;
  skipped: SnapshotCounts;
}

export type ImportMode = "merge" | "replace";

const CARD_STATUSES: readonly CardStatus[] = [
  "copper",
  "silver",
  "gold",
  "learned",
  "unlearned",
];
const DISTILLABLE_STATUSES: readonly DistillableStatus[] = [
  "copper",
  "silver",
  "gold",
];
const THEMES: readonly Theme[] = ["light", "dark", "system"];
const EXAMPLE_MODES: readonly ExampleSelectionMode[] = ["auto", "manual"];

function zeroCounts(): SnapshotCounts {
  return { settings: 0, cards: 0, examples: 0, attempts: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new InvalidSnapshotError(`${label} must be an object.`);
  }
  return value;
}

function requireString(
  value: unknown,
  label: string,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new InvalidSnapshotError(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireDate(value: unknown, label: string): string {
  const date = requireString(value, label);
  if (Number.isNaN(Date.parse(date))) {
    throw new InvalidSnapshotError(`${label} must be a valid date.`);
  }
  return date;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new InvalidSnapshotError(`${label} must be true or false.`);
  }
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidSnapshotError(`${label} must be an array.`);
  }
  return value;
}

function parseSettings(value: unknown): Settings {
  const raw = requireRecord(value, "settings");
  if (raw.theme !== undefined && !THEMES.includes(raw.theme as Theme)) {
    throw new InvalidSnapshotError("settings.theme is not a supported theme.");
  }
  if (
    raw.exampleSelectionMode !== undefined &&
    !EXAMPLE_MODES.includes(raw.exampleSelectionMode as ExampleSelectionMode)
  ) {
    throw new InvalidSnapshotError(
      "settings.exampleSelectionMode is not a supported mode.",
    );
  }
  if (
    raw.onboardingCompleted !== undefined &&
    typeof raw.onboardingCompleted !== "boolean"
  ) {
    throw new InvalidSnapshotError("settings.onboardingCompleted must be true or false.");
  }
  return {
    id: "app",
    nativeLanguage: "ru",
    targetLanguage: "en",
    cutoffTime: "00:00",
    freezeDays: 14,
    theme: THEMES.includes(raw.theme as Theme)
      ? (raw.theme as Theme)
      : DEFAULT_SETTINGS.theme,
    exampleSelectionMode: EXAMPLE_MODES.includes(
      raw.exampleSelectionMode as ExampleSelectionMode,
    )
      ? (raw.exampleSelectionMode as ExampleSelectionMode)
      : DEFAULT_SETTINGS.exampleSelectionMode,
    onboardingCompleted:
      typeof raw.onboardingCompleted === "boolean"
        ? raw.onboardingCompleted
        : DEFAULT_SETTINGS.onboardingCompleted,
  };
}

function parseCard(value: unknown, index: number): Card {
  const raw = requireRecord(value, `cards[${index}]`);
  const status = requireString(raw.status, `cards[${index}].status`) as CardStatus;
  if (!CARD_STATUSES.includes(status)) {
    throw new InvalidSnapshotError(`cards[${index}].status is not supported.`);
  }
  const word = requireString(raw.word, `cards[${index}].word`);
  return {
    id: requireString(raw.id, `cards[${index}].id`),
    word,
    wordKey: wordKey(word),
    translation: requireString(raw.translation, `cards[${index}].translation`),
    status,
    createdAt: requireDate(raw.createdAt, `cards[${index}].createdAt`),
    statusChangedAt: requireDate(
      raw.statusChangedAt,
      `cards[${index}].statusChangedAt`,
    ),
    scheduledFor:
      raw.scheduledFor === null
        ? null
        : requireDate(raw.scheduledFor, `cards[${index}].scheduledFor`),
  };
}

function parseExample(value: unknown, index: number): Example {
  const raw = requireRecord(value, `examples[${index}]`);
  const source = requireString(raw.source, `examples[${index}].source`);
  if (source !== "tatoeba" && source !== "user") {
    throw new InvalidSnapshotError(`examples[${index}].source is not supported.`);
  }
  return {
    id: requireString(raw.id, `examples[${index}].id`),
    cardId: requireString(raw.cardId, `examples[${index}].cardId`),
    text: requireString(raw.text, `examples[${index}].text`),
    source,
  };
}

function parseAttempt(value: unknown, index: number): DistillationAttempt {
  const raw = requireRecord(value, `attempts[${index}]`);
  const previousStatus = requireString(
    raw.previousStatus,
    `attempts[${index}].previousStatus`,
  ) as DistillableStatus;
  if (!DISTILLABLE_STATUSES.includes(previousStatus)) {
    throw new InvalidSnapshotError(
      `attempts[${index}].previousStatus is not supported.`,
    );
  }
  const resultingStatus = requireString(
    raw.resultingStatus,
    `attempts[${index}].resultingStatus`,
  ) as CardStatus;
  if (!CARD_STATUSES.includes(resultingStatus)) {
    throw new InvalidSnapshotError(
      `attempts[${index}].resultingStatus is not supported.`,
    );
  }
  return {
    id: requireString(raw.id, `attempts[${index}].id`),
    cardId: requireString(raw.cardId, `attempts[${index}].cardId`),
    attemptedAt: requireDate(raw.attemptedAt, `attempts[${index}].attemptedAt`),
    userAnswer: requireString(raw.userAnswer, `attempts[${index}].userAnswer`, {
      allowEmpty: true,
    }),
    expectedAnswer: requireString(
      raw.expectedAnswer,
      `attempts[${index}].expectedAnswer`,
    ),
    isCorrect: requireBoolean(raw.isCorrect, `attempts[${index}].isCorrect`),
    previousStatus,
    resultingStatus,
  };
}

function rejectDuplicateIds<T extends { id: string }>(
  records: T[],
  label: string,
): void {
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) {
      throw new InvalidSnapshotError(`${label} contains a duplicate id.`);
    }
    ids.add(record.id);
  }
}

function migrateSnapshot(input: Record<string, unknown>): Record<string, unknown> {
  if (input.schemaVersion !== MIN_SNAPSHOT_SCHEMA_VERSION) {
    return input;
  }

  const payload = requireRecord(input.payload, "payload");
  const settings = requireRecord(payload.settings, "payload.settings");
  return {
    ...input,
    schemaVersion: 1,
    payload: {
      ...payload,
      settings: {
        ...settings,
        exampleSelectionMode:
          settings.exampleSelectionMode ?? DEFAULT_SETTINGS.exampleSelectionMode,
      },
    },
  };
}

export function parseSnapshot(input: unknown): Snapshot {
  const raw = requireRecord(input, "The export");
  if (
    typeof raw.schemaVersion !== "number" ||
    !Number.isInteger(raw.schemaVersion) ||
    raw.schemaVersion < 0
  ) {
    throw new InvalidSnapshotError("The export has an invalid schema version.");
  }
  if (raw.schemaVersion > SNAPSHOT_SCHEMA_VERSION) {
    throw new InvalidSnapshotError(
      `This export uses schema version ${raw.schemaVersion}, but this app supports up to ${SNAPSHOT_SCHEMA_VERSION}.`,
    );
  }
  if (raw.schemaVersion < MIN_SNAPSHOT_SCHEMA_VERSION) {
    throw new InvalidSnapshotError("This export schema version is not supported.");
  }

  const migrated = migrateSnapshot(raw);
  const payloadRaw = requireRecord(migrated.payload, "payload");
  const settings = parseSettings(payloadRaw.settings);
  const cards = requireArray(payloadRaw.cards, "payload.cards").map(parseCard);
  const examples = requireArray(payloadRaw.examples, "payload.examples").map(
    parseExample,
  );
  const attempts = requireArray(payloadRaw.attempts, "payload.attempts").map(
    parseAttempt,
  );

  rejectDuplicateIds(cards, "payload.cards");
  rejectDuplicateIds(examples, "payload.examples");
  rejectDuplicateIds(attempts, "payload.attempts");

  const cardIds = new Set(cards.map((card) => card.id));

  for (const example of examples) {
    if (!cardIds.has(example.cardId)) {
      throw new InvalidSnapshotError(
        `Example ${example.id} references a missing card.`,
      );
    }
  }
  for (const attempt of attempts) {
    if (!cardIds.has(attempt.cardId)) {
      throw new InvalidSnapshotError(
        `Attempt ${attempt.id} references a missing card.`,
      );
    }
  }

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: requireDate(migrated.exportedAt, "exportedAt"),
    appVersion: requireString(migrated.appVersion, "appVersion"),
    payload: { settings, cards, examples, attempts },
  };
}

export function parseSnapshotJson(text: string): Snapshot {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new InvalidSnapshotError("The selected file is not valid JSON.");
  }
  return parseSnapshot(value);
}

export function previewSnapshot(snapshot: Snapshot): SnapshotCounts {
  return {
    settings: 1,
    cards: snapshot.payload.cards.length,
    examples: snapshot.payload.examples.length,
    attempts: snapshot.payload.attempts.length,
  };
}

export async function buildSnapshot(
  database: GoldlistDatabase,
  now: Date = new Date(),
): Promise<Snapshot> {
  const [settings, cards, examples, attempts] = await Promise.all([
    readSettings(database),
    database.cards.toArray(),
    database.examples.toArray(),
    database.attempts.toArray(),
  ]);

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    appVersion: __APP_VERSION__,
    payload: { settings, cards, examples, attempts },
  };
}

function sameSettings(a: Settings, b: Settings): boolean {
  return (
    a.nativeLanguage === b.nativeLanguage &&
    a.targetLanguage === b.targetLanguage &&
    a.cutoffTime === b.cutoffTime &&
    a.freezeDays === b.freezeDays &&
    a.theme === b.theme &&
    a.exampleSelectionMode === b.exampleSelectionMode &&
    a.onboardingCompleted === b.onboardingCompleted
  );
}

async function mergeSnapshot(
  database: GoldlistDatabase,
  snapshot: Snapshot,
): Promise<ImportResult> {
  return database.transaction(
    "rw",
    database.settings,
    database.cards,
    database.examples,
    database.attempts,
    async () => {
      const imported = zeroCounts();
      const skipped = zeroCounts();
      const currentSettings = await readSettings(database);

      if (sameSettings(currentSettings, DEFAULT_SETTINGS)) {
        await database.settings.put(snapshot.payload.settings);
        imported.settings = 1;
      } else {
        skipped.settings = 1;
      }

      const existingCards = await database.cards.toArray();
      const existingCardIds = new Set(existingCards.map((card) => card.id));
      const existingWordKeys = new Set(existingCards.map((card) => card.wordKey));
      const cardIds = new Set(existingCardIds);
      const skippedCardIds = new Set<string>();
      const importedCards: Card[] = [];

      for (const card of snapshot.payload.cards) {
        const key = wordKey(card.word);
        if (
          existingCardIds.has(card.id) ||
          existingWordKeys.has(key) ||
          cardIds.has(card.id)
        ) {
          skipped.cards += 1;
          skippedCardIds.add(card.id);
          continue;
        }
        const next = { ...card, wordKey: key };
        existingCardIds.add(card.id);
        existingWordKeys.add(key);
        cardIds.add(card.id);
        importedCards.push(next);
      }

      const existingExamples = await database.examples.toArray();
      const existingExampleIds = new Set(
        existingExamples.map((example) => example.id),
      );
      const importedExamples: Example[] = [];
      for (const example of snapshot.payload.examples) {
        if (
          skippedCardIds.has(example.cardId) ||
          !cardIds.has(example.cardId) ||
          existingExampleIds.has(example.id)
        ) {
          skipped.examples += 1;
          continue;
        }
        existingExampleIds.add(example.id);
        importedExamples.push(example);
      }

      const existingAttempts = await database.attempts.toArray();
      const existingAttemptIds = new Set(
        existingAttempts.map((attempt) => attempt.id),
      );
      const importedAttempts: DistillationAttempt[] = [];
      for (const attempt of snapshot.payload.attempts) {
        if (
          skippedCardIds.has(attempt.cardId) ||
          !cardIds.has(attempt.cardId) ||
          existingAttemptIds.has(attempt.id)
        ) {
          skipped.attempts += 1;
          continue;
        }
        existingAttemptIds.add(attempt.id);
        importedAttempts.push(attempt);
      }

      if (importedCards.length > 0) {
        await database.cards.bulkAdd(importedCards);
      }
      if (importedExamples.length > 0) {
        await database.examples.bulkAdd(importedExamples);
      }
      if (importedAttempts.length > 0) {
        await database.attempts.bulkAdd(importedAttempts);
      }

      imported.cards = importedCards.length;
      imported.examples = importedExamples.length;
      imported.attempts = importedAttempts.length;
      return { imported, skipped };
    },
  );
}

async function replaceSnapshot(
  database: GoldlistDatabase,
  snapshot: Snapshot,
  beforeReplace?: (backup: Snapshot) => Promise<void>,
): Promise<ImportResult> {
  if (beforeReplace) {
    const backup = await buildSnapshot(database);
    await beforeReplace(backup);
  }

  return database.transaction(
    "rw",
    database.settings,
    database.cards,
    database.examples,
    database.attempts,
    async () => {
      await database.settings.clear();
      await database.cards.clear();
      await database.examples.clear();
      await database.attempts.clear();

      await database.settings.put(snapshot.payload.settings);
      if (snapshot.payload.cards.length > 0) {
        await database.cards.bulkAdd(snapshot.payload.cards);
      }
      if (snapshot.payload.examples.length > 0) {
        await database.examples.bulkAdd(snapshot.payload.examples);
      }
      if (snapshot.payload.attempts.length > 0) {
        await database.attempts.bulkAdd(snapshot.payload.attempts);
      }

      return {
        imported: {
          ...previewSnapshot(snapshot),
        },
        skipped: zeroCounts(),
      };
    },
  );
}

export async function importSnapshot(
  database: GoldlistDatabase,
  snapshot: Snapshot,
  mode: ImportMode,
  options: { beforeReplace?: (backup: Snapshot) => Promise<void> } = {},
): Promise<ImportResult> {
  return mode === "replace"
    ? replaceSnapshot(database, snapshot, options.beforeReplace)
    : mergeSnapshot(database, snapshot);
}
