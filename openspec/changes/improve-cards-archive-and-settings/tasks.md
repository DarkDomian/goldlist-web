# Tasks

## 1. Settings and Theme Foundation

- [x] 1.1 Extend the settings types with `Theme = "light" | "dark" | "system"` and `ExampleSelectionMode = "auto" | "manual"`, add both to `DEFAULT_SETTINGS`, and normalize legacy records by merging stored values with defaults; verify `tests/data/settingsRepository.test.ts` covers light, dark, system, missing fields, and invalid values.
- [x] 1.2 Implement theme resolution in `SettingsContext`: resolve `system` with `matchMedia`, subscribe to system changes while selected, update `data-theme` and `color-scheme`, and persist the preference rather than the resolved theme; verify `tests/features/settings.test.tsx` covers all three modes and listener cleanup.
- [x] 1.3 Update the pre-paint startup script in `index.html` to resolve a stored `system` preference before React mounts; verify with a build and a manual reload that dark system preference paints dark without a light flash.
- [x] 1.4 Add the three-way theme control, example-selection-mode control, and onboarding display for Light/Dark/System; verify `tests/features/settings.test.tsx` and `tests/features/onboarding.test.tsx` cover persisted values and visible labels.
- [x] 1.5 Update the README theme and settings descriptions; verify the documented Settings path and mode labels match the UI.

## 2. Example Curation

- [x] 2.1 Refactor the Tatoeba adapter to fetch and cache a candidate set larger than three while keeping automatic selection capped at three; verify `tests/services/tatoeba.test.ts` covers candidate caching, offline reuse, stable ordering, and the selection cap.
- [x] 2.2 Add the manual picker to `AddCardDialog` with the “choose your own for better control” hint, selectable candidates, a three-example cap, and saving with fewer than three or none; verify `tests/features/addCard.test.tsx` covers auto/manual switching, selection, deselection, and saving without examples.
- [x] 2.3 Add repository APIs for creating, updating, and deleting custom examples with trimming, empty-text rejection, case-insensitive deduplication, and `source: "user"`; verify `tests/data/cardRepository.test.ts` covers create, edit, delete, duplicate rejection, and cascade deletion.
- [x] 2.4 Add the custom-example editor to card detail with create, edit, delete, and feedback for empty or duplicate input; verify `tests/features/cardDetail.test.tsx` covers each action and live query updates.
- [x] 2.5 Sort user examples before Tatoeba examples in the shared display path; verify `tests/ui/components.test.tsx` covers ordering and that user examples remain editable while Tatoeba examples do not.
- [x] 2.6 Update the README examples description with automatic/manual selection and custom examples; verify the documented behavior matches the UI.

## 3. Card Presentation

- [x] 3.1 Add a `variant` prop to `CardView` and a `useOverflowFade` hook using `ResizeObserver` and `scrollHeight > clientHeight`; verify `tests/ui/components.test.tsx` covers preview mode, full mode, overflow detection, and content remaining in the accessibility tree.
- [x] 3.2 Apply preview mode to Current Day and Distillation feedback while keeping card detail full, including fixed-height preview styling and a fade only when content overflows; verify `tests/features/today.test.tsx` and `tests/features/distillation.test.tsx` cover the variant and full detail rendering.
- [x] 3.3 Replace the text plus with an inline SVG plus in `AddCardButton`, keep it `aria-hidden`, and adjust card word top spacing; verify `tests/ui/components.test.tsx` checks the icon and accessible label, and a visual check confirms the smaller spacing.
- [x] 3.4 Update the README feature summary for fixed-height previews and full card detail; verify the documented behavior matches the rendered cards.

## 4. Archive Redesign

- [x] 4.1 Add `ArchiveChip` for learned and unlearned cards showing only the English word, wrapping multiple chips per row, and linking to card detail; verify `tests/features/archive.test.tsx` covers word-only rendering, wrapping markup, detail navigation, and preservation of translation/examples in detail.
- [x] 4.2 Redesign `WaitingCard` as a compact metallic chip showing the Copper/Silver/Gold label, using distinct gradients and no blur; verify `tests/features/archive.test.tsx` covers status labels, classes, and absence of content.
- [x] 4.3 Wire the Archive page to the new compact lists and keep Re-learn available only in learned/unlearned detail views; verify `tests/features/archive.test.tsx` and `tests/features/cardDetail.test.tsx` cover the placement and status reset.
- [x] 4.4 Add regression coverage that Re-learn preserves examples and attempt history; verify the repository and detail tests assert the card returns to unlearned without losing dependent records.
- [x] 4.5 Tune archive chip sizing, spacing, and tap targets for mobile and desktop; verify with a Playwright mobile viewport check and a keyboard-only navigation pass.

## 5. Shared Translation Status

- [x] 5.1 Add model lifecycle events to the worker protocol independent of request ids and implement aggregate progress using loaded/total when available, otherwise a monotonic per-file average; verify new pure aggregator tests cover file updates, missing totals, completion, and monotonic output.
- [x] 5.2 Add an observable status store to the translation service with snapshot and subscribe APIs, mapping queued, downloading, initializing, ready, translating, and error states; verify `tests/services/translation.test.ts` covers multiple subscribers, concurrent requests, fallback, completion, and error.
- [x] 5.3 Build a reusable `TranslationStatusBar` with the percentage above the bar and the phase in the summary, and switch `AddCardDialog` to the shared store; verify `tests/features/addCard.test.tsx` covers percentage placement, phase text, and removal of duplicate per-dialog progress state.
- [x] 5.4 Exercise the WebGPU-to-WASM fallback path and confirm only one status bar is rendered while the fallback is active; verify with translation service tests and a component test for no duplicate status UI.
- [x] 5.5 Update the README translation-model notes for shared loading/fallback status; verify the documented phases match the rendered states.

## 6. Navigation and Shell

- [x] 6.1 Remove the skip-link markup and styles, then add a route-effects component that scrolls to the top on `PUSH`/`REPLACE`, leaves `POP` to the browser, and focuses the main region with `tabIndex={-1}`; verify new router tests cover forward navigation, back navigation, scroll reset, and focus placement.
- [x] 6.2 Stabilize the mobile shell with `100dvh` plus a `100vh` fallback and safe-area-aware bottom navigation; verify a Playwright mobile viewport check shows no jump or overlap when navigating between views.
- [x] 6.3 Keep the Add button at the top with aligned controls and focusable regions; verify the today/settings component tests and a keyboard traversal pass.
- [x] 6.4 Update the README manual checks for keyboard navigation and mobile layout; verify the checklist matches the implemented behavior.

## 7. Import and Export

- [x] 7.1 Add the versioned export envelope, snapshot builder, parser, validation, and migration hooks; verify `tests/data/portability.test.ts` covers valid snapshots, invalid types, orphaned records, unknown fields, old versions, and newer versions.
- [x] 7.2 Implement merge import that skips existing IDs and normalized `wordKey` collisions, skips dependent examples/attempts for skipped cards, and imports settings only when the current settings are still defaults; verify tests cover each conflict and the settings-default rule.
- [x] 7.3 Implement replace import with a backup download before the transaction, atomic clearing/writing of settings, cards, examples, and attempts, and rollback on failure; verify tests cover backup-before-replace, aborted backup, full replacement, and transaction failure.
- [x] 7.4 Add Settings export/import controls, file selection, preview counts, merge/replace choice, replace confirmation, and status feedback; verify `tests/features/settings.test.tsx` covers export, import preview, cancel, merge, replace, and backup failure.
- [x] 7.5 Add an end-to-end export/import round trip and a replace-with-backup flow; verify with `npm run test:e2e` and confirm the downloaded files are valid JSON.
- [x] 7.6 Document the export schema, merge/replace behavior, and backup requirement in the README; verify the documented fields match `tests/data/portability.test.ts` fixtures.

## 8. Integration Verification

- [x] 8.1 Update the README feature list, limitations, and manual-check sections to reflect themes, examples, archive chips, shared translation status, navigation, and portability; verify every documented command and path works as written.
- [x] 8.2 Run `npm run lint` and confirm zero errors, with only the pre-existing `react-refresh` warnings.
- [x] 8.3 Run `npm run typecheck` and confirm it passes.
- [x] 8.4 Run `npm run test` and confirm all unit and component tests pass.
- [x] 8.5 Run `npm run test:e2e` and confirm the desktop, offline, import/export, and mobile-layout flows pass.
- [x] 8.6 Run `npm run build` and `npm run check:bundle`, then verify the app boots from `npm run preview`, the base-path build still works, and the service worker scope is unchanged.

## 9. Review Follow-up

- [ ] 9.1 Restore the standard card body padding in preview cards and add a regression assertion for the computed spacing.
- [ ] 9.2 Bump the package version to `0.1.1` and add a root `CHANGELOG.md` entry for the patch release.

## Workflow follow-up

- Review the implementation against the delta specs before archiving.
- Archive the change with `openspec archive "improve-cards-archive-and-settings"` after review.
- Verify the archived result and confirm the main specs contain the updated requirements.
