import { useState, useSyncExternalStore } from "react";
import { createCard, findCardByWord } from "@/data/cardRepository";
import { DuplicateWordError } from "@/data/errors";
import type { ExampleDraft, ExampleSelectionMode } from "@/domain/types";
import { useServices } from "@/services/ServicesContext";
import { selectExamples } from "@/services/tatoeba";
import { TranslationStatusBar } from "@/ui/TranslationStatusBar";

type Phase = "idle" | "translating" | "ready" | "manual" | "saving";

function sameExampleText(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("en") === b.trim().toLocaleLowerCase("en");
}

function sameExample(a: ExampleDraft, b: ExampleDraft): boolean {
  return a.source === b.source && sameExampleText(a.text, b.text);
}

export function AddCardDialog({
  open,
  onClose,
  exampleSelectionMode = "auto",
}: {
  open: boolean;
  onClose: () => void;
  exampleSelectionMode?: ExampleSelectionMode;
}) {
  const { database, translation, examples: fetchExampleCandidates } = useServices();
  const [word, setWord] = useState("");
  const [translationText, setTranslationText] = useState("");
  const [examples, setExamples] = useState<ExampleDraft[]>([]);
  const [candidates, setCandidates] = useState<ExampleDraft[]>([]);
  const [customExample, setCustomExample] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const status = useSyncExternalStore(
    translation.subscribeStatus,
    translation.getStatus,
  );
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
    setCandidates([]);
    setExamples([]);

    const existing = await findCardByWord(database, trimmed).catch(() => undefined);
    if (existing) {
      setDuplicate(true);
      setPhase("idle");
      return;
    }

    const examplesPromise = fetchExampleCandidates(trimmed).catch(
      () => [] as ExampleDraft[],
    );
    let translated: string | null = null;
    let translationError = false;

    try {
      translated = await translation.translate(trimmed);
    } catch {
      translationError = true;
    }

    const fetchedCandidates = await examplesPromise;
    setCandidates(fetchedCandidates);

    if (exampleSelectionMode === "auto") {
      const selected = new Set(
        selectExamples(
          fetchedCandidates.map((candidate) => candidate.text),
          trimmed,
        ),
      );
      setExamples(fetchedCandidates.filter((candidate) => selected.has(candidate.text)));
    }

    if (translationError || !translated) {
      setMessage("Automatic translation failed. Type the Russian translation to continue.");
      setPhase("manual");
      return;
    }

    setTranslationText(translated);
    setPhase("ready");
  };

  const toggleCandidate = (candidate: ExampleDraft) => {
    setMessage(null);
    setExamples((current) => {
      const alreadySelected = current.some(
        (example) => sameExample(example, candidate),
      );
      if (alreadySelected) {
        return current.filter((example) => !sameExample(example, candidate));
      }

      const selectedTatoeba = current.filter(
        (example) => example.source === "tatoeba",
      ).length;
      if (selectedTatoeba >= 3) {
        setMessage("You can choose up to three Tatoeba examples.");
        return current;
      }

      return [...current, candidate];
    });
  };

  const addCustomExample = () => {
    const text = customExample.trim();
    if (!text) {
      setMessage("Enter an example sentence.");
      return;
    }
    if ([...examples, ...candidates].some((example) => sameExampleText(example.text, text))) {
      setMessage("That example already exists.");
      return;
    }

    setExamples((current) => [...current, { text, source: "user" }]);
    setCustomExample("");
    setMessage(null);
  };

  const removeExample = (target: ExampleDraft) => {
    setExamples((current) =>
      current.filter((example) => !sameExample(example, target)),
    );
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

  const editing = phase === "ready" || phase === "manual" || phase === "saving";

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
            if (editing) {
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

          {phase === "translating" && status.phase !== "ready" ? (
            <TranslationStatusBar status={status} />
          ) : null}

          {editing ? (
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

          {editing && exampleSelectionMode === "manual" ? (
            <div className="add-card__candidates">
              <p className="eyebrow">Choose examples</p>
              <p className="hint">
                Choose your own examples for better control. You can select up to three.
              </p>
              {candidates.length > 0 ? (
                <div
                  className="add-card__candidate-list"
                  role="group"
                  aria-label="Example candidates"
                >
                  {candidates.map((candidate) => {
                    const selected = examples.some((example) =>
                      sameExample(example, candidate),
                    );
                    return (
                      <button
                        key={candidate.text}
                        type="button"
                        className={`candidate${selected ? " candidate--selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => toggleCandidate(candidate)}
                        disabled={phase === "saving"}
                      >
                        {candidate.text}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="hint">No Tatoeba candidates were found. You can still add your own.</p>
              )}
            </div>
          ) : null}

          {editing ? (
            <div className="add-card__custom">
              <label className="field">
                <span>Add your own example</span>
                <input
                  value={customExample}
                  onChange={(event) => setCustomExample(event.target.value)}
                  placeholder="Write an English sentence"
                  disabled={phase === "saving"}
                />
              </label>
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={addCustomExample}
                disabled={phase === "saving"}
              >
                Add example
              </button>
            </div>
          ) : null}

          {examples.length > 0 ? (
            <div className="add-card__examples">
              <p className="eyebrow">Selected examples</p>
              <ul>
                {examples.map((example) => (
                  <li key={`${example.source}-${example.text}`}>
                    <span>{example.text}</span>
                    <button
                      type="button"
                      className="example-remove"
                      onClick={() => removeExample(example)}
                      aria-label={`Remove example: ${example.text}`}
                      disabled={phase === "saving"}
                    >
                      ×
                    </button>
                  </li>
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
              {editing
                ? phase === "saving"
                  ? "Saving…"
                  : "Save card"
                : "Translate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
