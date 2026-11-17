import { useRef, useState } from "react";
import { useSettings } from "@/app/SettingsContext";
import {
  buildSnapshot,
  importSnapshot,
  parseSnapshotJson,
  previewSnapshot,
  type ImportMode,
  type Snapshot,
  type SnapshotCounts,
} from "@/data/portability";
import type { ExampleSelectionMode, Theme } from "@/domain/types";
import { useServices } from "@/services/ServicesContext";
import { downloadSnapshotFile } from "@/services/download";

const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

function countSummary(counts: SnapshotCounts): string {
  return `${counts.settings} settings, ${counts.cards} cards, ${counts.examples} examples, ${counts.attempts} attempts`;
}

export default function SettingsPage() {
  const { settings, setTheme, updateSettings } = useSettings();
  const { database } = useServices();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataBusy, setDataBusy] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    snapshot: Snapshot;
    counts: SnapshotCounts;
    filename: string;
  } | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const chooseTheme = async (theme: Theme) => {
    setSaving(true);
    setError(null);
    try {
      await setTheme(theme);
    } catch {
      setError("Could not save the theme.");
    } finally {
      setSaving(false);
    }
  };

  const chooseExampleMode = async (mode: ExampleSelectionMode) => {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({ exampleSelectionMode: mode });
    } catch {
      setError("Could not save the example selection mode.");
    } finally {
      setSaving(false);
    }
  };



  const exportData = async () => {
    setDataBusy(true);
    setDataError(null);
    setDataStatus(null);
    try {
      const snapshot = await buildSnapshot(database);
      downloadSnapshotFile(snapshot);
      setDataStatus(`Exported ${countSummary(previewSnapshot(snapshot))}.`);
    } catch {
      setDataError("Could not export your data. Please try again.");
    } finally {
      setDataBusy(false);
    }
  };

  const selectImportFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setDataBusy(true);
    setDataError(null);
    setDataStatus(null);
    setPending(null);
    setConfirmReplace(false);
    try {
      const snapshot = parseSnapshotJson(await file.text());
      setPending({
        snapshot,
        counts: previewSnapshot(snapshot),
        filename: file.name,
      });
    } catch (reason) {
      setDataError(
        reason instanceof Error ? reason.message : "Could not read that file.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const applyImport = async (mode: ImportMode) => {
    if (!pending) {
      return;
    }
    setDataBusy(true);
    setDataError(null);
    setDataStatus(null);
    try {
      const result = await importSnapshot(database, pending.snapshot, mode, {
        beforeReplace:
          mode === "replace"
            ? async (backup) => downloadSnapshotFile(backup)
            : undefined,
      });
      setDataStatus(
        `Imported ${countSummary(result.imported)}. Skipped ${countSummary(result.skipped)}.`,
      );
      setPending(null);
      setConfirmReplace(false);
    } catch (reason) {
      setDataError(
        reason instanceof Error ? reason.message : "Could not import that file.",
      );
    } finally {
      setDataBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Settings</p>
        <h1>Make it comfortable</h1>
        <p className="lede">A few quiet preferences. The language pair is fixed for now.</p>
      </header>

      <section className="settings-section" aria-labelledby="theme-heading">
        <h2 id="theme-heading">Theme</h2>
        <div className="theme-toggle theme-toggle--three" role="group" aria-label="Theme">
          {(["light", "dark", "system"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={`theme-toggle__option${settings.theme === theme ? " theme-toggle__option--active" : ""}`}
              aria-pressed={settings.theme === theme}
              onClick={() => void chooseTheme(theme)}
              disabled={saving}
            >
              {THEME_LABELS[theme]}
            </button>
          ))}
        </div>
        <p className="hint">
          System follows your device's light or dark preference and updates automatically.
        </p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="settings-section" aria-labelledby="examples-heading">
        <h2 id="examples-heading">Example selection</h2>
        <div
          className="theme-toggle"
          role="group"
          aria-label="Example selection"
        >
          {(["auto", "manual"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`theme-toggle__option${settings.exampleSelectionMode === mode ? " theme-toggle__option--active" : ""}`}
              aria-pressed={settings.exampleSelectionMode === mode}
              onClick={() => void chooseExampleMode(mode)}
              disabled={saving}
            >
              {mode === "auto" ? "Automatic" : "Manual"}
            </button>
          ))}
        </div>
        <p className="hint">
          Automatic adds the first relevant examples. Manual lets you choose up to three
          from Tatoeba.
        </p>
      </section>

      <section className="settings-section" aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <p className="hint">
          Export a JSON snapshot of settings, cards, examples, and attempts. Tatoeba
          cache entries are not included.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => void exportData()}
            disabled={dataBusy}
          >
            Export data
          </button>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => importInputRef.current?.click()}
            disabled={dataBusy}
          >
            Import data
          </button>
          <input
            ref={importInputRef}
            type="file"
            className="visually-hidden"
            aria-label="Import data file"
            tabIndex={-1}
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void selectImportFile(file);
            }}
          />
        </div>

        {pending ? (
          <div className="import-preview">
            <h3>Ready to import</h3>
            <p className="hint">{pending.filename}</p>
            <dl className="settings-list">
              <div>
                <dt>Settings</dt>
                <dd>{pending.counts.settings}</dd>
              </div>
              <div>
                <dt>Cards</dt>
                <dd>{pending.counts.cards}</dd>
              </div>
              <div>
                <dt>Examples</dt>
                <dd>{pending.counts.examples}</dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>{pending.counts.attempts}</dd>
              </div>
            </dl>
            {confirmReplace ? (
              <div
                className="import-confirm"
                role="alertdialog"
                aria-label="Replace all data?"
              >
                <p>
                  Replace removes your current data after downloading a backup. This
                  cannot be undone without the backup file.
                </p>
                <div className="button-row">
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => setConfirmReplace(false)}
                    disabled={dataBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button--primary button--small"
                    onClick={() => void applyImport("replace")}
                    disabled={dataBusy}
                  >
                    Replace and download backup
                  </button>
                </div>
              </div>
            ) : (
              <div className="button-row">
                <button
                  type="button"
                  className="button button--primary button--small"
                  onClick={() => void applyImport("merge")}
                  disabled={dataBusy}
                >
                  Merge data
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => setConfirmReplace(true)}
                  disabled={dataBusy}
                >
                  Replace all data
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => setPending(null)}
                  disabled={dataBusy}
                >
                  Cancel import
                </button>
              </div>
            )}
          </div>
        ) : null}

        {dataError ? (
          <p className="form-error" role="alert">
            {dataError}
          </p>
        ) : null}
        {dataStatus ? (
          <p className="form-message" role="status">
            {dataStatus}
          </p>
        ) : null}
      </section>

      <section className="settings-section" aria-labelledby="languages-heading">
        <h2 id="languages-heading">Languages</h2>
        <dl className="settings-list">
          <div>
            <dt>Native language</dt>
            <dd>Russian</dd>
          </div>
          <div>
            <dt>Target language</dt>
            <dd>English</dd>
          </div>
        </dl>
        <p className="hint">More language pairs are planned for a future version.</p>
      </section>

      <section className="settings-section" aria-labelledby="about-heading">
        <h2 id="about-heading">About</h2>
        <dl className="settings-list">
          <div>
            <dt>App version</dt>
            <dd>{__APP_VERSION__}</dd>
          </div>
        </dl>
        <p className="hint">Your words stay in this browser. No account, no server.</p>
      </section>
    </div>
  );
}
