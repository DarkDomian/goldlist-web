# Design

## Context

See `proposal.md` for motivation and the delta specs for required behavior.

The MVP already has the domain model, Dexie schema, Tatoeba adapter, translation worker, card detail, and a working Re-learn action. The new work is mostly presentation, curation, shared loading state, settings, and data movement. Existing constraints that shape the approach:

- `CardView` is shared by Current Day, Distillation feedback, Card detail, and the Archive list.
- `getExamples` currently caches the three selected Tatoeba examples, not the candidate set.
- Translation progress is owned by `AddCardDialog` and keyed by a request id, so concurrent consumers cannot share it.
- The `Example` type already supports `source: "user"`, but there is no repository API for custom examples.
- Settings are stored as one Dexie record and read through `readSettings`; unknown newer fields are naturally ignored by older code.
- The Archive already exposes Re-learn in card detail for learned and unlearned cards.
- The theme is a light/dark union mirrored into `localStorage` for the pre-paint startup script.

## Goals / Non-Goals

**Goals:**

- Keep all existing data readable without a destructive database migration.
- Make example curation and custom examples first-class without blocking card creation.
- Make translation loading observable from one shared status source.
- Keep Archive compact without losing access to card detail.
- Make import/export deterministic, versioned, and safe to retry.
- Preserve keyboard and screen-reader access when the skip-link is removed.

**Non-Goals:**

- Changing the 14-day schedule, status transitions, or distillation rules.
- Reworking the translation model or adding cloud translation providers.
- Adding multi-language support or account sync.
- Designing a general plugin system for every UI surface.

## Decisions

### Shared translation status lives in the service, not the dialog

Add a small observable status store to the translation service layer. `WorkerTranslationService` exposes a snapshot and a subscription; `AddCardDialog` and future consumers subscribe through the service context. The worker emits model lifecycle events independent of a request id, and the client maps them to `queued`, `downloading`, `initializing`, `ready`, `error`, plus a short `translating` state.

The worker tracks progress per file and reports an aggregate percentage:
1. Use `loaded`/`total` when both are available.
2. Otherwise average the latest per-file progress values.
3. Keep the reported percentage monotonic within one model load.

A reusable `TranslationStatusBar` renders the percentage above the bar and the phase in the summary. Alternatives considered: React Context per dialog (rejected because concurrent consumers would still fragment), and a separate global modal (rejected because it interrupts the Add Card flow).

### Candidate caching replaces selected-example caching

Change the Tatoeba path to return a candidate set larger than the selection limit, cache that candidate set, and keep automatic selection as a pure function over candidates. Manual mode renders the cached candidates and stores only the selected examples. This preserves offline behavior and avoids a second network request when the user switches between modes.

`ExampleSelectionMode` is `"auto" | "manual"` with `"auto"` as the default. Automatic mode keeps the existing relevance selection and maximum of three examples. Manual mode fetches a larger set, shows the “choose your own for better control” hint, and allows saving with fewer than three or none.

### Custom examples use a small repository API

Add repository functions for creating, updating, and deleting user examples, plus a shared normalization/deduplication helper. Card creation still accepts `ExampleDraft[]`, so custom examples can be added in the Add Card flow before the card exists. Card detail gets an inline editor that writes through the repository. User examples are sorted before Tatoeba examples for display.

No new table is required because `Example.source` already includes `user`. Custom examples are trimmed, reject empty strings, and are deduplicated case-insensitively against the card's examples.

### Card previews get an explicit preview variant

`CardView` gains a `variant` prop: `"preview"` for Current Day and Distillation, `"full"` for card detail. Preview mode applies a fixed content height and a `useOverflowFade` hook using `ResizeObserver` and `scrollHeight > clientHeight`. The existing card body padding stays unchanged in preview mode so both variants share the same internal spacing. The fade is a CSS overlay/mask enabled only when overflow is detected; the content stays in the DOM and accessibility tree. Card detail keeps the full list visible.

Alternatives considered: always applying a gradient (rejected because it falsely implies overflow) and truncating the data (rejected because it loses content and breaks screen readers).

### Archive list gets dedicated compact components

Introduce `ArchiveChip` for learned and unlearned cards and redesign `WaitingCard` as a compact metallic chip. Learned/unlearned chips show only the English word and link to detail; waiting chips show only the status label and use a metallic gradient per copper/silver/gold. A wrapping flex/grid container places multiple chips per row. Card detail remains the place for translation and examples.

Alternatives considered: reusing `CardView` with a compact modifier (rejected because it carries status, translation, and example markup that the compact list should not render).

### Theme preference and resolved theme are separate

Extend `Theme` to `"light" | "dark" | "system"`. `SettingsContext` resolves `system` through `matchMedia("(prefers-color-scheme: dark)")`, subscribes to changes while system is selected, sets `data-theme` to the resolved value, and sets `color-scheme` on the root element. `localStorage` stores the preference, not the resolved value, so the inline startup script can resolve it before paint and avoid a flash. Existing settings records are normalized by merging with `DEFAULT_SETTINGS`, so no database version bump is needed.

The default remains `light` to preserve current behavior. Onboarding maps the preference to “Light”, “Dark”, or “System”.

### Import/export is a standalone service with a versioned envelope

Add `src/data/portability.ts` (or equivalent) with a pure snapshot builder/parser and a transactional importer. The envelope is:

```json
{
  "schemaVersion": 1,
  "exportedAt": "ISO timestamp",
  "appVersion": "0.1.1",
  "payload": {
    "settings": {},
    "cards": [],
    "examples": [],
    "attempts": []
  }
}
```

The parser validates types, statuses, dates, and relationships; unknown fields are ignored; older versions migrate before validation; newer versions are rejected. The exporter excludes `tatoebaCache`.

Merge mode keeps existing data and skips records with colliding IDs or normalized `wordKey` values, skipping dependent examples and attempts too. It imports settings only when the current settings are still the defaults; otherwise existing settings win and the skip is reported. Replace mode requires confirmation, generates and downloads a backup snapshot from the current data before the transaction starts, then clears and writes all four tables atomically. A failed backup or transaction leaves the previous state intact.

Alternatives considered: merging settings unconditionally (rejected because it can silently change the user's theme), and importing without a transaction (rejected because partial imports are hard to recover from).

### Route effects replace the skip-link

Remove the skip-link markup and styles. Add a route-effects component inside the router that scrolls to the top on `PUSH`/`REPLACE` navigation, leaves `POP` to the browser, and focuses the main region (`tabIndex={-1}`) after route changes. Pointer navigation may move focus to the main region but never into an input. Stable shell sizing uses `100dvh` with a `100vh` fallback and keeps the bottom navigation outside the scrolling content.

### Re-learn is retained, not rebuilt

The existing `relearnCard` repository function and detail button already implement the required status reset. This change keeps that behavior, limits the action to learned/unlearned detail views, and adds regression coverage for examples and attempt history preservation.

## Risks / Trade-offs

- **Aggregate progress may be approximate** because Transformers.js reports per-file progress. → Use loaded/total when available, otherwise a monotonic average, and label the phase separately.
- **Fixed-height previews hide content visually.** → Show the fade only on overflow, keep content in the accessibility tree, and keep card detail fully expanded.
- **Compact Archive chips hide translation and examples.** → Keep the word as the tap target and expose all details in the card detail view.
- **Removing the skip-link can regress keyboard access.** → Add route focus tests and ensure the main region is focusable and announced.
- **Replace import is destructive.** → Require confirmation, force a backup download before starting, and wrap the replacement in one transaction.
- **System theme can flash on startup.** → Keep the pre-paint inline script and store the preference in `localStorage`.
- **Old app versions do not understand `system`.** → Migration plan keeps the preference additive; rolling back may resolve system to the default light theme until the new version is restored.

## Migration Plan

1. Ship the additive settings fields and normalize old records on read.
2. Keep the Dexie schema at its current version unless implementation reveals a required index; all new data uses existing tables and fields.
3. Export schema starts at version `1`; future changes add fields and migration functions rather than renaming existing fields.
4. Roll back by restoring the previous app build. Existing cards, examples, and attempts remain valid; settings with unknown fields are ignored by the old code.
5. Add a manual upgrade check with an existing database containing light/dark settings and Tatoeba-only examples.

## Open Questions

None. The remaining implementation choices are covered by the decisions above.
