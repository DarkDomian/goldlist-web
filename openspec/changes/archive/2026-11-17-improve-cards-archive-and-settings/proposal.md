# Proposal

## Why

The MVP is usable end-to-end, but several daily-use gaps remain. Cards can become visually noisy or hide content, examples cannot be curated, the archive does not scale, translation progress is fragmented, theme control is incomplete, and user data cannot move between browsers. This change turns the MVP into a more comfortable and durable personal notebook without changing the GoldList scheduling rules.

## What Changes

- Render card previews at a fixed height while preserving the standard card body padding, show only what fits, and fade the final visible line/example only when content overflows. Keep all content available to assistive technology, and show user-authored examples before Tatoeba examples.
- Add a Settings choice between automatic example selection (first relevant examples) and manual selection from a Tatoeba candidate list. Manual selection shows a hint that choosing examples gives better control and stores only the chosen examples.
- Allow users to create, edit, and delete custom examples on a card, both while adding a word and from card detail. Custom examples use the existing `user` source.
- Replace per-request translation progress with one shared model-loading status. The status covers queued, downloading with aggregate progress, initializing, ready, and error, and is visible to every consumer during the WebGPU-to-WASM fallback. Percentage appears above the progress bar, not in the status summary.
- Turn learned and unlearned archive cards into compact bordered word chips, multiple per row. Render waiting cards as compact metallic-gradient chips with an explicit copper/silver/gold status instead of blurred cards.
- Preserve the existing Re-learn action in card detail for learned and unlearned cards only. Reset the card to `copper` with `scheduledFor` null while retaining examples and attempt history.
- Add a light/dark/system theme choice. `system` follows `prefers-color-scheme` at runtime, persists, sets `color-scheme`, and avoids a flash of the wrong theme on startup.
- Add versioned JSON export and import in Settings for settings, cards, examples, and attempts. Import validates and previews the file, supports merge and replace, ignores unknown fields, migrates older versions, and creates a backup before a destructive replace.
- Remove the skip-link and implement route scroll restoration and focus management instead. Stabilize the mobile header and bottom navigation so they do not jump between screens.
- Fix the Add a word plus icon by replacing the styled text glyph with an accessible inline SVG, and normalize the excessive top spacing above card words.

### Assumptions

- The default theme for new installations remains `light`; `system` is an explicit choice.
- Automatic example mode keeps the current maximum of three examples. Manual mode fetches a larger candidate set and lets the user choose up to three.
- Fixed-height previews apply to list and distillation surfaces; card detail keeps the full content available.
- Compact archive chips show the English word only; translation and examples remain available in card detail under the existing visibility rules.
- Import defaults to a safe merge that skips conflicting records. Replace is explicit, confirmed, and backed up first.

## Capabilities

### New Capabilities

- `data-portability`: Versioned full-snapshot export, validated import, conflict policies, and backup-before-replace behavior.
- `navigation`: Route scroll restoration, focus management, and stable app-shell layout without a skip-link.

### Modified Capabilities

- `archive`: Compact learned/unlearned chips, metallic waiting chips, and the detail-only re-learn action for archived cards.
- `cards`: Clarify that Re-learn is offered in archived card detail only and preserves examples and attempts.
- `current-day`: Fixed-height card previews with overflow indication and an accessible vector plus icon on the add action.
- `distillation`: Fixed-height card previews with the same overflow indication during recall.
- `examples`: Automatic/manual selection, user-authored examples, candidate caching, and user-example display priority.
- `onboarding`: Show a system theme preference as well as light and dark.
- `settings`: Add light/dark/system theme modes and the example-selection mode preference.
- `translation`: One shared model-loading status across concurrent consumers, including aggregate download progress and the WebGPU-to-WASM fallback.

## Impact

- UI: `CardView`, `AddCardButton`, archive, current-day, distillation, add-card, card-detail, settings, onboarding, and shared styles.
- App shell: route scroll/focus handling in `AppShell`, theme resolution in `SettingsContext` and the startup inline script.
- Services/data: shared translation status in the worker client, example candidate selection/caching, custom-example repositories, and a new import/export service.
- Persistence: settings gain theme and example-selection fields with defaults; existing IndexedDB data must remain readable without destructive migration.
- Tests: domain/repository coverage for custom examples and import/export, component tests for card previews and archive chips, settings/theme tests, and E2E coverage for import/export and re-learn.
- Dependencies: no new runtime dependency; export/import uses JSON and browser download/file APIs.
