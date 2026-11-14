# Proposal

## Why

Russian-speaking English learners want a frictionless way to capture words they meet in real life and revisit them with the GoldList method, but existing tools require manual card authoring and are aimed at beginners. This change builds Aurumist: a local-first, privacy-preserving web app that automates translation and example gathering while preserving the method's add → rest → distill → learn-or-let-go cycle.

## What Changes

- Add a one-time onboarding flow that confirms the fixed Russian → English language pair and default scheduling settings.
- Add card creation with automatic Russian translation (TranslateGemma via Transformers.js), English examples (Tatoeba), duplicate blocking, and manual override fallbacks.
- Add the Current Day view showing cards added today plus the card-shaped add action.
- Add calendar-based scheduling: midnight cutoff, 14-calendar-day freeze, due-card selection, and missed-cutoff processing on startup.
- Add distillation: typed Russian answers, local normalized checking, three stages (copper → silver → gold), learned/unlearned outcomes, and attempt history.
- Add the Archive with ordered learned, unlearned, and waiting blocks, including re-learn and delete actions.
- Add Settings for theme, app version, and read-only language pair display.
- Add local persistence in IndexedDB with startup hydration, storage persistence request, and offline-tolerant behavior.
- Add light/dark themes and a mobile-first, accessible card UI.
- Scaffold the project (Vite + React + TypeScript) since the repository currently contains only documentation.

## Capabilities

### New Capabilities

- `onboarding`: first-launch intro, preset language pair, default confirmation, and completion state.
- `cards`: card entity lifecycle, duplicate detection, manual override, re-learn, and delete behavior.
- `translation`: local English → Russian translation through TranslateGemma, caching, progress, and fallback paths.
- `examples`: English usage examples fetched from Tatoeba, filtering, caching, and empty/failure behavior.
- `current-day`: the Current Day view, its add action, and which cards belong there.
- `scheduling`: midnight cutoff, 14-calendar-day freeze, due selection, and missed-cutoff processing.
- `distillation`: due-card sessions, local answer checking, stage transitions, feedback, and attempt history.
- `archive`: ordered learned, unlearned, and waiting blocks with their visibility and interaction rules.
- `settings`: theme switching, version display, and read-only language pair information.
- `local-persistence`: IndexedDB schema, hydration, storage persistence, and offline data guarantees.

### Modified Capabilities

None. This is the initial capability set for a greenfield project.

## Impact

- New frontend application built with Vite, React, and TypeScript, with routing for `/onboarding`, `/today`, `/distillation`, `/archive`, `/card/:id`, and `/settings`.
- New IndexedDB stores for settings, cards, examples, and distillation attempts.
- New local ML dependency (Transformers.js + TranslateGemma model assets loaded on demand) and an external read-only dependency on the Tatoeba API.
- New UI theme layer and mobile-first layout primitives.
- No backend, accounts, cloud sync, TTS, or additional language pairs in this change.
- Bundle budget: initial JS under 500 KB gzipped; model and Tatoeba assets loaded lazily.
- `docs/master-spec.md` remains the source product document; this change turns it into implementable capabilities.
