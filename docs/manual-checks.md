# Manual checks

Run these after a production build (`npm run build && npm run preview`) on a phone-sized viewport.

## Mobile layout

- Onboarding, Current Day, Distillation, Archive, Card detail, and Settings fit a 390 px wide screen without horizontal scrolling.
- The bottom navigation remains reachable and does not cover the final card or form control.
- The Add Card sheet scrolls when the keyboard is open and keeps Save/Cancel reachable.
- Tap targets (navigation links, theme buttons, status/action buttons) are at least 44 px tall.
- Cards are full width and the skip link appears on first Tab.
- Safe-area insets are respected on a notched device (portrait and landscape).

## Accessibility and focus

- Every status circle is announced as "Status: Copper/Silver/Gold/Learned/Unlearned".
- Waiting cards are announced as "Waiting copper/silver/gold card" and never expose the word or translation.
- The add-card dialog traps focus, closes with Cancel, and returns focus to the add button.
- Buttons have visible focus rings and all controls are operable with the keyboard only.
- Text and status colors meet contrast in both light and dark themes.
- The distillation answer can be submitted with Enter, and feedback is announced after submission.

## Offline and storage

- Load the app online once, then switch the browser to offline and reload; onboarding/Current Day still renders.
- Adding a card offline falls back to manual translation and saves locally.
- A card distilled offline remains learned after an online reload.
- Denying persistent storage does not block startup, adding, or distilling.

## Translation smoke test

- With a real browser online, add a new word and confirm the model download progress appears, then a Russian translation fills in.
- If WebGPU is unavailable, confirm the WASM path still produces a translation.
- Deny network access after the first model download and confirm the cached model still translates.

## Cutoff

- Add a card before local midnight, leave the app open, and confirm it moves to Waiting after midnight.
- Put the device to sleep across midnight, reopen the app, and confirm the startup catch-up moves the card.
