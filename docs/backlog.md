# Backlog

Post-MVP ideas captured during the MVP review. This is an inbox, not a specification. When an item is ready to implement, promote it to an OpenSpec change under `openspec/changes/`; group related items into one shippable patch instead of creating one change per bullet.

## To implement

### Work with card:

- [ ] `ux` Redesign card content around a fixed card height: show only what fits, fade the last visible line/example to hint that more content follows, while the card actually holds the full list. Apply the fade only when content overflows, keep all content available to screen readers, and prioritize user-added examples over Tatoeba examples.

- [ ] `ux` Let the user pick examples from a examples candidate list (taken from Tatoeba) while creating new card. Make switcher in settings - get first n examples automaticly or choose by userself. Example hint about better choose your own then automated:  Fetching more candidates and letting the user choose gives better control than silently taking the first results; reducing the default count is the cheaper fallback. Apply the chosen examples consistently in Current Day, Distillation, and Card detail.

- [ ] `feature` Let users add custom usage examples to a card. Support create/edit/delete with a `user` source alongside Tatoeba examples, and show them in Current Day, Distillation, and Card detail. It possible to do on choosing from suggested or in card details.

- [ ] `ux` Unify the LLM loading status display. Concurrent model load/download operations currently compete for the same progress UI, so the status jumps between requests. Replace per-request progress with one shared loading state for the whole model/download lifecycle: queued, downloading with aggregate progress, initializing, ready, error. Procentage shown above bar, not in summary of procces. Keep it consistent across Add Card and any future consumers, including the WebGPU-to-WASM fallback.

### Archive looks and card features

- [ ] `feature` Allow moving any known card (`learned` or `unlearned`) from Archive back to Today to restart the repetition cycle. New button in card ditails stored in archive for that (button exist only for card whose status is learned / unlearned). Define how the cycle resets `status`, `scheduledFor`, and `statusChangedAt` while preserving the card, examples, and attempt history.

- [ ] `ux` Make Archive cards compact: render them as bordered word chips, multiple per row, instead of full-width cards. Apply the same compact treatment to hidden/unlearned cards. Keep the learned/unlearned/waiting block order, readable labels, and adequate tap targets. Hidden cards on froze looks like metal gradient with status (cooper, silver, gold) not blured.


### Other

- [ ] `ui` Fix the plus sign on the Add a word card. It currently renders incorrectly because it is a styled `span`; replace it with an inline SVG icon, align it with the label, and keep an accessible text label.

- [ ] `ux` Remove the skip-link and implement normal scrolling between screens instead. Audit route scroll restoration and focus management so keyboard and screen-reader navigation still works without the skip-link.

- [ ] `feature` Add a light/dark/system theme switch in Settings. Persist an explicit user choice, make `system` follow `prefers-color-scheme` changes at runtime, set `color-scheme`, and avoid a flash of the wrong theme on startup.

- [ ] `feature` Add data import and export in Settings. Design a versioned JSON contract for settings, cards, examples, and attempts that avoids breaking changes: an envelope with `schemaVersion`, `exportedAt`, `appVersion`, and `payload`; additive fields only; unknown fields ignored on import; explicit migrations for older versions. Define validation, preview/dry-run, conflict handling (merge, skip, overwrite), ID preservation/remapping, and a backup before destructive imports. Cover round-trip and older-export compatibility in tests.

## Waiting

- [ ] `bug` Investigate why automatic translation does not work (the neural model does not respond). Check worker startup, model asset URL/CORS, device/dtype selection, WebGPU availability and WASM fallback, timeouts, and error propagation. Add enough diagnostics to distinguish download, initialization, inference, and timeout failures, and keep the manual-translation fallback usable. Add a repeatable manual smoke test for a real browser.

- [ ] `feature` Add a translation-provider switch in Settings: local TranslateGemma (default and preferred because it works offline) versus open translation providers. Introduce a provider abstraction with a fallback chain, privacy notes, API-key/rate-limit handling where applicable, and clear offline/error states. Verify provider capabilities before implementation: Tatoeba is primarily a sentence corpus and may not offer translation, so an open translation engine such as LibreTranslate may be required instead.

- [ ] `tech` Investigate whether the model is downloaded again on a new day or browser reload, and whether installing the app as a web app still re-downloads it. Check Cache Storage/IndexedDB persistence, HTTP cache headers, Transformers.js caching, service-worker runtime caching, storage eviction, and origin differences between dev, preview, and installed PWA. If the model cannot be cached reliably, reconsider its size/architecture. Add a visible cache/storage status and avoid re-downloading on every launch.

- [ ] `bug` On narrow screens, switching between Settings and Today makes the menu jump. Check viewport height units (`100vh`/`dvh`), fixed/sticky positioning, scrollbar width, and page height changes; stabilize the layout across routes.

- [ ] `ui` Reduce the excessive top spacing above the word on cards. There are no explicit margins causing it, so the issue is likely font metrics/line-height; normalize the typography and spacing tokens so the visual gap matches the intended layout.

- [ ] `feature` Check whether a word already exists, but never block adding it: slang and rare words may be missing from dictionaries. Allow adding custom words with a custom translation and examples, mark them as user-provided, and keep the flow usable offline.

- [ ] `feature` Investigate adding words through the mobile share sheet. If the Web Share Target API is viable, accept shared text/links from other apps and turn them into cards; measure whether the app can process a share without forcing the user to open it manually. Account for platform differences: Android Chrome has better support than iOS Safari, so provide a paste fallback. Define text/URL parsing, duplicate handling, offline behavior, and what happens when the app is closed. Decide how this interacts with manual example selection: defer example choice, pick random Tatoeba examples, or place shared words in a virtual "pending shares" queue with a button/badge. Add a Settings toggle for automatic processing versus queued/random processing.

- [ ] `feature` Add clipboard autofill. Provide an explicit "Paste from clipboard" action in Add Card that reads text through `navigator.clipboard.readText()` on a user gesture only, never automatically on page load. Normalize the pasted text into a word or short phrase, and handle permission denial, insecure contexts, and Safari differences with a manual-paste fallback. Consider reusing the same parser as the mobile share flow.

## Resolved

- [*] `ui` Set `align-items: center` on `.app-header` so header items align consistently across screens.