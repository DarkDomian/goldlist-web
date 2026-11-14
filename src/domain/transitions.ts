import { dueAt } from "./scheduling";
import type { CardStatus, DistillableStatus } from "./types";

export interface TransitionResult {
  status: CardStatus;
  scheduledFor: string | null;
}

export function transitionCard(
  status: DistillableStatus,
  isCorrect: boolean,
  attemptedAt: Date,
): TransitionResult {
  if (isCorrect) {
    return { status: "learned", scheduledFor: null };
  }

  if (status === "copper") {
    return { status: "silver", scheduledFor: dueAt(attemptedAt).toISOString() };
  }

  if (status === "silver") {
    return { status: "gold", scheduledFor: dueAt(attemptedAt).toISOString() };
  }

  return { status: "unlearned", scheduledFor: null };
}
