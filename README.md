# GoldList

A local-first GoldList vocabulary notebook for Russian speakers learning English.
Add a word, let it rest for 14 days, then try to recall its Russian translation.
Everything stays in the browser: no account and no application server.

![goldlist banner](./misc/aurum-baner.jpg)

## Features

- English-language onboarding, Current Day, Distillation, Archive, Card detail, and Settings views.
- Copper → silver → gold distillation stages with a 14-calendar-day freeze at local midnight.
- Automatic English-to-Russian translation in a Web Worker, with WebGPU and WASM fallbacks.
- Up to three Tatoeba example sentences per card, cached for offline use.
- Normalized answer checking with comma, semicolon, and slash translation variants.
- Learned cards hide the Russian translation; missed gold cards become unlearned and leave rotation.
- Re-learn and cascading delete actions for archived cards.
- IndexedDB persistence, light/dark themes, installable PWA, and offline app-shell support.
- A due-card badge and startup catch-up after the device has been asleep across midnight.

## Stack

Vite, React 19, TypeScript, React Router, Dexie (IndexedDB), `@huggingface/transformers`,
`vite-plugin-pwa`, Vitest, Testing Library, and Playwright.

## Getting started

Requires Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. The first translation downloads the TranslateGemma model;
later translations reuse the browser cache. Use Settings → Theme to switch light/dark.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and build the production app. |
| `npm run preview` | Serve the production build locally. |
| `npm test` | Run the Vitest unit and component suite. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Build and run the Playwright smoke tests. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript without emitting. |
| `npm run check:bundle` | Verify the initial JS stays under 500 kB gzipped. |

Playwright needs a browser once: `npx playwright install chromium`.

## How the app works

The domain model is intentionally small:

- `copper`: newly added, waits in Current Day until the next cutoff.
- `silver`: missed copper, rests for 14 days before the next distillation.
- `gold`: missed silver, rests for another 14 days.
- `learned`: recalled successfully, shown in the Learned archive without its translation.
- `unlearned`: missed gold, leaves rotation and remains in the Unlearned archive.

At the local-midnight cutoff, every copper card created before today receives a due date
14 days later. Distillation is atomic: the attempt and card update commit together.

## Architecture

```
src/
  app/        Providers, settings/theme, app shell, routes, startup cutoff
  data/       Dexie schema, repositories, IDs, typed errors
  domain/     Pure types, normalization, scheduling, transitions, selectors
  features/   Onboarding, add card, today, distillation, archive, detail, settings
  services/   Translation worker/client, Tatoeba adapter, cutoff scheduler, storage
  ui/         Shared components, hooks, and styles
tests/
  domain/     Pure rule tests
  data/       fake-indexeddb repository and transaction tests
  services/   Translation, Tatoeba, scheduler, and persistence tests
  features/   Testing Library page and flow tests
  app/        Routing, guards, and shell tests
  e2e/        Playwright smoke and offline tests
scripts/      Production bundle budget check
docs/         Manual accessibility and mobile checklists
openspec/     Change proposals, specs, design, and task history
```

## Translation model

GoldList uses
[`onnx-community/translategemma-text-4b-it-ONNX`](https://huggingface.co/onnx-community/translategemma-text-4b-it-ONNX)
through `@huggingface/transformers`. The worker tries WebGPU with `q4f16` and falls back
to WASM with `q4`. The model is loaded lazily on the first translation, not at app startup.

- The first translation can download hundreds of megabytes to a few gigabytes depending
  on the selected dtype and browser cache state. Show the progress bar and keep the tab open.
- The model is cached by the browser after the first successful download.
- A timeout or download/model failure switches the Add Card form to manual translation;
  the app remains usable without the model.
- Model/dtype defaults live in `src/services/translation/worker.ts` and can be changed there.
- TranslateGemma is a Gemma model. Its use is subject to the
  [Gemma Terms of Use](https://ai.google.dev/gemma/terms). Review the model card before
  redistributing model files or hosting the app at scale.

## Offline behavior and storage

- `vite-plugin-pwa` precaches the app shell and generated assets; navigation falls back to
  `index.html` for client-side routes.
- Tatoeba examples are cached in IndexedDB for 30 days. Requests time out and fail soft;
  a card can always be saved without examples.
- The app requests persistent browser storage once on first launch. Denial is non-fatal.
- Deleting browser site data removes all cards and settings; export is not part of this MVP.

## Tatoeba attribution

Example sentences are fetched from the
[Tatoeba API](https://api.tatoeba.org) at request time. Tatoeba sentences are published
under [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/); attribution is shown
in this README and the app links back to Tatoeba through the sentence source metadata.

## Deployment

The build output in `dist/` is fully static.

1. Run `npm run build`.
2. Upload `dist/` to any HTTPS static host (Netlify, Cloudflare Pages, GitHub Pages, S3, nginx).
3. Configure an SPA fallback so unknown paths serve `index.html`.
4. Serve over HTTPS: service workers and persistent storage require a secure context
   (`localhost` is treated as secure for development).
5. Do not strip `sw.js`, `manifest.webmanifest`, or the `assets/` directory.
6. Run `npm run check:bundle` in CI after `npm run build`; it reads the initial JS files
   from `dist/index.html`, excludes lazy chunks and model files, and enforces the 500 kB
   gzipped budget.
7. Playwright starts its own preview server; in CI run `npm run test:e2e` after installing
   Chromium. Set `CI=1` to disable server reuse.

No environment variables are required for production. `VITE_E2E=1` swaps in a fake
translation service for Playwright only and must not be used for a real deployment.

## Limitations

- The UI is English-only.
- The language pair is fixed to Russian native speakers learning English.
- Automatic translation depends on a large model download and a capable browser.
- Tatoeba examples depend on a third-party API; offline cards may have no examples.
- There is no account sync, import, or export in this MVP.
- The GoldList method is a practical heuristic, not a clinically proven protocol.

## Manual checks

See [docs/manual-checks.md](docs/manual-checks.md) for the mobile, accessibility, offline,
translation, and cutoff checklist that complements the automated suite.

## About the method

GoldList is a low-effort vocabulary-learning technique popularized by David James.
A learner writes a short list of words or phrases together with their meanings, then sets
it aside. After a rest period of roughly two weeks, the learner performs a "distillation":
they test themselves on each item and copy only the ones they could not recall into a new,
shorter list. The cycle repeats at spaced intervals, and every pass strips away remembered
items until only a small "gold list" of stubborn words remains. The method deliberately
avoids cramming: the rest periods, the act of writing, and the gradual narrowing are meant
to let long-term memory do the work.

The method is not a formally validated protocol, but its mechanics align with robust
findings in cognitive psychology. Spacing study over time yields better long-term retention
than massing it together (the spacing effect; see Ebbinghaus's forgetting curve and Cepeda
et al.'s 2006 meta-analysis). Retrieving information from memory strengthens it more than
rereading (the testing effect; Roediger & Karpicke, 2006). Concentrating later study on the
items that were not recalled resembles corrective restudy after retrieval practice, and the
increasing intervals approximate expanding retrieval schedules — the "desirable
difficulties" that make learning effortful but durable (Bjork & Bjork, 2011).

This app digitizes that workflow while preserving its low-friction, local-first spirit:
words are captured as they are encountered, spaced distillations are scheduled
automatically, and all data stays in the browser. Because the specific GoldList protocol
has little direct experimental evidence, the app treats it as a practical heuristic built
on well-established spacing and retrieval principles rather than a proven optimal method.
Its goal is to make consistent, low-stress practice easy enough to sustain.
