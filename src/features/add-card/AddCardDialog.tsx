import { useState } from "react";
import { createCard, findCardByWord } from "@/data/cardRepository";
import { DuplicateWordError } from "@/data/errors";
import type { ExampleDraft } from "@/domain/types";
import { useServices } from "@/services/ServicesContext";
import type { TranslationProgress } from "@/services/translation/types";

type Phase = "idle" | "translating" | "ready" | "manual" | "saving";

function progressText(progress: TranslationProgress | null): string {
  if (!progress) {
    return "Preparing translation…";
  }
  if (progress.phase === "loading") {
    return "Loading the translation model…";
  }
  if (progress.phase === "downloading") {
    const percent =
      typeof progress.progress === "number" ? ` ${Math.round(progress.progress)}%` : "";
    return `Downloading the translation model${percent}…`;
  }
  if (progress.phase === "translating") {
    return "Translating…";
  }
  return "Preparing translation…";
}

export function AddCardDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { database, translation, examples: fetchExamples } = useServices();
  const [word, setWord] = useState("");
  const [translationText, setTranslationText] = useState("");
  const [examples, setExamples] = useState<ExampleDraft[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  if (!open) {
    return null;
  }

  const findTranslation = async () => {
    const trimmed = word.trim();
    if (!trimmed) {
      setMessage("Enter an English word or phrase.");
      return;
    }

    setMessage(null);
    setDuplicate(false);
    setPhase("translating");
    setProgress(null);

    const existing = await findCardByWord(database, trimmed).catch(() => undefined);
    if (existing) {
      setDuplicate(true);
      setPhase("idle");
      return;
    }

    const examplesPromise = fetchExamples(trimmed).catch(() => [] as ExampleDraft[]);
    let translated: string | null = null;
    let translationError = false;

    try {
      translated = await translation.translate(trimmed, setProgress);
    } catch {
      translationError = true;
    }

    const fetchedExamples = await examplesPromise;
    setExamples(fetchedExamples);

    if (translationError || !translated) {
      setMessage("Automatic translation failed. Type the Russian translation to continue.");
      setPhase("manual");
      return;
    }

    setTranslationText(translated);
    setPhase("ready");
  };

  const save = async () => {
    const trimmed = word.trim();
    if (!trimmed || !translationText.trim()) {
      setMessage("A word and a translation are both required.");
      return;
    }

    setPhase("saving");
    setMessage(null);
    try {
      await createCard(database, {
        word: trimmed,
        translation: translationText,
        examples,
      });
      onClose();
    } catch (error) {
      if (error instanceof DuplicateWordError) {
        setDuplicate(true);
        setPhase("idle");
        return;
      }
      setMessage("Could not save this card. Please try again.");
      setPhase("manual");
    }
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog dialog--sheet" role="dialog" aria-modal="true" aria-labelledby="add-card-title">
        <div className="dialog__header">
          <div>
            <p className="eyebrow">New word</p>
            <h2 id="add-card-title">Add to Current Day</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close add card">
            ×
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (phase === "ready" || phase === "manual") {
              void save();
            } else {
              void findTranslation();
            }
          }}
        >
          <label className="field">
            <span>English word or phrase</span>
            <input
              autoFocus
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="e.g. curious"
              disabled={phase === "translating" || phase === "saving"}
            />
          </label>

          {phase === "translating" ? (
            <div className="translation-progress" role="status" aria-live="polite">
              <div className="translation-progress__bar">
                <span style={{ width: `${Math.round(progress?.progress ?? 12)}%` }} />
              </div>
              <p>{progressText(progress)}</p>
            </div>
          ) : null}

          {phase === "ready" || phase === "manual" || phase === "saving" ? (
            <label className="field">
              <span>Russian translation</span>
              <input
                value={translationText}
                onChange={(event) => setTranslationText(event.target.value)}
                placeholder="введите перевод"
                disabled={phase === "saving"}
              />
            </label>
          ) : null}

          {examples.length > 0 ? (
            <div className="add-card__examples">
              <p className="eyebrow">Examples</p>
              <ul>
                {examples.map((example) => (
                  <li key={example.text}>{example.text}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {duplicate ? (
            <p className="form-error" role="alert">
              you already knew that
            </p>
          ) : null}
          {message ? (
            <p className="form-message" role="alert">
              {message}
            </p>
          ) : null}

          <div className="button-row">
            <button type="button" className="button button--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={phase === "translating" || phase === "saving"}
            >
              {phase === "ready" || phase === "manual"
                ? "Save card"
                : phase === "saving"
                  ? "Saving…"
                  : "Translate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
