import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteCardCascade,
  getCardWithExamples,
  relearnCard,
} from "@/data/cardRepository";
import { isDistillable } from "@/domain/types";
import { useServices } from "@/services/ServicesContext";
import { CardView } from "@/ui/CardView";
import { ConfirmDialog } from "@/ui/ConfirmDialog";
import { EmptyState } from "@/ui/EmptyState";

export default function CardDetailPage() {
  const { id = "" } = useParams();
  const { database } = useServices();
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = useLiveQuery(async () => {
    const found = await getCardWithExamples(database, id);
    return found ?? null;
  }, [database, id]);

  if (card === undefined) {
    return (
      <div className="page">
        <p role="status">Loading card…</p>
      </div>
    );
  }

  if (card === null) {
    return (
      <div className="page">
        <EmptyState title="Card not found" description="This card may have been deleted." />
      </div>
    );
  }

  const archived = card.status === "learned" || card.status === "unlearned";
  const showTranslation = card.status !== "learned";

  const relearn = async () => {
    setError(null);
    try {
      await relearnCard(database, card.id);
      navigate("/today");
    } catch {
      setError("Could not re-learn this card.");
    }
  };

  const remove = async () => {
    setError(null);
    try {
      await deleteCardCascade(database, card.id);
      navigate("/archive");
    } catch {
      setError("Could not delete this card.");
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Card</p>
        <h1>{card.word}</h1>
        <p className="lede">
          {isDistillable(card.status)
            ? card.scheduledFor
              ? "Resting until its next distillation."
              : "In Current Day, waiting for the midnight cutoff."
            : card.status === "learned"
              ? "Learned and resting in your archive."
              : "Let go. Re-learn it whenever you want another pass."}
        </p>
      </header>

      <CardView card={card} examples={card.examples} showTranslation={showTranslation} />

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="button-row button-row--stack">
        {archived ? (
          <button type="button" className="button button--primary" onClick={() => void relearn()}>
            Re-learn this card
          </button>
        ) : null}
        <button
          type="button"
          className="button button--danger-ghost"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete card
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this card?"
        description="This removes the card, its examples, and its history permanently."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
