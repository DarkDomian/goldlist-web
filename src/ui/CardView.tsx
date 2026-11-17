import { Link } from "react-router-dom";
import { sortExamples } from "@/data/cardRepository";
import type { Card, CardStatus, Example } from "@/domain/types";
import { StatusIndicator, statusLabel } from "./StatusIndicator";
import { useOverflowFade } from "./useOverflowFade";

interface CardViewProps {
  card: Card;
  examples?: Example[];
  showTranslation?: boolean;
  to?: string;
  actions?: React.ReactNode;
  variant?: "preview" | "full";
}

export function CardView({
  card,
  examples = [],
  showTranslation = true,
  to,
  actions,
  variant = "full",
}: CardViewProps) {
  const preview = variant === "preview";
  const orderedExamples = sortExamples(examples);
  const { ref: contentRef, overflowing } = useOverflowFade<HTMLDivElement>(preview);

  const content = (
    <div
      ref={contentRef}
      className={`card__content${preview ? " card__content--preview" : ""}${
        overflowing ? " card__content--overflow" : ""
      }`}
    >
      <h2 className="card__word">{card.word}</h2>
      {showTranslation ? <p className="card__translation">{card.translation}</p> : null}
      {orderedExamples.length > 0 ? (
        <ul className="card__examples" aria-label="Examples">
          {orderedExamples.map((example) => (
            <li key={example.id}>{example.text}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    <article className={`card${preview ? " card--preview" : ""}`}>
      {to ? (
        <Link className="card__body" to={to} aria-label={`Open card ${card.word}`}>
          <StatusIndicator status={card.status} />
          {content}
        </Link>
      ) : (
        <div className="card__body">
          <StatusIndicator status={card.status} />
          {content}
        </div>
      )}
      {actions ? <div className="card__actions">{actions}</div> : null}
    </article>
  );
}

export function WaitingCard({ status }: { status: CardStatus }) {
  return (
    <div
      className={`waiting-chip waiting-chip--${status}`}
      role="img"
      aria-label={`Waiting ${statusLabel(status).toLowerCase()} card`}
    >
      <span aria-hidden="true">{statusLabel(status)}</span>
    </div>
  );
}
