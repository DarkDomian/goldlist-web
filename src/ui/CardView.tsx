import { Link } from "react-router-dom";
import type { Card, CardStatus, Example } from "@/domain/types";
import { StatusIndicator, statusLabel } from "./StatusIndicator";

interface CardViewProps {
  card: Card;
  examples?: Example[];
  showTranslation?: boolean;
  to?: string;
  actions?: React.ReactNode;
}

export function CardView({
  card,
  examples = [],
  showTranslation = true,
  to,
  actions,
}: CardViewProps) {
  const content = (
    <>
      <StatusIndicator status={card.status} />
      <h2 className="card__word">{card.word}</h2>
      {showTranslation ? <p className="card__translation">{card.translation}</p> : null}
      {examples.length > 0 ? (
        <ul className="card__examples" aria-label="Examples">
          {examples.map((example) => (
            <li key={example.id}>{example.text}</li>
          ))}
        </ul>
      ) : null}
    </>
  );

  return (
    <article className="card">
      {to ? (
        <Link className="card__body" to={to} aria-label={`Open card ${card.word}`}>
          {content}
        </Link>
      ) : (
        <div className="card__body">{content}</div>
      )}
      {actions ? <div className="card__actions">{actions}</div> : null}
    </article>
  );
}

export function WaitingCard({ status }: { status: CardStatus }) {
  return (
    <div
      className={`card card--waiting card--waiting-${status}`}
      role="img"
      aria-label={`Waiting ${statusLabel(status).toLowerCase()} card`}
    >
      <span className="visually-hidden">{statusLabel(status)} waiting card</span>
    </div>
  );
}
