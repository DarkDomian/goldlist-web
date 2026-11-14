import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listCardsWithExamples, submitDistillation } from "@/data/cardRepository";
import { selectDue } from "@/domain/selectors";
import type { CardWithExamples } from "@/domain/types";
import { useServices } from "@/services/ServicesContext";
import { CardView } from "@/ui/CardView";
import { EmptyState } from "@/ui/EmptyState";
import { useNow } from "@/ui/useNow";

interface Feedback {
  card: CardWithExamples;
  answer: string;
  isCorrect: boolean;
}

export default function DistillationPage() {
  const { database, mutex } = useServices();
  const cards = useLiveQuery(() => listCardsWithExamples(database), [database]);
  const now = useNow();
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cards) {
    return (
      <div className="page">
        <p role="status">Loading distillations…</p>
      </div>
    );
  }

  const due = selectDue(cards, now);
  const current = due[0];

  const submit = async () => {
    if (!current || !answer.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await mutex.run(() =>
        submitDistillation(database, current.id, answer, new Date()),
      );
      setFeedback({
        card: current,
        answer,
        isCorrect: result.isCorrect,
      });
      setAnswer("");
    } catch {
      setError("Could not save this attempt. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (feedback) {
    return (
      <div className="page">
        <header className="page-header">
          <p className="eyebrow">Distillation</p>
          <h1>{feedback.isCorrect ? "Learned." : "Not yet."}</h1>
          <p className="lede">
            {feedback.isCorrect
              ? "You recalled it. This card rests in your learned archive now."
              : "It will come back after a rest. Seeing the answer again is part of the method."}
          </p>
        </header>

        <CardView card={feedback.card} examples={feedback.card.examples} />
        <div className={`feedback feedback--${feedback.isCorrect ? "good" : "soft"}`}>
          <p>
            <strong>Your answer:</strong> {feedback.answer || "—"}
          </p>
          <p>
            <strong>Translation:</strong> {feedback.card.translation}
          </p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button button--primary"
            onClick={() => setFeedback(null)}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="page">
        <header className="page-header">
          <p className="eyebrow">Distillation</p>
          <h1>Nothing due right now</h1>
          <p className="lede">
            Cards appear here after their 14-day rest. Come back when the notebook calls.
          </p>
        </header>
        <EmptyState
          title="All quiet"
          description="Keep adding words. The next batch will be ready at local midnight on its due day."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Distillation</p>
        <h1>Recall the Russian</h1>
        <p className="lede">
          {due.length} {due.length === 1 ? "card is" : "cards are"} due. The translation stays
          hidden until you answer.
        </p>
      </header>

      <CardView card={current} examples={current.examples} showTranslation={false} />

      <form
        className="answer-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="field">
          <span>Your Russian translation</span>
          <input
            autoFocus
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="введите перевод"
            disabled={submitting}
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="button button--primary button--wide"
          disabled={submitting || !answer.trim()}
        >
          {submitting ? "Checking…" : "Check answer"}
        </button>
      </form>
    </div>
  );
}
