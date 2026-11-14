import { createId } from "./ids";
import { CardNotFoundError, DuplicateWordError } from "./errors";
import type { GoldlistDatabase } from "./db";
import { wordKey } from "@/domain/normalization";
import { transitionCard } from "@/domain/transitions";
import type {
  Card,
  CardWithExamples,
  CreateCardInput,
  DistillationAttempt,
  Example,
  ExampleDraft,
  DistillableStatus,
} from "@/domain/types";
import { isDistillable } from "@/domain/types";
import { isAnswerCorrect } from "@/domain/normalization";

export async function findCardByWord(
  database: GoldlistDatabase,
  word: string,
): Promise<Card | undefined> {
  return database.cards.where("wordKey").equals(wordKey(word)).first();
}

export async function createCard(
  database: GoldlistDatabase,
  input: CreateCardInput,
  now: Date = new Date(),
): Promise<CardWithExamples> {
  const key = wordKey(input.word);
  const existing = await database.cards.where("wordKey").equals(key).first();
  if (existing) {
    throw new DuplicateWordError();
  }

  const timestamp = now.toISOString();
  const card: Card = {
    id: createId(),
    word: input.word.trim(),
    wordKey: key,
    translation: input.translation.trim(),
    status: "copper",
    createdAt: timestamp,
    statusChangedAt: timestamp,
    scheduledFor: null,
  };

  const examples: Example[] = input.examples.map((example) => ({
    id: createId(),
    cardId: card.id,
    text: example.text,
    source: example.source,
  }));

  try {
    await database.transaction("rw", database.cards, database.examples, async () => {
      await database.cards.add(card);
      if (examples.length > 0) {
        await database.examples.bulkAdd(examples);
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ConstraintError") {
      throw new DuplicateWordError();
    }
    throw error;
  }

  return { ...card, examples };
}

export async function getCard(
  database: GoldlistDatabase,
  id: string,
): Promise<Card | undefined> {
  return database.cards.get(id);
}

export async function getCardWithExamples(
  database: GoldlistDatabase,
  id: string,
): Promise<CardWithExamples | undefined> {
  const card = await database.cards.get(id);
  if (!card) {
    return undefined;
  }

  const examples = await database.examples.where("cardId").equals(id).toArray();
  return { ...card, examples };
}

export async function listCards(database: GoldlistDatabase): Promise<Card[]> {
  return database.cards.toArray();
}

export async function listCardsWithExamples(
  database: GoldlistDatabase,
): Promise<CardWithExamples[]> {
  const [cards, examples] = await Promise.all([
    database.cards.toArray(),
    database.examples.toArray(),
  ]);
  const byCard = new Map<string, Example[]>();

  for (const example of examples) {
    const current = byCard.get(example.cardId) ?? [];
    current.push(example);
    byCard.set(example.cardId, current);
  }

  return cards.map((card) => ({ ...card, examples: byCard.get(card.id) ?? [] }));
}

export async function updateCardTranslation(
  database: GoldlistDatabase,
  id: string,
  translation: string,
  now: Date = new Date(),
): Promise<Card> {
  const card = await database.cards.get(id);
  if (!card) {
    throw new CardNotFoundError();
  }

  const next: Card = {
    ...card,
    translation: translation.trim(),
    statusChangedAt: now.toISOString(),
  };
  await database.cards.put(next);
  return next;
}

export async function relearnCard(
  database: GoldlistDatabase,
  id: string,
  now: Date = new Date(),
): Promise<Card> {
  const card = await database.cards.get(id);
  if (!card) {
    throw new CardNotFoundError();
  }

  const next: Card = {
    ...card,
    status: "copper",
    scheduledFor: null,
    statusChangedAt: now.toISOString(),
  };
  await database.cards.put(next);
  return next;
}

export async function deleteCardCascade(
  database: GoldlistDatabase,
  id: string,
): Promise<void> {
  await database.transaction(
    "rw",
    database.cards,
    database.examples,
    database.attempts,
    async () => {
      await database.examples.where("cardId").equals(id).delete();
      await database.attempts.where("cardId").equals(id).delete();
      await database.cards.delete(id);
    },
  );
}

export async function getAttemptsForCard(
  database: GoldlistDatabase,
  cardId: string,
): Promise<DistillationAttempt[]> {
  return database.attempts.where("cardId").equals(cardId).sortBy("attemptedAt");
}

export interface DistillationResult {
  card: Card;
  attempt: DistillationAttempt;
  isCorrect: boolean;
}

export async function commitDistillation(
  database: GoldlistDatabase,
  updatedCard: Card,
  attempt: DistillationAttempt,
): Promise<void> {
  await database.transaction("rw", database.cards, database.attempts, async () => {
    await database.attempts.add(attempt);
    const updated = await database.cards.update(updatedCard.id, updatedCard);
    if (!updated) {
      throw new CardNotFoundError();
    }
  });
}

export async function submitDistillation(
  database: GoldlistDatabase,
  cardId: string,
  answer: string,
  now: Date = new Date(),
): Promise<DistillationResult> {
  const card = await database.cards.get(cardId);
  if (!card) {
    throw new CardNotFoundError();
  }
  if (!isDistillable(card.status)) {
    throw new Error("Card is not available for distillation");
  }

  const status: DistillableStatus = card.status;
  const isCorrect = isAnswerCorrect(answer, card.translation);
  const transition = transitionCard(status, isCorrect, now);
  const timestamp = now.toISOString();
  const updatedCard: Card = {
    ...card,
    status: transition.status,
    scheduledFor: transition.scheduledFor,
    statusChangedAt: timestamp,
  };
  const attempt: DistillationAttempt = {
    id: createId(),
    cardId: card.id,
    attemptedAt: timestamp,
    userAnswer: answer,
    expectedAnswer: card.translation,
    isCorrect,
    previousStatus: status,
    resultingStatus: transition.status,
  };

  await commitDistillation(database, updatedCard, attempt);
  return { card: updatedCard, attempt, isCorrect };
}

export function createExampleDrafts(texts: string[]): ExampleDraft[] {
  return texts.map((text) => ({ text, source: "tatoeba" }));
}
