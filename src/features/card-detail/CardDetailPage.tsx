import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import {
  addCustomExample,
  deleteCardCascade,
  deleteCustomExample,
  getCardWithExamples,
  relearnCard,
  sortExamples,
  updateCustomExample,
} from "@/data/cardRepository";
import {
  DuplicateExampleError,
  EmptyExampleError,
} from "@/data/errors";
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
  const [newExample, setNewExample] = useState("");
  const [editingExampleId, setEditingExampleId] = useState<string | null>(null);
  const [editingExampleText, setEditingExampleText] = useState("");
  const [exampleError, setExampleError] = useState<string | null>(null);
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

  const exampleErrorMessage = (reason: unknown): string => {
    if (reason instanceof EmptyExampleError) {
      return "An example cannot be empty.";
    }
    if (reason instanceof DuplicateExampleError) {
      return "That example already exists.";
    }
    return "Could not save the example.";
  };

  const addExample = async () => {
    setExampleError(null);
    try {
      await addCustomExample(database, card.id, newExample);
      setNewExample("");
    } catch (reason) {
      setExampleError(exampleErrorMessage(reason));
    }
  };

  const startEditing = (id: string, text: string) => {
    setExampleError(null);
    setEditingExampleId(id);
    setEditingExampleText(text);
  };

  const saveEditedExample = async () => {
    if (!editingExampleId) {
      return;
    }
    setExampleError(null);
    try {
      await updateCustomExample(database, editingExampleId, editingExampleText);
      setEditingExampleId(null);
      setEditingExampleText("");
    } catch (reason) {
      setExampleError(exampleErrorMessage(reason));
    }
  };

  const removeExample = async (id: string) => {
    setExampleError(null);
    try {
      await deleteCustomExample(database, id);
      if (editingExampleId === id) {
        setEditingExampleId(null);
        setEditingExampleText("");
      }
    } catch {
      setExampleError("Could not delete the example.");
    }
  };

  const orderedExamples = sortExamples(card.examples);

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

      <CardView card={card} examples={[]} showTranslation={showTranslation} />

      <section className="settings-section" aria-labelledby="examples-heading">
        <h2 id="examples-heading">Examples</h2>
        {orderedExamples.length > 0 ? (
          <ul className="detail-examples">
            {orderedExamples.map((example) => (
              <li key={example.id}>
                {editingExampleId === example.id ? (
                  <div className="detail-examples__editor">
                    <label className="field">
                      <span>Edit example</span>
                      <input
                        value={editingExampleText}
                        onChange={(event) => setEditingExampleText(event.target.value)}
                        aria-label="Example text"
                      />
                    </label>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button--ghost button--small"
                        onClick={() => {
                          setEditingExampleId(null);
                          setEditingExampleText("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="button button--primary button--small"
                        onClick={() => void saveEditedExample()}
                      >
                        Save example
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="detail-examples__text">
                      {example.text}
                      {example.source === "user" ? (
                        <span className="detail-examples__source">Custom</span>
                      ) : null}
                    </span>
                    {example.source === "user" ? (
                      <div className="detail-examples__actions">
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => startEditing(example.id, example.text)}
                          aria-label={`Edit example: ${example.text}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button--danger-ghost button--small"
                          onClick={() => void removeExample(example.id)}
                          aria-label={`Delete example: ${example.text}`}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">No examples yet.</p>
        )}

        <form
          className="detail-examples__form"
          onSubmit={(event) => {
            event.preventDefault();
            void addExample();
          }}
        >
          <label className="field">
            <span>Add a custom example</span>
            <input
              value={newExample}
              onChange={(event) => setNewExample(event.target.value)}
              placeholder="Write an English sentence"
            />
          </label>
          <button type="submit" className="button button--ghost button--small">
            Add example
          </button>
        </form>

        {exampleError ? (
          <p className="form-error" role="alert">
            {exampleError}
          </p>
        ) : null}
      </section>

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
