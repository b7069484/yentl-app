# Yentl handoff - extension, source UI, corpus functional samples

Date: 2026-05-21
Branch: `codex/yentl-functional-samples-extension-handoff`
Workspace: `/Users/israelbitton/Live FactCheck`

## Executive state

This branch moves the user-facing `/session` experience away from the internal project-management UI, adds the first real Chrome-extension same-page analysis path, and wires replay-backed corpus samples into the actual Watch UI so there is something functional to inspect without waiting on live extension setup.

The prior committee-style UX audit is preserved in:

- `docs/superpowers/handoff/2026-05-20-worldclass-ux-committee-audit-pickup.md`

That audit was a simulated expert-lens review, not feedback from the named executives themselves. Its P0 findings are partially addressed here: user/project UI separation, truthful browser-tab status, source escape hatches, filtered-list detail routing, and the same-page extension direction.

The product direction is now explicit:

- `/session` is for the end user.
- `/project/flows` is the internal UX flow atlas.
- `/project/validation` is the internal validation lab.
- Browser-tab capture is intended to happen on the same page as the media: the extension injects a Yentl side panel into the active page instead of asking the user to play media elsewhere and watch Yentl in a separate tab.
- The fallback proof path is not a mock: `/session?sample=<id>&view=watch` loads real Deepgram transcript artifacts plus replayed claims/markers into the production Watch components.

## What changed

### Session and source-picker UX

- Removed the full session header from the pre-session source picker. The source picker now starts with the Yentl wordmark and the actual source choices.
- Removed the old "Choose a source to begin" speaker rail from the pre-session state.
- Promoted "Analyze a video I can play" as the primary first source because that is the core "any video on any page" product experience.
- Added a "Sources" control during active sessions so users can return to source selection without being trapped in a waiting state.
- Kept the consent notice, but converted it into a contained rounded notice that does not cut awkwardly across the full screen.

Key files:

- `app/session/page.tsx`
- `app/session/layout.tsx`
- `components/session/session-shell.tsx`
- `components/session/source-picker.tsx`
- `components/session/TwoPartyDisclosure.tsx`
- `components/session/speaker-rail.tsx`
- `lib/client/source-router.tsx`

### Browser-tab / Chrome extension path

- Added a Chrome MV3 extension scaffold under `extension/`.
- Added content-script injection so Yentl appears as a same-page side panel on the active media page.
- Added tab-audio/offscreen capture plumbing.
- Added page-text extraction so article pages and non-media pages can still send readable text into Yentl.
- Added `ExtensionBridge` in the app to receive extension messages, update capture status, append transcript segments, and route final utterances through the existing claim/rhetoric pipeline.
- Added a dedicated browser-tab ingest pane with realistic copy, Chrome-only expectations, and links to validation samples.
- Added a compact extension-panel surface at `/session?surface=extension-panel`.

Key files:

- `extension/manifest.json`
- `extension/background.js`
- `extension/content-script.js`
- `extension/offscreen.js`
- `extension/options.html`
- `extension/options.js`
- `components/session/ExtensionBridge.tsx`
- `components/session/extension-panel-view.tsx`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`
- `docs/browser-tab-capture.md`

### Watch UI and replay-backed functional samples

- Added `/api/corpus-sample?id=solo_005|cable_008|israel_010`.
- Added `/session?sample=<id>&view=watch`, which loads transcript, speaker, claim, and marker data from local corpus artifacts into the real session store.
- Added corpus sample cards to the browser-tab pane and `/project/validation`.
- Updated Watch to treat the media player as the anchor: source header, 16:9 player, synced evidence queue, transcript column, and claims/markers around the media instead of floating in sparse space.

Functional samples:

- `http://localhost:3000/session?sample=solo_005&view=watch`
- `http://localhost:3000/session?sample=cable_008&view=watch`
- `http://localhost:3000/session?sample=israel_010&view=watch`

Key files:

- `app/api/corpus-sample/route.ts`
- `app/session/page.tsx`
- `components/session/watch-view.tsx`
- `lib/validation/fixtures.ts`
- `test-corpus/transcripts/cable_008.json`
- `test-corpus/transcripts/israel_010.json`
- `test-corpus/scores/solo_005.replay.json`
- `test-corpus/scores/cable_008.replay.json`
- `test-corpus/scores/israel_010.replay.json`

### Internal project screens separated from user UI

- Moved the UX flow atlas out of `/session?view=flows` and into `/project/flows`.
- Added `/project/validation` as a project-only validation lab with fixture coverage, corpus proof, and a runbook.
- Kept internal project pages visually distinct from the end-user source/session experience.

Key files:

- `app/project/flows/page.tsx`
- `app/project/validation/page.tsx`
- `components/session/ux-flow-dashboard.tsx`
- `tests/ux-flow-dashboard.test.tsx`
- `tests/project-validation-page.test.tsx`

### Validation assets and docs

- Added deterministic local source fixtures under `public/validation/`.
- Added real webpage validation targets for:
  - Wikimedia Commons playable WebM page.
  - Wikinews article page without relying on playable media.
- Added browser screenshots proving the current browser-tab pane and corpus sample screens render without horizontal overflow.
- Added source-validation proof doc and reusable real-webpage target verifier.

Key files:

- `public/validation/browser-capture.html`
- `public/validation/extension-panel-preview.html`
- `public/validation/yentl-synthetic-panel.wav`
- `public/validation/yentl-synthetic-panel.mp4`
- `public/validation/yentl-synthetic-transcript.txt`
- `public/validation/yentl-synthetic-transcript.md`
- `public/validation/yentl-synthetic-captions.vtt`
- `public/validation/yentl-synthetic-captions.srt`
- `docs/superpowers/validation/2026-05-20-source-validation-proof.md`
- `docs/superpowers/validation/real-webpage-targets.json`
- `docs/superpowers/validation/screenshots/browser-tab-pane-functional-samples.png`
- `docs/superpowers/validation/screenshots/browser-pane-working-sample-loaded.png`
- `docs/superpowers/validation/screenshots/corpus-functional-sample-cable-008.png`
- `docs/superpowers/validation/screenshots/project-validation-corpus-samples.png`
- `scripts/validation/verify-real-webpage-targets.mjs`

## URLs to inspect first

With `npm run dev` running:

- End-user source picker: `http://localhost:3000/session`
- Browser-tab ingest pane: select "Analyze a video I can play" from `/session`
- Functional Watch sample: `http://localhost:3000/session?sample=cable_008&view=watch`
- Validation lab: `http://localhost:3000/project/validation`
- Flow atlas: `http://localhost:3000/project/flows`
- Corpus report from the other corpus session: `http://localhost:3000/corpus-report/index.html`
- Local same-page extension fixture: `http://localhost:3000/validation/browser-capture.html`
- Extension panel preview: `http://localhost:3000/validation/extension-panel-preview.html`

## Validation already run

Commands that passed in this workspace:

```bash
npx vitest run tests/browser-tab-ingest-pane.test.tsx tests/api/corpus-sample.test.ts tests/project-validation-page.test.tsx tests/session-page.test.tsx tests/extension-bridge.test.tsx
npx vitest run tests/api/corpus-sample.test.ts tests/project-validation-page.test.tsx tests/session-page.test.tsx tests/extension-content-script.test.ts tests/extension-bridge.test.tsx tests/extension-same-page.test.ts
node scripts/validation/verify-real-webpage-targets.mjs
npx tsc --noEmit
npm run lint
npm run build
npm run test:run
```

Observed results:

- Targeted browser-tab/corpus tests: passed.
- Real webpage target verifier: passed for both Wikimedia and Wikinews targets.
- TypeScript: passed.
- Lint: 0 errors, existing warnings only.
- Build: passed.
- Full test run: 96 files, 1160 tests passed. JSDOM still prints expected `HTMLMediaElement.pause()` noise, but the command exits 0.

Rendered checks already captured:

- `/session?sample=cable_008&view=watch` loaded the Watch UI with transcript, 1 claim, 6 markers, and no horizontal overflow.
- `/project/validation` rendered corpus proof and sample links with no horizontal overflow.
- Browser-tab ingest pane rendered the Chrome-only expectations, real test page link, validation link, and sample links with no horizontal overflow.
- "Open working sample" from the browser-tab pane loaded `/session?sample=solo_005&view=watch`.

## Known blockers and truth-in-labeling

The Chrome extension is scaffolded and ready for manual unpacked-extension testing, but it has not yet been proven end-to-end with a real loaded Chrome extension in the user's browser profile. The remaining acceptance test is:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Load unpacked extension from `/Users/israelbitton/Live FactCheck/extension`.
4. Open extension options and set app origin to `http://localhost:3000`.
5. Open `http://localhost:3000/validation/browser-capture.html` in Chrome.
6. Play the media.
7. Click the Yentl extension.
8. Confirm the Yentl panel is injected on that same page.
9. Confirm page text appears immediately and audio transcript lines begin arriving.
10. Confirm claims/markers appear from the live utterance pipeline, not just from demo state.

If that fails, inspect:

- Chrome extension service worker console.
- Page DevTools console for content-script errors.
- App DevTools console for bridge messages.
- `extension/background.js`
- `extension/content-script.js`
- `extension/offscreen.js`
- `components/session/ExtensionBridge.tsx`

## Dirty worktree warning

This workspace also contains large generated corpus artifacts and parallel-session changes. Do not assume every untracked file belongs to this branch. In particular, be cautious with:

- `.claude/`
- `.claire/`
- `test-corpus/audio/`
- all 100 generated `test-corpus/transcripts/*.json`
- all generated `test-corpus/ground-truth/*.vtt`
- broad corpus score outputs that are not one of the three functional sample replay files

The UI only needs the three replay-backed samples currently wired through `/api/corpus-sample`.

## Next session priority order

1. Finish and prove the unpacked Chrome extension with the local browser-capture fixture.
2. Test the extension on the real Wikimedia video target and the real Wikinews article target.
3. Make the extension panel send page text and audio transcript into the same live session timeline without duplicate spam.
4. Capture screenshots/video proof of same-page panel + media + transcript + claims.
5. Replace any remaining validation-demo language with true live-status language after end-to-end capture is proven.
6. Continue redesigning the end-user screens from the flow atlas, keeping project-management pages under `/project/*`.
7. Add mobile-specific layouts for source picker, browser-tab explanation, Watch, claims/markers, detail screens, and extension/mobile-app equivalents.

## Current product promise to protect

Yentl should not feel like a separate monitoring tab. For online media, the user should see the video/page and Yentl together on the same page. For text pages, Yentl should analyze readable page content directly. For uploaded/local content, Yentl should open a coherent Watch workspace where the source, transcript, claims, markers, and evidence are visibly connected.
