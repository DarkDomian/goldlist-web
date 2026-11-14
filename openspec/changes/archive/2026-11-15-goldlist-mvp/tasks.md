# Tasks

## 1. Project Setup

- [x] 1.1 Scaffold a Vite + React + TypeScript app in the repository root and verify `npm run build` succeeds.
- [x] 1.2 Add runtime dependencies (`react-router-dom`, `dexie`, `dexie-react-hooks`, `@huggingface/transformers`) and dev dependencies (Vitest, Testing Library, jsdom, fake-indexeddb, Playwright, ESLint, Prettier, typescript-eslint), then verify `npm install` completes.
- [x] 1.3 Configure strict TypeScript, path aliases, ESLint, Prettier, Vitest (jsdom + fake-indexeddb), Playwright, and npm scripts (`dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`); verify each command runs.
- [x] 1.4 Inject `package.json` version as `__APP_VERSION__` at build time and add its TypeScript declaration; verify a test or temporary render shows the expected version.
- [x] 1.5 Create the `domain`, `data`, `features`, `services`, and `ui` directory structure and update `README.md` with setup, scripts, and architecture; verify the documented commands run as written.

## 2. Domain Model and Rules

- [x] 2.1 Define `Settings`, `Card`, `Example`, `DistillationAttempt`, status unions, and default settings in `src/domain`; verify `npm run typecheck` passes.
- [x] 2.2 Implement `wordKey` normalization, answer normalization, and translation variant splitting; verify unit tests cover case, punctuation, whitespace, and `,`/`;`/`/` variants.
- [x] 2.3 Implement `startOfDay`, `addCalendarDays`, `dueAt`, `isDue`, and `processCutoffs`; verify tests cover same-day additions, day-D to D+14, consecutive days, DST boundaries, and missed days.
- [x] 2.4 Implement the distillation status-transition function; verify tests cover copper/silver/gold success, copper/silver failure, gold failure, freeze dates, and learned/unlearned outcomes.
- [x] 2.5 Implement selectors for Current Day, waiting, due, archive blocks, and block ordering; verify tests cover inclusion, exclusion, hidden empty blocks, and ordering rules.

## 3. Local Persistence

- [x] 3.1 Define Dexie schema version 1 with `settings`, `cards`, `examples`, `attempts`, and `tatoebaCache`, including the unique `wordKey` index; verify a fake-indexeddb test opens the database and rejects duplicate keys.
- [x] 3.2 Implement the settings repository and defaults; verify tests cover first read defaults, updates, onboarding completion, and theme persistence.
- [x] 3.3 Implement the card repository for create, duplicate handling, update, re-learn, and cascading delete; verify tests cover each operation and that related examples/attempts are removed.
- [x] 3.4 Implement the distillation transaction and example/cache repositories; verify tests show an attempt and card status commit together and roll back together on failure.
- [x] 3.5 Add seeded repository tests for Current Day, due cards, archive blocks, and ordering; verify each selector returns the expected records from IndexedDB.

## 4. App Shell, Routing, and Theme

- [x] 4.1 Build the app shell with lazy routes for `/onboarding`, `/today`, `/distillation`, `/archive`, `/card/:id`, and `/settings`; verify route-render tests pass.
- [x] 4.2 Add the hydration gate and onboarding route guard; verify tests cover incomplete onboarding redirecting to `/onboarding` and completed onboarding skipping it.
- [x] 4.3 Implement light/dark theme tokens, `data-theme` application, and the pre-paint localStorage theme mirror; verify tests cover immediate switching and persistence across remount.
- [x] 4.4 Build shared UI primitives for cards, status indicators with accessible text labels, add-card button, empty states, dialogs, and page layout; verify Testing Library component tests for roles and labels.
- [x] 4.5 Implement mobile layout rules for full-width cards, 44px tap targets, safe-area insets, focus-visible styles, and no hover-only interactions; verify with a responsive viewport test and documented manual checklist.

## 5. Onboarding

- [x] 5.1 Build the English-language onboarding screens for method intro, read-only Russian-to-English pair, default settings, and confirmation; verify a React Testing Library flow test.
- [x] 5.2 Wire onboarding completion to persist `onboardingCompleted` and navigate to Current Day; verify an integration test confirms the redirect and stored flag.
- [x] 5.3 Verify a returning user does not see onboarding again; add a regression test that mounts the app with completed onboarding.

## 6. Add Card, Translation, and Examples

- [x] 6.1 Build the Add Card form with English word input, empty/duplicate validation, the message "you already knew that", manual translation editing, and save/cancel; verify component tests cover each state.
- [x] 6.2 Implement the translation worker protocol and client with lazy loading, progress events, timeout, and recoverable errors; verify tests with a mocked worker cover loading, success, error, and fallback.
- [x] 6.3 Implement the TranslateGemma worker using the text-generation pipeline, `en` to `ru` chat template, WebGPU-to-WASM fallback, configurable model/dtype, and model caching; verify a mocked-pipeline test plus a documented manual smoke test.
- [x] 6.4 Implement the Tatoeba adapter for the versioned endpoint with exact-word preference, stem fallback, a 3-example cap, 30-day cache, timeout, and empty-result fallback; verify mocked-fetch tests cover all paths.
- [x] 6.5 Wire card creation orchestration through duplicate check, translation progress, example fetch, manual fallback, and persistence; verify an integration test with fake adapters creates a copper card and displays it.
- [x] 6.6 Document TranslateGemma model selection, download expectations, and license attribution in `README.md`; verify the documented setup and attribution sections exist.

## 7. Current Day

- [x] 7.1 Build the Current Day view with the top card-shaped add action, full-width card content, status circle, and empty state; verify component tests cover populated and empty states.
- [x] 7.2 Wire live card updates and the Add Card flow; verify an integration test shows a new card without a reload and blocks duplicates with "you already knew that".

## 8. Scheduling Service

- [x] 8.1 Implement startup cutoff catch-up, next-local-midnight timer, visibility/focus rechecks, and the cutoff/distillation mutex; verify fake-timer tests cover each trigger.
- [x] 8.2 Wire cutoff processing into the app shell; verify an integration test moves a Current Day card to waiting at the cutoff with the correct due date.
- [x] 8.3 Verify cutoff ordering and timezone behavior; add tests for an attempt submitted at the cutoff minute and for a timezone change affecting the next local midnight.

## 9. Distillation

- [x] 9.1 Build the Distillation queue, empty state, and due indicator using due-card selectors; verify tests cover due, future, archived, and empty cases.
- [x] 9.2 Build the test card with English word, examples, status indicator, hidden translation, Russian answer input, and feedback; verify tests confirm translation visibility changes after submission.
- [x] 9.3 Wire answer evaluation and all status transitions with attempt recording; verify integration tests cover learned passes, silver/gold failures, gold-to-unlearned, and feedback text.
- [x] 9.4 Add the navigation due badge and verify it appears on startup with a due card and disappears when none are due.

## 10. Archive and Card Detail

- [x] 10.1 Build the Archive with learned, unlearned, and waiting blocks, hiding empty blocks and applying the specified content and ordering; verify component tests for every block state.
- [x] 10.2 Build the card detail route/modal with allowed content per status; verify tests confirm a learned card never shows its Russian translation.
- [x] 10.3 Wire the Re-learn action from learned and unlearned cards; verify tests confirm the card becomes copper in Current Day and preserves attempt history.
- [x] 10.4 Wire deletion with confirmation and cascading removal; verify tests cover cancel, confirm, and removal of examples/attempts.

## 11. Settings

- [x] 11.1 Build the English-language Settings view with theme switch, app version, and read-only Russian/English languages; verify component tests cover all displayed values.
- [x] 11.2 Wire theme persistence and immediate application from Settings; verify a reload test keeps the selected theme.
- [x] 11.3 Verify Settings exposes no language, cutoff, or freeze controls; add a regression test asserting their absence.

## 12. Offline, Performance, and Accessibility

- [x] 12.1 Configure `vite-plugin-pwa` to precache the app shell, support SPA fallback, and handle updates; verify the production build emits a service worker and an offline reload loads the app.
- [x] 12.2 Request `navigator.storage.persist()` on first launch with failure tolerance; verify tests cover granted, denied, and unsupported paths.
- [x] 12.3 Verify offline core flows and cached Tatoeba examples; add a Playwright offline test that adds a card, distills, and views the Archive without a network.
- [x] 12.4 Add a production bundle-size check that excludes lazy chunks and the model; verify the initial JS is under 500 KB gzipped.
- [x] 12.5 Run an accessibility pass for contrast, labels, focus order, tap targets, and safe areas; verify with automated role/label tests and a documented manual checklist.

## 13. Integration and Release Readiness

- [x] 13.1 Add Playwright smoke coverage for onboarding, add card, cutoff, distillation pass/fail, archive actions, and theme switching; verify `npm run test:e2e` passes.
- [x] 13.2 Cross-check every requirement and scenario in the delta specs against automated tests or an explicit manual check; record any remaining gap in `tasks.md`.
- [x] 13.3 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`; verify all pass.
- [x] 13.4 Finalize `README.md` with features, limitations (English UI, model download, Tatoeba dependency), and deployment instructions; verify the documented commands and links are correct.

## Verification notes

- Automated coverage: 113 Vitest tests and 5 Playwright tests, plus the production bundle budget check.
- Manual-only checks: real TranslateGemma download on WebGPU/WASM, visually distinct waiting status colors, safe-area/contrast review, and persistent-storage grant/deny behavior. These are documented in `docs/manual-checks.md`.
- Schema upgrade behavior is not exercised because v1 is the first schema; the version block is ready for future migrations.
- Raw IndexedDB writes from outside Dexie do not invalidate live queries; the app itself always writes through Dexie, and the Playwright fixtures reload after seeding.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result and that the main specs were created from the deltas.
