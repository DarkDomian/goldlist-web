# Aurumist — Master Spec (Pre-SDD Draft, revised)

> Single source describing the product, its entities, and use cases. It is structured so it can later be split into SDD capability specs (see §17).
>
> Revision note: three distillation stages only (copper → silver → gold, with learned/unlearned outcomes), a fixed 14-calendar-day freeze due at local midnight, fixed Russian → English languages, no TTS, a mobile-first archive with three blocks, and light/dark themes.

---

## 1. Product Overview

A local-first, privacy-preserving web application for **Russian-speaking learners of English** who want to grow their vocabulary through a **digitized GoldList method**. It automates the tedious parts of the method (translation and example gathering) while preserving its core philosophy: *add once → rest → distill → learn or let go*.

## 2. Target Audience

- **Native language:** Russian (fixed for now).
- **Target language:** English (fixed for now).
- **Level:** B1–B2 and above.
- **Behavior:** Self-directed learners who read, watch, and listen in English.
- **Pain point:** existing tools are built for beginners or require manual card creation. Users want a *digital golden notebook* to capture words from their own lives.
- **Motivation:** a personal log of encountered words with minimal friction.

## 3. Core Principles

1. **Low friction, high trust.** Adding a word should take seconds; translation and examples are filled in automatically.
2. **Rest is part of the method.** A card is frozen for **14 calendar days** between distillations, regardless of its current status. It becomes due at local midnight on the day that is 14 calendar days after its creation day or last attempt day (`startOfDay(createdAt) + 14 days`), not at the time of day it was created.
3. **Three distillation stages only.** `copper → silver → gold`. Passing at any stage makes the card `learned`; failing `gold` makes it `unlearned`. There is no platinum and no endless repetition.
4. **Learned ≠ tested forever.** Learned cards leave active rotation and can be manually re-enabled.
5. **Local-first.** All computation runs in the browser: translation and answer checking happen locally. No account required.
6. **Mobile-first, neutral design.** Full-width cards, a simple interface, light/dark themes, and UX that follows current mobile design best practices.

## 4. Scope

**In scope (MVP):**

- Short first-launch intro (languages are preset: Russian → English)
- Add word card (English word input, automatic Russian translation, English examples)
- Current Day view with a card-shaped add button
- Distillation view (typed Russian answer, local automatic check)
- Archive with three ordered blocks: learned, unlearned, waiting
- Settings (theme, app version, current native and target languages)
- Local persistence (IndexedDB)
- Daily cutoff processing
- Light and dark themes

**Out of scope (future):**

- TTS / pronunciation (deferred)
- Cloud sync, user accounts, sharing decks
- Multiple language pairs and separate per-pair spaces, including monolingual spaces (e.g. English → English)
- User-contributed examples
- Speech recognition for spoken answers
- Mobile native apps

## 5. Tech Stack & Constraints

| Layer | Choice |
|---|---|
| Build | Vite |
| Language | TypeScript |
| UI | React |
| Storage | IndexedDB (`idb` / Dexie) |
| Translation | TranslateGemma via Transformers.js (local, WebGPU/WASM) |
| Answer check | Local normalized comparison (no server) |
| Examples | Tatoeba public API (free, no key) |
| Auth | None (prototype) |
| Deployment | Static site |
| Bundle target | Initial JS < 500 KB gzipped; models loaded on demand |
| Layout | Mobile-first |

TTS is intentionally excluded from the current version.

## 6. Glossary

| Term | Meaning |
|---|---|
| **Card** | Atomic unit — an English word or phrase the user wants to learn |
| **Copper** | Status of a newly added card; first distillation stage |
| **Silver** | Status of a card that failed distillation once; second stage |
| **Gold** | Status of a card that failed distillation twice; third and final stage |
| **Learned** | Status of a card that passed distillation at any stage; archived and shown in English only |
| **Unlearned** | Status of a card that failed the gold stage; archived with its translation, not tested again unless re-learned |
| **Current Day** | Cards added today, waiting for the daily cutoff |
| **Distillation** | Test event: the user sees the English word and types the Russian translation |
| **Cutoff** | Daily local midnight when Current Day cards move into the archive as waiting cards |
| **Freeze** | The fixed 14-calendar-day interval before a card is due; due time is always local `00:00` |
| **Due date** | `startOfDay(createdAt) + 14 days`, or `startOfDay(lastAttemptAt) + 14 days`; always local `00:00` |
| **Archive** | View containing learned, unlearned, and waiting cards in ordered blocks |
| **Waiting** | A card that is frozen until its due date; shown as an empty status-colored card |

## 7. Domain Entities

### 7.1 `Settings`

| Field | Type | Default | Description |
|---|---|---|---|
| `nativeLanguage` | ISO 639-1 | `"ru"` | User's native language (fixed) |
| `targetLanguage` | ISO 639-1 | `"en"` | Language being learned (fixed) |
| `cutoffTime` | `HH:mm` | `"00:00"` | Daily reset time (fixed for now) |
| `freezeDays` | number | `14` | Calendar days a card is frozen between distillations (fixed) |
| `theme` | `'light' \| 'dark'` | `"light"` | UI theme, changed only in Settings |
| `onboardingCompleted` | boolean | `false` | Whether the one-time intro was shown |

### 7.2 `Card`

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `word` | string | Word/phrase in English |
| `translation` | string | Russian translation (auto-generated, manual override allowed) |
| `examples` | `Example[]` | English usage examples |
| `status` | `'copper' \| 'silver' \| 'gold' \| 'learned' \| 'unlearned'` | |
| `createdAt` | ISO timestamp | |
| `statusChangedAt` | ISO timestamp | |
| `scheduledFor` | ISO timestamp \| null | Next distillation time, always local `00:00` on the due calendar day; `null` means the card is in Current Day |
| `distillationHistory` | `DistillationAttempt[]` | |

Derived location:

- **Current Day:** `status = copper` and `scheduledFor = null`.
- **Waiting:** `scheduledFor != null` and `status` in `copper | silver | gold`.
- **Due:** waiting and `scheduledFor <= now`.
- **Archive learned:** `status = learned`.
- **Archive unlearned:** `status = unlearned`.

### 7.3 `Example`

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `cardId` | UUID | |
| `text` | string | Sentence in English |
| `source` | `'tatoeba' \| 'user'` | |

### 7.4 `DistillationAttempt`

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `cardId` | UUID | |
| `attemptedAt` | ISO timestamp | |
| `userAnswer` | string | What the user typed |
| `expectedAnswer` | string | The card's translation |
| `isCorrect` | boolean | |
| `previousStatus` | `'copper' \| 'silver' \| 'gold'` | Status before the attempt |
| `resultingStatus` | `'silver' \| 'gold' \| 'learned' \| 'unlearned'` | Status after the attempt |

## 8. User Flows

### 8.1 First Launch (Onboarding)

1. App checks `onboardingCompleted`. If false → short intro.
2. Welcome screen with a brief explanation of the GoldList method.
3. Languages are preset: **Russian (native) → English (target)**; no language selection.
4. Confirm defaults (14-calendar-day freeze, midnight cutoff, theme).
5. Set `onboardingCompleted = true`; navigate to Current Day.

### 8.2 Add a Card

1. In Current Day, the user taps the card-shaped add button with a plus, at the top of the list.
2. Input for `word` in English.
3. If the word was already entered in any status, reject it and show the message **"you already knew that"**.
4. Otherwise, on submit:
   - Local TranslateGemma → `translation` (English → Russian).
   - Tatoeba API (word + English) → up to N English examples.
5. Card is created with `status = 'copper'`, `scheduledFor = null`.
6. Card appears in Current Day.
7. New words are always added with copper status.

### 8.3 Daily Cutoff (Midnight Processing)

1. At `cutoffTime` (fixed `00:00` local), the daily processor runs.
2. For each card in Current Day:
   - `scheduledFor = startOfDay(createdAt) + 14 days`. A card added on day D at any time becomes due at `00:00` on day D+14.
3. The card leaves Current Day and becomes a **waiting** card in the Archive, shown as an empty card colored by its status.

### 8.4 Distillation

1. Any waiting card with `scheduledFor <= now` appears in the Distillation view.
2. For each card:
   - Shows the English `word`, English `examples`, and the status indicator (copper / silver / gold).
   - The translation is hidden while the card is being tested.
3. The user types the Russian translation and submits.
4. Local evaluation:
   - **Correct** → `status = 'learned'`, `scheduledFor = null`, moves to the Archive's learned block (English only). Show success.
   - **Incorrect**:
     - `copper → silver`, frozen for 14 calendar days (`scheduledFor = startOfDay(attemptedAt) + 14 days`), moves to the Archive's waiting block.
     - `silver → gold`, frozen for 14 calendar days (same rule), moves to the Archive's waiting block.
     - `gold → unlearned`, moves to the Archive's unlearned block with its translation shown.
   - Show the correct translation as feedback.
5. Every attempt is recorded with its previous and resulting status.

### 8.5 Archive

The Archive is a single view divided into ordered blocks. Blocks are not switched between; cards are simply ordered:

1. **Learned** — English word and English examples only; no Russian translation.
2. **Unlearned** — English word, Russian translation, and examples.
3. **Waiting** — standardized empty cards showing only the status color (copper / silver / gold); no words or examples.

If a block has nothing to show, it is not rendered.

### 8.6 Re-learn a Card

1. The user opens a learned or unlearned card in the Archive and chooses **Re-learn**.
2. The card returns to `status = 'copper'`, `scheduledFor = null`, and appears in Current Day.
3. The status history is preserved.

### 8.7 Settings

- Switch the theme between light and dark (the only place the theme can be changed).
- Show the current app version.
- Show the current native language (Russian) and target language (English), read-only for now.
- Future: create new language pairs and separate per-pair spaces, including monolingual spaces.

## 9. Use Cases

> Format: ID · Actor · Precondition · Steps · Postcondition

### UC-01 — Complete Onboarding
- **Actor:** new user
- **Precondition:** `onboardingCompleted = false`
- **Steps:** welcome/intro → confirm preset Russian → English → confirm defaults → save
- **Postcondition:** user can add cards

### UC-02 — Add New Word Card
- **Actor:** user · **Precondition:** onboarding done, on Current Day
- **Steps:** tap the plus card → enter English word → if the word already exists, show "you already knew that" → otherwise auto-translate → fetch examples → confirm
- **Postcondition:** copper card visible in Current Day

### UC-03 — Auto-translate Word
- **Actor:** system (triggered by UC-02)
- **Steps:** load TranslateGemma (cached) → translate English → Russian → return translation

### UC-04 — Fetch Examples
- **Actor:** system (triggered by UC-02)
- **Steps:** query Tatoeba (word + English) → filter → return up to N English examples

### UC-05 — View Current Day
- **Actor:** user
- **Steps:** open Current Day → see cards added today → tap the plus card to add another
- **Postcondition:** user sees the day's new cards

### UC-06 — End-of-Day Processing (Cutoff)
- **Actor:** system (scheduled)
- **Steps:** for each Current Day card, compute `scheduledFor = startOfDay(createdAt) + 14 days` → set → remove from Current Day
- **Postcondition:** cards are waiting in the Archive as empty status-colored cards

### UC-07 — Start Distillation Session
- **Actor:** user · **Precondition:** at least one waiting card with `scheduledFor <= now`
- **Steps:** open Distillation → see due cards → start → card-by-card testing

### UC-08 — Distill: Correct Answer
- **Actor:** user
- **Steps:** enter Russian translation → normalized compare → match → `status = 'learned'` → move to Archive learned block → show success

### UC-09 — Distill: Incorrect Answer
- **Actor:** user
- **Steps:** enter Russian translation → local normalized compare → no match → show correct translation → advance status (copper → silver → gold → unlearned) → freeze 14 calendar days (`scheduledFor = startOfDay(attemptedAt) + 14 days`), except unlearned, which is archived with translation

### UC-10 — View Archive
- **Actor:** user
- **Steps:** open Archive → see learned cards (English only) first → unlearned cards (with translation) → waiting cards (empty, status-colored)
- **Postcondition:** blocks with no cards are hidden

### UC-11 — Re-learn a Card
- **Actor:** user
- **Steps:** open an archived card → "Re-learn" → card becomes copper and appears in Current Day
- **Note:** status history is preserved

### UC-12 — Change Theme
- **Actor:** user
- **Steps:** open Settings → switch light/dark → theme is saved

### UC-13 — App Startup: Check Due Distillations
- **Actor:** system
- **Steps:** on load, query waiting cards with `scheduledFor <= now` → badge the Distillation section

### UC-14 — App Startup: Process Missed Cutoffs
- **Actor:** system
- **Steps:** on load, if a cutoff passed since cards were added, run UC-06 for affected cards

## 10. Screens & Routes

| Route | Purpose |
|---|---|
| `/onboarding` | One-time method intro |
| `/` / `/today` | Current Day with the card-shaped add button |
| `/distillation` | Distillation |
| `/archive` | Archive with learned, unlearned, and waiting blocks |
| `/card/:id` | Card detail (modal or route) |
| `/settings` | Settings (theme, version, current languages) |

Modals: Add Card.

Layout notes (mobile-first):

- Word cards take the full screen width.
- The status is shown as a colored circle in the top-right corner of each card.
- The word is flush to the left edge, the translation sits below it, and English examples follow.
- On the Distillation screen, the translation is hidden until the answer is submitted.
- The flow follows current mobile UX best practices: thumb-reachable primary actions, comfortable tap targets, minimal steps, clear feedback, safe-area support, and no hover-only interactions.

## 11. Card Status Lifecycle

```
[created] → copper → (14d) → distillation ── pass ──► learned (archive, English only)
                                    │
                                  fail
                                    ▼
                                  silver → (14d) → distillation ── pass ──► learned
                                                        │
                                                      fail
                                                        ▼
                                                      gold → (14d) → distillation ── pass ──► learned
                                                                            │
                                                                          fail
                                                                            ▼
                                                                        unlearned (archive with translation)
```

Each 14-calendar-day freeze is calendar-based: `scheduledFor = startOfDay(createdAt) + 14 days` or `startOfDay(lastAttemptAt) + 14 days`, not the exact time of day the card was created.

Manual override: any archived card → copper → new cycle.

## 12. Scheduling Rules

- **Cutoff:** daily at `00:00` local (fixed for now).
- **Freeze:** always 14 calendar days, regardless of status. Due time is always local `00:00`.
- **New card:** at the next cutoff, `scheduledFor = startOfDay(createdAt) + 14 days`; the card moves to the Archive as waiting.
- **After a distillation attempt:** a failed card gets `scheduledFor = startOfDay(attemptedAt) + 14 days` and becomes waiting immediately.
- **Daily batches:** because due dates are calendar-based, cards added on consecutive days become due on consecutive days at `00:00`. After the first 14 days of adding cards, a new distillation batch is available every day from day 15 onward.
- **Distillation view:** waiting cards where `scheduledFor <= now`.
- **Intervals are not configurable** in this version.
- **Missed cutoffs** are processed on startup.

## 13. Open Questions

1. **Answer evaluation** — strict match vs. fuzzy? Synonyms? Case/punctuation normalization? Proposal: normalize (lowercase, trim, strip punctuation); accept any listed translation variant. Full multi-variant support may need a local LLM later.
2. **Re-learn destination** — Current Day or immediately waiting? Proposal: Current Day as copper.
3. **Archive interaction** — should learned cards reveal their translation on tap, or remain English-only? Current spec: English-only, with an explicit Re-learn action.
4. **Card detail** — is a dedicated card detail view needed, or is inline interaction enough? Proposal: optional modal.
5. **Tatoeba empty results** — card with no examples? Proposal: allow; examples can be added later.
6. **Tatoeba match quality** — examples may contain the word in unrelated forms. Proposal: prefer exact match, allow stemming fallback.
7. **TranslateGemma download** — first add may take 10–30 s. Proposal: show clear progress; allow manual translation override.
8. **Distillation answer language** — Russian by default (native). No target-language mode in this version.
9. **Offline-first** — core flows should work offline after first load except Tatoeba. Proposal: cache Tatoeba responses; if offline with no cache → card without examples.
10. **Cutoff configurability** — fixed at midnight for now; may become a setting later.
11. **UI language** — English or Russian? The product is for Russian speakers; proposal: Russian UI, with English kept for the repository and specs.
12. **Version source** — read the displayed app version from the build metadata (e.g. `package.json`).
13. **Timezone change (travel)** — use local time; cutoff and due dates recalculate.
14. **Delete a card** — confirm dialog; permanent removal, not archived.

## 14. Future Extensions (Out of Scope)

- TTS / pronunciation
- Multiple language pairs and separate per-pair spaces, including monolingual spaces (e.g. English → English)
- User-added examples
- Cloud sync, user accounts, sharing decks
- Speech recognition for spoken answers
- Local LLM-based semantic answer evaluation
- Reading mode / browser extension
- Mobile native apps
- Configurable cutoff and freeze duration
- Optional spaced repetition for archived cards

## 15. Non-Functional Requirements

- **Mobile-first UX:** the interface follows current mobile design best practices: full-width cards, comfortable touch targets, thumb-reachable primary actions, clear hierarchy, minimal steps, visible feedback, safe-area support, and no hover-only interactions.
- **Design:** neutral and simple; no flashy, obviously AI-generated styling.
- **Themes:** light and dark, switched only in Settings.
- **Performance:** add card < 3 s after the model is cached; the first translation may take 10–30 s; answer checking is immediate and local.
- **Offline:** all core flows work offline after the first load (except Tatoeba); translation and answer checking never require a server.
- **Privacy:** no server calls for user data. Translation and answer checking run locally; Tatoeba is public read-only.
- **Storage:** IndexedDB; call `navigator.storage.persist()` on first launch.
- **Accessibility:** WCAG AA contrast; screen-reader support on cards.
- **Localization:** UI language TBD (see Open Questions); repository and specs are in English.
- **Browser:** evergreen Chromium/Firefox/Safari, last 2 versions.
- **Version:** the current app version is displayed in Settings.

## 16. Edge Cases

1. Duplicate word added in any status (copper/silver/gold/learned/unlearned) → block with the message "you already knew that".
2. Card added at 23:59; cutoff at 00:00 → it sleeps immediately and becomes due at `startOfDay(createdAt) + 14 days`.
3. App opened after 5 days of inactivity → multiple due cards are queued; show the list.
4. Cutoff during a distillation session → distillations are still allowed; failed cards are frozen from the attempt day (`startOfDay(attemptedAt) + 14 days`).
5. Empty states: no cards, no distillations, no archive blocks.
6. Model fails to load → allow card creation without auto-translation (manual).
7. Tatoeba fetch fails → create the card without examples.
8. Card manually deleted → confirm dialog; removed permanently.
9. Gold failure → unlearned, archived with translation, no further tests unless re-learned.
10. Re-learned card → copper, appears in Current Day, status history preserved.
11. Distillation submitted at the cutoff minute → process the cutoff *after* the distillation completes.
12. A word exists as learned or unlearned and the user adds it again → block with the message "you already knew that".

## 17. SDD Split Plan

This master file can be split in two ways.

### Option A — by concern

| File | Content |
|---|---|
| `01-overview.md` | §1–4 |
| `02-glossary.md` | §6 |
| `03-tech-stack.md` | §5 |
| `04-entities.md` | §7 |
| `05-status-lifecycle.md` | §11 |
| `06-scheduling.md` | §12 |
| `07-flows.md` | §8 |
| `08-use-cases.md` | §9 |
| `09-screens.md` | §10 |
| `10-nfr.md` | §15–16 |
| `11-open-questions.md` | §13 |
| `12-future.md` | §14 |

### Option B — by feature / capability

| File | Content |
|---|---|
| `feature-onboarding.md` | UC-01 + intro screen |
| `feature-add-card.md` | UC-02, 03, 04 + add-card flow |
| `feature-current-day.md` | UC-05 + Current Day screen |
| `feature-cutoff.md` | UC-06, 14 + scheduling |
| `feature-distillation.md` | UC-07, 08, 09 + Distillation screen |
| `feature-archive.md` | UC-10, 11 + Archive blocks |
| `feature-settings.md` | UC-12 + Settings screen |
| `shared-entities.md` | §7 |
| `shared-tech.md` | §5 |
| `shared-nfr.md` | §15–16 |
| `shared-open-questions.md` | §13 |

### Recommended OpenSpec capabilities

`onboarding`, `cards`, `translation`, `examples`, `current-day`, `scheduling`, `distillation`, `archive`, `settings`, `local-persistence`.

---

**End of master spec.** Ready for review and split into per-capability SDD files.
