export type Theme = "light" | "dark" | "system";

export type ExampleSelectionMode = "auto" | "manual";

export type CardStatus = "copper" | "silver" | "gold" | "learned" | "unlearned";

export type DistillableStatus = "copper" | "silver" | "gold";

export interface Settings {
  id: "app";
  nativeLanguage: "ru";
  targetLanguage: "en";
  cutoffTime: "00:00";
  freezeDays: 14;
  theme: Theme;
  exampleSelectionMode: ExampleSelectionMode;
  onboardingCompleted: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  nativeLanguage: "ru",
  targetLanguage: "en",
  cutoffTime: "00:00",
  freezeDays: 14,
  theme: "light",
  exampleSelectionMode: "auto",
  onboardingCompleted: false,
};

export interface Card {
  id: string;
  word: string;
  wordKey: string;
  translation: string;
  status: CardStatus;
  createdAt: string;
  statusChangedAt: string;
  scheduledFor: string | null;
}

export interface Example {
  id: string;
  cardId: string;
  text: string;
  source: "tatoeba" | "user";
}

export interface CardWithExamples extends Card {
  examples: Example[];
}

export interface DistillationAttempt {
  id: string;
  cardId: string;
  attemptedAt: string;
  userAnswer: string;
  expectedAnswer: string;
  isCorrect: boolean;
  previousStatus: DistillableStatus;
  resultingStatus: CardStatus;
}

export interface TatoebaCacheEntry {
  queryKey: string;
  examples: string[];
  fetchedAt: string;
}

export interface ExampleDraft {
  text: string;
  source: "tatoeba" | "user";
}

export type CreateCardInput = {
  word: string;
  translation: string;
  examples: ExampleDraft[];
};

export function isDistillable(status: CardStatus): status is DistillableStatus {
  return status === "copper" || status === "silver" || status === "gold";
}
