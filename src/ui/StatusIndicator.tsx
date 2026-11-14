import type { CardStatus } from "@/domain/types";

const LABELS: Record<CardStatus, string> = {
  copper: "Copper",
  silver: "Silver",
  gold: "Gold",
  learned: "Learned",
  unlearned: "Unlearned",
};

export function statusLabel(status: CardStatus): string {
  return LABELS[status];
}

export function StatusIndicator({
  status,
  showLabel = false,
}: {
  status: CardStatus;
  showLabel?: boolean;
}) {
  return (
    <span className={`status status--${status}`} role="img" aria-label={`Status: ${statusLabel(status)}`}>
      <span className="status__dot" aria-hidden="true" />
      {showLabel ? <span className="status__label">{statusLabel(status)}</span> : null}
    </span>
  );
}
