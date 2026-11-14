import { isDue } from "./scheduling";
import type { Card } from "./types";

export interface ArchiveBlocks<T extends Card = Card> {
  learned: T[];
  unlearned: T[];
  waiting: T[];
}

function byChangedDesc(a: Card, b: Card): number {
  return new Date(b.statusChangedAt).getTime() - new Date(a.statusChangedAt).getTime();
}

function byScheduledAsc(a: Card, b: Card): number {
  const aTime = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

export function selectCurrentDay<T extends Card>(cards: T[]): T[] {
  return cards
    .filter((card) => card.status === "copper" && card.scheduledFor === null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function selectWaiting<T extends Card>(cards: T[]): T[] {
  return cards
    .filter((card) => card.status !== "learned" && card.status !== "unlearned")
    .filter((card) => card.scheduledFor !== null);
}

export function selectDue<T extends Card>(cards: T[], now: Date = new Date()): T[] {
  return selectWaiting(cards).filter((card) => isDue(card, now)).sort(byScheduledAsc);
}

export function selectArchive<T extends Card>(cards: T[]): ArchiveBlocks<T> {
  return {
    learned: cards.filter((card) => card.status === "learned").sort(byChangedDesc),
    unlearned: cards.filter((card) => card.status === "unlearned").sort(byChangedDesc),
    waiting: selectWaiting(cards).sort(byScheduledAsc),
  };
}

export function hasArchiveContent(blocks: ArchiveBlocks): boolean {
  return blocks.learned.length > 0 || blocks.unlearned.length > 0 || blocks.waiting.length > 0;
}
