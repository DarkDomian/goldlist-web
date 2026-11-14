import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/app/SettingsContext";

export default function OnboardingPage() {
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({ onboardingCompleted: true });
      navigate("/today", { replace: true });
    } catch {
      setError("Could not save your setup. Please try again.");
      setSaving(false);
    }
  };

  return (
    <main className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__brand">
          <span className="app-header__mark" aria-hidden="true" />
          <span>GoldList</span>
        </div>

        {step === 0 ? (
          <section aria-labelledby="onboarding-title">
            <p className="eyebrow">Welcome</p>
            <h1 id="onboarding-title">A quieter way to grow your English.</h1>
            <p className="lede">
              GoldList is a small notebook for words you meet in real life. Add a word, let it
              rest, then come back and try to recall it.
            </p>
            <ol className="method-list">
              <li>
                <strong>Add</strong> an English word. The Russian translation and examples are
                prepared for you.
              </li>
              <li>
                <strong>Rest</strong> for 14 calendar days. The card waits quietly in your
                archive.
              </li>
              <li>
                <strong>Distill</strong> by typing the Russian translation. Recall it and it is
                learned; miss it and it returns for another rest.
              </li>
              <li>
                <strong>Let go</strong> after the final stage. Words you do not need anymore stay
                in the archive, out of rotation.
              </li>
            </ol>
            <button type="button" className="button button--primary" onClick={() => setStep(1)}>
              Continue
            </button>
          </section>
        ) : (
          <section aria-labelledby="onboarding-title">
            <p className="eyebrow">Your setup</p>
            <h1 id="onboarding-title">Everything is ready.</h1>
            <p className="lede">
              GoldList is set up for Russian speakers learning English. You can change the theme
              later in Settings.
            </p>
            <dl className="setup-list">
              <div>
                <dt>Native language</dt>
                <dd>Russian</dd>
              </div>
              <div>
                <dt>Target language</dt>
                <dd>English</dd>
              </div>
              <div>
                <dt>Freeze between distillations</dt>
                <dd>14 calendar days</dd>
              </div>
              <div>
                <dt>Daily cutoff</dt>
                <dd>00:00 local time</dd>
              </div>
              <div>
                <dt>Theme</dt>
                <dd>{settings.theme === "dark" ? "Dark" : "Light"}</dd>
              </div>
            </dl>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="button-row">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setStep(0)}
                disabled={saving}
              >
                Back
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => void finish()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Start learning"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
