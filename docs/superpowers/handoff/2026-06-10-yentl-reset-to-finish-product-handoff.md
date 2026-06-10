# Yentl Reset-To-Finish Product Handoff - 2026-06-10

## Executive Summary

This handoff reflects the product-first continuation after killing the unattended
loop approach. The current objective is still the full Yentl finish line: robust
web/PWA/Chrome extension/mobile-web/TV experience, reliable ingestion across
source types, account-backed saved sessions, sharp explainable analysis, and
launch-grade QA.

Current practical progress score: about **6.3 / 10** toward that top-level goal.

Yentl is no longer just scaffolded. The repo has working proof for:

- installed Chrome extension local tab capture and first live transcript
- mobile/PWA key-route behavior at 390, 430, and 768px
- local API ingestion for consent gate, article URL, direct media WAV, PDF text
  layer, and YouTube captions
- full TypeScript, full Vitest, lint-with-warnings, and automation build

The app is still not launch-complete. Remaining work is concentrated around
broader real-world ingestion proof, native-shell decisions, real account/cloud
deployment behavior, external extension pages, analysis quality/eval depth, and
final launch/security/accessibility sweeps.

## Current Repo State

Working directory:

```bash
/Users/israelbitton/Live FactCheck
```

Important operating constraints from the reset plan:

- No unattended loops or cron ladders are approved.
- Do not stage, commit, push, deploy, or install dependencies unless explicitly
  approved.
- The worktree is highly dirty. Do not revert unrelated product work.
- Treat current files, generated proof JSON, screenshots, and command output as
  the source of truth.

The tree contains many modified tracked files and many untracked product/proof
files. This is expected for the current stabilization phase; do not assume a
clean branch.

## Verified Gates

Latest broad gates passed after the extension/mobile work:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
```

Observed results:

- TypeScript: passed.
- Lint: passed with `0` errors and existing `18` warnings.
- Full tests: `154` test files passed, `1688` tests passed.
- Automation build: Next build passed, generated `42/42` static pages.

Extension-specific gates passed:

```bash
npm run extension:proof:local
npm run extension:check
npx vitest run tests/installed-extension-proof-script.test.ts tests/extension-package-check.test.ts tests/extension-popup.test.ts tests/extension-content-script.test.ts tests/extension-offscreen.test.ts tests/extension-panel-view.test.tsx tests/extension-bridge.test.tsx tests/extension-same-page.test.ts
```

Mobile/PWA-specific gates passed:

```bash
npm run mobile:proof:local
npx vitest run tests/mobile-pwa-proof-script.test.ts tests/public-entry-pages.test.tsx tests/manifest.test.ts tests/ux-flow-dashboard.test.tsx tests/sessions-library-page.test.tsx
```

Ingestion API proof passed:

```bash
npm run ingestion:proof:local
npx vitest run tests/ingestion-proof-script.test.ts tests/api/article-ingest.test.ts tests/api/media-ingest.test.ts tests/api/document-ingest.test.ts tests/api/youtube-ingest.test.ts
```

## Verified Proof Artifacts

### Chrome Extension Installed-Capture Proof

Primary command:

```bash
npm run extension:proof:local
```

Artifacts:

- `docs/superpowers/validation/installed-extension-local-proof.json`
- `docs/superpowers/validation/screenshots/installed-extension-local-fixture.png`
- `agent-work/product-build-evidence/2026-06-09-m6-installed-extension-local-proof.md`

What the latest proof shows:

- unpacked extension loaded in Chrome for Testing
- OS-level `Alt+Shift+Y` invoked the extension
- same-page panel injected into `/validation/browser-capture.html`
- `tabCapture` reached running state
- `OFFSCREEN_DOCUMENT` context existed
- badge text was `REC`
- validation audio playback succeeded after capture started
- panel iframe received a transcript line
- `live_transcription_proven: true`

Important remaining extension gate:

```bash
YENTL_EXTENSION_PROOF_MANUAL_CAPTURE=1 npm run extension:proof:local
```

That manual mode still needs to prove the toolbar/popup click path, not only the
keyboard command path. Store-readiness also needs at least one real external
media page proof and repeated latency measurements.

### Mobile/PWA Local Proof

Primary command:

```bash
npm run mobile:proof:local
```

Artifacts:

- `docs/superpowers/validation/mobile-pwa-local-proof.json`
- `agent-work/product-build-evidence/2026-06-10-m4-mobile-pwa-local-proof.md`
- `docs/superpowers/validation/screenshots/route-mobile.png`
- `docs/superpowers/validation/screenshots/route-mobile-mobile.png`
- `public/visual-evidence/flow-screenshots/current/route-mobile.png`
- `public/visual-evidence/flow-screenshots/current/route-mobile-mobile.png`

Routes and widths covered:

- `/mobile`
- `/session`
- `/session?title=Shared%20note&text=The%20claim%20is%20specific.`
- `/sessions`
- `/tv?demo=validation&sample=cable_008`
- widths: `390`, `430`, `768`

What the proof shows:

- no horizontal overflow on those routes
- no console/runtime errors on those routes
- the PWA/mobile start page makes iOS, Android, and mobile-web limits explicit
- share-target text lands in the text ingest route
- saved sessions render local fallback without a cloud-sync console error
- TV room mode renders the validation sample on narrow/tablet widths

Product fix made from this proof:

- `app/sessions/page.tsx` now skips cloud-sync fetches when
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent, avoiding a noisy local `503`
  while preserving the local fallback UI.

### Ingestion API Local Proof

Primary command:

```bash
npm run ingestion:proof:local
```

Artifact:

- `docs/superpowers/validation/ingestion-local-proof.json`

What it currently proves:

- missing source-analysis consent returns `428 SOURCE_CONSENT_REQUIRED`
- `/api/article-ingest` imports the local validation article fixture
- `/api/media-ingest` imports the local synthetic WAV fixture
- `/api/document-ingest` extracts selectable text from
  `public/validation/yentl-small-text-layer.pdf`
- `/api/youtube-ingest` returned `241` transcript segments for
  `https://www.youtube.com/watch?v=fTznEIZRkLg`

Latest result summary:

```json
{
  "ok": true,
  "checks": [
    "consent-gate",
    "article-url-ingest",
    "direct-media-url-ingest",
    "pdf-document-ingest",
    "youtube-caption-ingest"
  ],
  "failures": []
}
```

## Started But Not Verified

The file below was added just before this handoff request and has **not** yet
been wired into `package.json`, guarded by a test, or run:

- `scripts/validation/prove-text-document-fixtures.ts`

Intent of that unfinished script:

- prove TXT parsing from `public/validation/yentl-synthetic-transcript.txt`
- prove Markdown parsing and outline generation from
  `public/validation/yentl-synthetic-transcript.md`
- prove DOCX extraction through Mammoth from
  `public/validation/yentl-small-brief.docx`
- prove SRT/VTT timed-caption parsing from
  `public/validation/yentl-synthetic-captions.srt` and `.vtt`

Recommended next pickup for ingestion:

1. Add a static test like `tests/text-document-fixtures-proof-script.test.ts`.
2. Wire the script into `package.json`, either as
   `ingestion:proof:text-docs` or as the second half of
   `ingestion:proof:local`.
3. Run the script with `npx tsx scripts/validation/prove-text-document-fixtures.ts`.
4. If it passes, add/update an evidence note for M2 ingestion completeness.
5. Then rerun `npx tsc --noEmit`, focused tests, `npm run test:run`, and
   `npm run build:automation`.

Do not claim TXT/MD/DOCX/SRT/VTT fixture proof complete until that script is
run or equivalent current evidence exists.

## Files Touched In The Latest Product-Proof Passes

High-signal additions/changes:

- `scripts/validation/prove-installed-extension-local.mjs`
- `scripts/validation/prove-mobile-pwa-local.mjs`
- `scripts/validation/prove-ingestion-local.mjs`
- `scripts/validation/prove-text-document-fixtures.ts` (started, unverified)
- `scripts/visual-evidence/capture-launch-screenshots.ts`
- `tests/installed-extension-proof-script.test.ts`
- `tests/mobile-pwa-proof-script.test.ts`
- `tests/ingestion-proof-script.test.ts`
- `tests/sessions-library-page.test.tsx`
- `tests/ux-flow-dashboard.test.tsx`
- `app/sessions/page.tsx`
- `components/session/az-flow-dashboard.tsx`
- `docs/browser-tab-capture.md`
- `package.json`

Proof/evidence outputs:

- `docs/superpowers/validation/installed-extension-local-proof.json`
- `docs/superpowers/validation/mobile-pwa-local-proof.json`
- `docs/superpowers/validation/ingestion-local-proof.json`
- `docs/superpowers/validation/screenshots/installed-extension-local-fixture.png`
- `docs/superpowers/validation/screenshots/route-mobile.png`
- `docs/superpowers/validation/screenshots/route-mobile-mobile.png`
- `public/visual-evidence/flow-screenshots/current/route-mobile.png`
- `public/visual-evidence/flow-screenshots/current/route-mobile-mobile.png`
- `agent-work/product-build-evidence/2026-06-09-m6-installed-extension-local-proof.md`
- `agent-work/product-build-evidence/2026-06-10-m4-mobile-pwa-local-proof.md`

## Milestone Status

| Milestone | Current Status | Evidence | Remaining Work |
|---|---:|---|---|
| M0 Stabilize | Mostly green locally | `tsc`, full tests, lint, automation build passed | Dirty tree still needs packaging/commit discipline later |
| M1 Core Session UX | Partial | many focused tests and existing screenshots | deeper browser walkthroughs of every session tab/detail/export/end flow |
| M2 Ingestion Completeness | Improved | API proof now covers consent/article/media/PDF/YouTube | finish TXT/MD/DOCX/SRT/VTT fixture proof, upload/audio edge proof, real external article/media proof |
| M3 Analysis Intelligence | Partial | ownership/attribution tests and prior evidence notes | corpus/eval replay, sharper uncertainty/meta-read proof, source evidence scoring review |
| M4 Mobile/PWA Polish | Improved | `mobile:proof:local`, `/mobile` screenshots | more source-specific mobile bottom sheets and auth recovery captures |
| M5 Cloud Sync | Partial | cloud/local saved-session code and tests exist | real configured auth/database proof across devices |
| M6 Extension + TV | Improved | installed extension proof with first transcript, TV included in mobile proof | toolbar/popup proof, real external pages, latency measurements, store packaging |
| M7 Launch QA | Not complete | build/test/lint smoke is green | accessibility/security/upload/quota/legal/copy/deploy checks |

## Current Known Warnings

`npm run lint` passes with `0` errors and `18` warnings. The warnings are
existing cleanup items, including:

- `app/session/layout.tsx` missing hook dependency warning
- unused eslint-disable / unused variable warnings in several scripts/tests
- a few unused test imports

These warnings are not currently blocking the product proofs, but they should be
cleaned before launch if the goal is a quiet CI surface.

## Next Best Work Sequence

The fastest path from here is:

1. Finish the text/document fixture proof.
   - Wire/run `scripts/validation/prove-text-document-fixtures.ts`.
   - Prove TXT, Markdown, DOCX, SRT, and VTT from actual validation files.

2. Expand ingestion proof to real external targets.
   - Add one real external article URL proof.
   - Add one real direct media URL proof or explicitly document why the proof is
     fixture-only in local development.
   - Keep SSRF/consent behavior covered.

3. Prove the normal extension click path.
   - Run `YENTL_EXTENSION_PROOF_MANUAL_CAPTURE=1 npm run extension:proof:local`.
   - Then prove a real external media page with the installed extension.

4. Move from local cloud-sync code to configured cloud proof.
   - Verify Clerk/database configuration.
   - Save on one browser/device profile, restore from another, rename/delete,
     export, and TV-open a saved session.

5. Run an M3 analysis-quality pass.
   - Use corpus replay and speaker-attribution scoring.
   - Verify Yentl's read/meta-view preserves whole-source context, ownership,
     uncertainty, and evidence trail.

6. Do launch QA.
   - `npm run smoke:launch` against the intended base URL.
   - Accessibility/touch/focus pass.
   - Upload constraints and SSRF/security pass.
   - Copy/legal/trust consistency pass.

## Commands To Resume From Here

Useful immediate commands:

```bash
node --check scripts/validation/prove-ingestion-local.mjs
npx tsx scripts/validation/prove-text-document-fixtures.ts
npm run ingestion:proof:local
npm run mobile:proof:local
npm run extension:proof:local
npx tsc --noEmit
npm run test:run
npm run build:automation
```

If completing the unfinished text-document proof, add a focused test first or
immediately after:

```bash
npx vitest run tests/ingestion-proof-script.test.ts tests/text-ingest.test.ts
```

Then broaden to:

```bash
npm run test:run
npm run build:automation
```

## Non-Goals / Do Not Do Accidentally

- Do not restart loop automation work.
- Do not mutate permanent automations.
- Do not stage/commit/push/deploy without explicit approval.
- Do not call the whole app complete based only on local fixture proof.
- Do not treat the new text-document fixture script as verified until it runs.
- Do not claim native iOS/Android shells exist; current mobile target is
  honest mobile-web/PWA/share/import support.

## Bottom Line

The latest work made Yentl stronger in three launch-critical places:

- extension capture now has real local installed-extension transcript proof
- mobile/PWA now has repeatable no-overflow/no-console proof for key routes
- ingestion now has a repeatable API proof for several core source paths

The next agent should finish the interrupted text/document fixture proof first,
then proceed into real external ingestion/extension proof and configured
cloud-sync validation. That is the shortest path from the current 6.3/10 state
toward a genuinely robust product.
