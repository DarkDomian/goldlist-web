import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listCardsWithExamples } from "@/data/cardRepository";
import { selectCurrentDay } from "@/domain/selectors";
import { useServices } from "@/services/ServicesContext";
import { AddCardButton } from "@/ui/AddCardButton";
import { CardView } from "@/ui/CardView";
import { EmptyState } from "@/ui/EmptyState";
import { AddCardDialog } from "@/features/add-card/AddCardDialog";

export default function TodayPage() {
  const { database } = useServices();
  const cards = useLiveQuery(() => listCardsWithExamples(database), [database]);
  const [adding, setAdding] = useState(false);

  if (!cards) {
    return (
      <div className="page">
        <p role="status">Loading your day…</p>
      </div>
    );
  }

  const todaysCards = selectCurrentDay(cards);

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Current Day</p>
        <h1>Words from today</h1>
        <p className="lede">
          Add words as you meet them. At midnight they move into the archive to rest.
        </p>
      </header>

      <AddCardButton onClick={() => setAdding(true)} />

      {todaysCards.length === 0 ? (
        <EmptyState
          title="A blank page"
          description="Add your first word and let the notebook do the quiet work."
        />
      ) : (
        <div className="card-list">
          {todaysCards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              examples={card.examples}
              to={`/card/${card.id}`}
            />
          ))}
        </div>
      )}

      {adding ? <AddCardDialog open onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
