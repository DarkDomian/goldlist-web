import { Link } from "react-router-dom";
import type { Card } from "@/domain/types";

export function ArchiveChip({ card }: { card: Card }) {
  return (
    <Link
      className="archive-chip"
      to={`/card/${card.id}`}
      aria-label={`Open card ${card.word}`}
    >
      {card.word}
    </Link>
  );
}
