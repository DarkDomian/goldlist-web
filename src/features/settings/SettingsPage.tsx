import { useState } from "react";
import { useSettings } from "@/app/SettingsContext";
import type { Theme } from "@/domain/types";

export default function SettingsPage() {
  const { settings, setTheme } = useSettings();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Settings</p>
        <h1>Make it comfortable</h1>
        <p className="lede">A few quiet preferences. The language pair is fixed for now.</p>
      </header>

      <section className="settings-section" aria-labelledby="theme-heading">
        <h2 id="theme-heading">Theme</h2>
        <div className="theme-toggle" role="group" aria-label="Theme">
          {(["light", "dark"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={`theme-toggle__option${settings.theme === theme ? " theme-toggle__option--active" : ""}`}
              aria-pressed={settings.theme === theme}
              onClick={() => void chooseTheme(theme)}
              disabled={saving}
            >
              {theme === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
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
