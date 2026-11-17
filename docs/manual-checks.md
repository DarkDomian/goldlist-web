# Manual checks

Run these after a production build (`npm run build && npm run preview`) on a phone-sized viewport.

## Mobile layout

- Onboarding, Current Day, Distillation, Archive, Card detail, and Settings fit a 390 px wide screen without horizontal scrolling.
- The bottom navigation remains reachable and does not cover the final card or form control.
- The Add Card sheet scrolls when the keyboard is open and keeps Save/Cancel reachable.
- Tap targets (navigation links, theme buttons, status/action buttons) are at least 44 px tall.
- Cards are full width and route changes focus the main region without scrolling past it.
- Learned and unlearned archive chips show only the word, wrap across rows, and remain at least 44 px tall.
- Waiting chips show only Copper, Silver, or Gold with crisp metallic backgrounds and no blur.
- Forward navigation starts at the top of the page; browser Back restores the previous scroll position.
- Safe-area insets are respected on a notched device (portrait and landscape).

## Accessibility and focus

- Every status circle is announced as "Status: Copper/Silver/Gold/Learned/Unlearned".
- Waiting cards are announced as "Waiting copper/silver/gold card" and never expose the word or translation.
- The add-card dialog traps focus, closes with Cancel, and returns focus to the add button.
- Buttons have visible focus rings and all controls are operable with the keyboard only.
- Text and status colors meet contrast in light, dark, and system themes; System follows device changes.
- Automatic and Manual example selection both persist after reload; Manual allows zero to three choices and custom examples.
- The distillation answer can be submitted with Enter, and feedback is announced after submission.

## Offline and storage

- Load the app online once, then switch the browser to offline and reload; onboarding/Current Day still renders.
- Adding a card offline falls back to manual translation and saves locally.
- A card distilled offline remains learned after an online reload.
- Denying persistent storage does not block startup, adding, or distilling.

## Translation smoke test

- With a real browser online, add a new word and confirm one shared status bar shows the percentage above the bar and the phase in the summary, then a Russian translation fills in.
- If WebGPU is unavailable, confirm the same status bar reports the fallback while the WASM path produces a translation.
- Deny network access after the first model download and confirm the cached model still translates.

## Data portability

- Settings → Your data → Export downloads valid JSON with schemaVersion 1 and no Tatoeba cache.
- Import a valid file and confirm the preview counts before choosing Merge or Replace.
- Merge skips duplicate IDs and normalized words and reports imported/skipped counts.
- Replace asks for confirmation, downloads a backup JSON first, and leaves the prior data untouched if the download fails.
- Import a malformed or newer-schema file and confirm the error without data changes.

## Cutoff

- Add a card before local midnight, leave the app open, and confirm it moves to Waiting after midnight.
- Put the device to sleep across midnight, reopen the app, and confirm the startup catch-up moves the card.
