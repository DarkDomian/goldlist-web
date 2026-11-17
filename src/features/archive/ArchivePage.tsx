import { useLiveQuery } from "dexie-react-hooks";
import { listCardsWithExamples } from "@/data/cardRepository";
import { hasArchiveContent, selectArchive } from "@/domain/selectors";
import { useServices } from "@/services/ServicesContext";
import { ArchiveChip } from "@/ui/ArchiveChip";
import { WaitingCard } from "@/ui/CardView";
import { EmptyState } from "@/ui/EmptyState";

export default function ArchivePage() {
  const { database } = useServices();
  const cards = useLiveQuery(() => listCardsWithExamples(database), [database]);

  if (!cards) {
    return (
      <div className="page">
        <p role="status">Loading your archive…</p>
      </div>
    );
  }

  const blocks = selectArchive(cards);

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Archive</p>
        <h1>Everything you have gathered</h1>
        <p className="lede">
          Learned words, words you let go, and the quiet cards still resting.
        </p>
      </header>

      {!hasArchiveContent(blocks) ? (
        <EmptyState
          title="The archive is empty"
          description="Cards appear here after their first daily cutoff. Add a word today to begin."
        />
      ) : (
        <div className="archive">
          {blocks.learned.length > 0 ? (
            <section className="archive__block" aria-labelledby="learned-heading">
              <div className="archive__heading">
                <h2 id="learned-heading">Learned</h2>
                <span>{blocks.learned.length}</span>
              </div>
              <div className="archive-chip-list">
                {blocks.learned.map((card) => (
                  <ArchiveChip key={card.id} card={card} />
                ))}
              </div>
            </section>
          ) : null}

          {blocks.unlearned.length > 0 ? (
            <section className="archive__block" aria-labelledby="unlearned-heading">
              <div className="archive__heading">
                <h2 id="unlearned-heading">Unlearned</h2>
                <span>{blocks.unlearned.length}</span>
              </div>
              <div className="archive-chip-list">
                {blocks.unlearned.map((card) => (
                  <ArchiveChip key={card.id} card={card} />
                ))}
              </div>
            </section>
          ) : null}

          {blocks.waiting.length > 0 ? (
            <section className="archive__block" aria-labelledby="waiting-heading">
              <div className="archive__heading">
                <h2 id="waiting-heading">Waiting</h2>
                <span>{blocks.waiting.length}</span>
              </div>
              <div className="waiting-chip-list">
                {blocks.waiting.map((card) => (
                  <WaitingCard key={card.id} status={card.status} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
