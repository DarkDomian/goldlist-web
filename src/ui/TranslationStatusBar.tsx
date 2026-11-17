import type { TranslationPhase, TranslationStatus } from "@/services/translation/types";

function phaseLabel(status: TranslationStatus): string {
  switch (status.phase) {
    case "queued":
      return "Preparing translation…";
    case "downloading":
      return "Downloading the translation model…";
    case "initializing":
      return status.message ?? "Initializing the translation model…";
    case "translating":
      return "Translating…";
    case "ready":
      return "Translation model ready.";
    case "error":
      return status.message ?? "Translation failed.";
  }
}

function percentFor(phase: TranslationPhase, progress: number | undefined): number {
  if (phase === "ready") {
    return 100;
  }
  return Math.min(100, Math.max(0, Math.round(progress ?? 0)));
}

export function TranslationStatusBar({ status }: { status: TranslationStatus }) {
  const percent = percentFor(status.phase, status.progress);

  return (
    <div className="translation-progress" role="status" aria-live="polite">
      <span className="translation-progress__percentage">{percent}%</span>
      <div
        className="translation-progress__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Translation model progress"
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>{phaseLabel(status)}</p>
    </div>
  );
}
