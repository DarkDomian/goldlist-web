# Design

## Context

The repository is greenfield: it contains the product document (`docs/master-spec.md`), a README, and no application code or `package.json`. This change scaffolds the full MVP. The fixed technical constraints come from `docs/master-spec.md` §5: Vite, React, TypeScript, IndexedDB through Dexie, TranslateGemma through Transformers.js, Tatoeba for examples, static deployment, mobile-first layout, and an initial JavaScript budget under 500 KB gzipped with models loaded on demand.

Two product ambiguities were resolved with the user for this change:

- The MVP interface language is English. Code, specs, and repository content are also English.
- Distillation answers are checked with normalization and translation variants, not fuzzy matching.

See `proposal.md` for motivation and the capability specs for required behavior.

## Goals / Non-Goals

**Goals:**

- Deliver the complete MVP as one deployable static application.
- Keep all user data and all translation/answer-checking work local.
- Make scheduling and status transitions deterministic and unit-testable.
- Keep the initial bundle small by loading models, routes, and non-critical code on demand.
- Provide a mobile-first, accessible, light/dark interface.

**Non-Goals:**

- TTS, accounts, cloud sync, deck sharing, speech recognition, user-contributed examples, or native apps.
- Multiple language pairs, monolingual spaces, configurable cutoff, or configurable freeze duration.
- A backend, server-side translation, or server-side persistence.
- Data export/import or cross-device restore.

## Decisions

### 1. Layered architecture with a pure domain core

Use four layers:

- `src/domain/`: pure entity types, scheduling math, duplicate normalization, answer normalization, and status-transition functions. No React or Dexie imports.
- `src/data/`: Dexie schema, migrations, repositories, and transactional operations.
- `src/features/`: route-level features (`onboarding`, `today`, `add-card`, `distillation`, `archive`, `settings`, `card-detail`).
- `src/services/`: translation worker client, Tatoeba adapter, and app scheduling service.
- `src/ui/`: shared card, dialog, layout, status indicator, and theme primitives.

React Router owns routes. `dexie-react-hooks` (`useLiveQuery`) supplies reactive reads from IndexedDB so views update automatically after transactional writes. Local React context handles theme, onboarding gate state, and the translation worker handle; there is no global store.

**Why:** the domain stays testable without a browser, and IndexedDB remains the single source of truth. **Alternatives considered:** Redux/Zustand plus a separate persistence layer duplicates data and adds synchronization bugs; React Query targets network APIs and does not replace a local database.

### 2. IndexedDB schema and invariants

Dexie database version 1 with these tables:

| Table | Primary key | Indexes | Notes |
|---|---|---|---|
| `settings` | `id` (`"app"`) | — | Singleton settings record |
| `cards` | `id` | `status`, `scheduledFor`, `wordKey` (unique), `createdAt` | `wordKey` enforces global duplicate blocking |
| `examples` | `id` | `cardId` | Cascaded manually on card delete |
| `attempts` | `id` | `cardId`, `attemptedAt` | Immutable history |
| `tatoebaCache` | `queryKey` | `fetchedAt` | Cached example responses with timestamp |

`wordKey = word.trim().toLocaleLowerCase("en")` with internal whitespace collapsed. The unique index is the final guard; the UI still performs a friendly pre-check so users see "you already knew that" instead of a database error.

A distillation attempt and its card status update happen in one Dexie `rw` transaction covering `cards` and `attempts`. Card deletion removes the card, examples, and attempts in one transaction.

**Why:** Dexie provides versioned migrations, transactions, and live queries with a small footprint. **Alternatives considered:** raw `idb` (more manual plumbing for live updates and migrations); localStorage (no transactions or indexes, size limits).

### 3. Calendar-based scheduling in local time

All scheduling math lives in `src/domain/scheduling.ts`:

- `startOfDay(date)` returns local midnight.
- `addCalendarDays(date, n)` uses `new Date(y, m, d + n)` semantics so DST changes do not shift the calendar day.
- `dueAt(base)` returns `startOfDay(base) + 14 calendar days` (local midnight).
- `isDue(card, now)` is `scheduledFor !== null && scheduledFor <= now`.
- `processCutoffs(cards, now)` selects cards with `scheduledFor === null` and `startOfDay(createdAt) < startOfDay(now)`, then assigns `dueAt(createdAt)`.

At startup the app runs `processCutoffs` before painting user screens. While running, a timer fires at the next local midnight and the app also re-checks on `visibilitychange` and window focus, covering sleeping laptops and background tabs. Cutoff processing and distillation submission share an async mutex so an attempt submitted at the cutoff minute completes before the cutoff mutates that card.

**Why:** `startOfDay(createdAt) + 14 days` is the specified rule and is immune to the time of day a card was added. **Alternatives considered:** adding 14×24 hours (wrong across DST and at non-midnight creation times); storing only dates (loses the required timestamp shape).

### 4. Normalized answer evaluation with variants

`src/domain/answer-check.ts`:

1. Lowercase with `toLocaleLowerCase("ru")`.
2. Normalize Unicode, replace punctuation (Unicode `\p{P}`) and symbols with spaces, collapse whitespace, trim.
3. Convert the stored translation into variants by splitting on `,`, `;`, and `/`.
4. Accept when the normalized answer equals any normalized variant.

No edit distance or synonym matching in the MVP. The comparison is synchronous and local. The spec defines the accepted normalization; this implementation choice keeps it deterministic and testable.

**Why:** it matches the user decision and avoids false positives. **Alternatives considered:** fuzzy edit distance (accepts wrong words, needs tuning); LLM semantic checking (out of scope and slower).

### 5. Lazy translation worker with TranslateGemma

Translation runs in a dedicated Web Worker to keep the main thread responsive. The worker dynamically imports `@huggingface/transformers` only when the first translation is requested.

- Default model: `onnx-community/translategemma-text-4b-it-ONNX` (public ONNX conversion of TranslateGemma 4B).
- It is a Gemma text-generation model, not a classic Marian translation pipeline. The worker uses `text-generation` with the model's chat template: a single user message with `source_lang_code: "en"`, `target_lang_code: "ru"`, and `type: "text"`.
- Preferred dtype/device: `q4f16` on WebGPU when available; otherwise `q4`/`q8` on WASM. The model id, dtype, and device are configuration, so a smaller or different compatible build can be swapped without changing the UI contract.
- Model weights are cached by Transformers.js/browser cache. The worker streams progress messages (`loading`, `progress`, `ready`, `result`, `error`) so the Add Card flow can show download and inference progress.
- A translation timeout and any worker/model error surface as a recoverable error; the user can type a translation manually and still create the card.

**Why:** a worker avoids freezing the UI during multi-second model download/inference, and local execution satisfies the privacy requirement. **Alternatives considered:** server API (violates local-first/privacy); main-thread inference (janky); classic Opus-MT (smaller but not the product's specified TranslateGemma approach).

### 6. Tatoeba adapter with caching and tolerance

`src/services/tatoeba.ts` calls `GET https://api.tatoeba.org/v1/sentences?lang=eng&q=<encoded word>&sort=relevance&limit=20` (verified during design). It then:

1. Keeps sentences containing the exact word as a whole word, case-insensitively.
2. If fewer than 3 remain, fills from sentences containing a simple stem (trailing `s`, `es`, `ed`, `ing` removed).
3. Returns at most 3 examples.
4. Caches the normalized result in `tatoebaCache` for 30 days.
5. Uses `AbortController` with a timeout.

Any network, CORS, parsing, or empty-result outcome yields an empty examples list; card creation always proceeds.

**Why:** the public read-only API needs no key, and graceful degradation prevents examples from blocking the app. **Alternatives considered:** the legacy `api_v0` endpoint (no versioned contract); a server-side proxy (violates the no-backend constraint).

### 7. Mobile-first UI with CSS custom properties

- English UI text.
- Plain CSS organized by feature plus a global token layer. Theme is applied by setting `data-theme="light" | "dark"` on `<html>`.
- A small localStorage mirror of `theme` is written whenever the theme changes and read by a tiny inline bootstrap script before React mounts, avoiding a flash of the wrong theme. IndexedDB remains the source of truth for settings.
- Cards are full width with the word left-aligned, translation below, examples after, and the status circle in the top-right. Status uses color plus an accessible text label, not color alone.
- Touch targets are at least 44×44 px; primary actions sit in the lower thumb zone; safe-area insets are respected via `env(safe-area-inset-*)`; no interaction depends on hover.
- Routes are lazy-loaded, and the translation worker/model code is outside the initial bundle.

**Why:** a design system or utility framework would add bundle weight and styling churn for a small app. **Alternatives considered:** Tailwind (extra build/config and markup noise); a component library (large bundle, generic look); CSS-in-JS (runtime cost).

### 8. Offline app shell

Use `vite-plugin-pwa` in `generateSW` mode to precache the built app shell and register a service worker. SPA navigations fall back to `index.html`. Model weights are cached by Transformers.js at runtime, not precached. Tatoeba responses are cached in IndexedDB, not the service worker. The update strategy avoids stale bundles by activating the new service worker and prompting a reload when a new version is ready.

**Why:** "core flows work offline after first load" needs the shell available offline, while precaching a multi-gigabyte model would be unacceptable. **Alternatives considered:** no service worker (fails the offline requirement); precaching all assets (storage blowup).

### 9. Routing and guards

Routes: `/onboarding`, `/` and `/today`, `/distillation`, `/archive`, `/card/:id`, `/settings`.

A route guard reads the hydrated settings record:

- If onboarding is incomplete, any non-onboarding route redirects to `/onboarding`.
- If onboarding is complete, `/onboarding` redirects to `/today`.

The app shell renders a loading state until settings hydrate, preventing an incorrect redirect or empty-state flash.

**Why:** one guard keeps the first-launch behavior consistent. **Alternatives considered:** per-page checks (duplicated logic, easy to miss a route).

### 10. Testing and tooling

- TypeScript strict mode; ESLint + Prettier; Vite build.
- Vitest with `fake-indexeddb` for domain and repository tests.
- React Testing Library for key components and flows.
- Playwright for end-to-end smoke flows (onboarding, add card with a fake translation adapter, cutoff, distillation, archive, theme).
- A bundle-size check on the production build, with Transformers.js excluded from the initial chunk.
- The app version is injected at build time from `package.json` as `__APP_VERSION__`.

**Why:** scheduling and status transitions are the highest-risk logic and are cheap to test purely. **Alternatives considered:** manual testing only (regressions in calendar math and transitions); heavy e2e coverage for every path (slow).

## Risks / Trade-offs

- **TranslateGemma download size and first-use latency** → lazy load on first translation, streamed progress, manual override, persistent browser cache, and a configurable model/dtype. Card creation never blocks on translation.
- **WebGPU/WASM support varies by browser** → detect WebGPU and fall back to WASM, with a lower-quantization dtype; surface a clear error and manual path if both fail.
- **Tatoeba CORS, rate limits, or downtime** → timeout, local cache, empty-example fallback, no server proxy. Examples are a progressive enhancement.
- **IndexedDB eviction or private browsing** → call `navigator.storage.persist()` on first launch, surface storage failures, and keep all writes transactional. Cross-device backup is explicitly out of scope.
- **DST and travel across timezones** → calendar arithmetic via local date components, local-midnight recomputation, and tests around DST boundaries. "Recalculate" means subsequent cutoff/due evaluation uses the new local timezone.
- **Duplicate detection is string-based** → it catches case/whitespace duplicates but not inflectional variants. The unique `wordKey` index protects the main case; users can delete and re-add. Semantic duplicate detection is out of scope.
- **Model licensing/availability** → pin a public ONNX conversion and keep the model id configurable; document the license attribution with the app. A model swap must preserve the worker protocol.
- **Service worker staleness** → revisioned precache, activate-new-worker flow, and a reload prompt; test an upgrade from the previous build.
- **Bundle budget creep** → route-level code splitting, no UI kit, dynamic import of Transformers.js, and an automated size check.
- **Clock changes while the app is open** → re-check on visibility/focus and at the next computed midnight; stale timers are re-armed after each check.

## Migration Plan

This is a new application, so there is no existing user data to migrate.

1. Scaffold Vite + React + TypeScript with strict config and the dependencies above.
2. Create Dexie schema version 1; all future schema changes use `version(n).upgrade(...)`.
3. Deploy the static build with SPA fallback routing and a versioned service worker.
4. Rollback is a redeploy of the previous static build; database version 1 remains readable by the previous build, so no destructive migration is needed.

## Open Questions

- The best quantization/device pairing per browser can be tuned during implementation. The worker protocol and manual fallback isolate that choice from the specs and task order.
- The exact Tatoeba stemmer quality is unknown. The design already caps examples and treats empty results as valid; improving stemming does not change the capability contract.
