# Changelog

All notable changes to GoldList are documented in this file.

## [0.1.1] - 2026-11-17

### Added

- Light, dark, and system theme preferences.
- Automatic or manual selection of up to three Tatoeba examples.
- Custom examples that can be added, edited, and deleted while creating a card or from card detail.
- One shared translation loading status with aggregate progress and WebGPU-to-WASM fallback.
- Compact archive chips and metallic waiting chips.
- Versioned JSON export and merge/replace import with a backup before replacement.

### Changed

- Replaced the skip link with route scroll restoration and focus management.
- Stabilized the mobile shell with safe-area-aware bottom navigation.

### Fixed

- Preserved the standard card body padding in fixed-height preview cards.
- Replaced the add-card text glyph with an accessible inline SVG icon.
- Removed excessive top spacing above card words.

## [0.1.0] - 2026-11-15

### Added

- Initial local-first GoldList notebook with onboarding, Current Day, Distillation, Archive, Card detail, and Settings.
- Copper, silver, gold, learned, and unlearned card lifecycle with 14-day scheduling.
- Automatic English-to-Russian translation, Tatoeba examples, and IndexedDB persistence.
- Installable offline PWA.
