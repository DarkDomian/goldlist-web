import type { Card } from "./types";

export const FREEZE_DAYS = 14;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export function dueAt(base: Date): Date {
  return addCalendarDays(startOfDay(base), FREEZE_DAYS);
}

export function isDue(card: Card, now: Date = new Date()): boolean {
  return (
    card.scheduledFor !== null &&
    new Date(card.scheduledFor).getTime() <= now.getTime()
  );
}

export function needsCutoff(card: Card, now: Date = new Date()): boolean {
  return (
    card.status === "copper" &&
    card.scheduledFor === null &&
    startOfDay(new Date(card.createdAt)).getTime() < startOfDay(now).getTime()
  );
}

export function processCutoffs(cards: Card[], now: Date = new Date()): Card[] {
  return cards.filter((card) => needsCutoff(card, now)).map((card) => ({
    ...card,
    scheduledFor: dueAt(new Date(card.createdAt)).toISOString(),
    statusChangedAt: now.toISOString(),
  }));
}

export function nextLocalMidnight(now: Date = new Date()): Date {
  return addCalendarDays(startOfDay(now), 1);
}
