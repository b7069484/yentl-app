# Yentl handoff - Chrome extension latency, Grok Devil's Advocate, and next build-out

Date: 2026-05-21
Branch: `codex/yentl-functional-samples-extension-handoff`
PR: https://github.com/b7069484/yentl-app/pull/5
Workspace: `/Users/israelbitton/Live FactCheck`

## Read this first

This handoff continues:

- `docs/superpowers/handoff/2026-05-21-yentl-extension-corpus-functional-samples.md`
- `docs/superpowers/handoff/2026-05-20-worldclass-ux-committee-audit-pickup.md`

The earlier 2026-05-21 handoff explains the source-picker cleanup, internal `/project/*`
separation, same-page extension direction, validation fixture pages, and replay-backed
corpus sample routes. This document captures the work after the user tested the real
extension panel on a Wikimedia page and found two product-critical gaps:

1. The panel showed only thin counters and did not surface immediate intelligence like
   "3 claims, 2 false" or marker detail.
2. Tab audio transcription appeared delayed by roughly 10-15 seconds.
3. The planned Devil's Advocate feature was not actually implemented yet, even though
   the intended model was Grok.

## Current PR state

PR #5 is open:

- URL: https://github.com/b7069484/yentl-app/pull/5
- Branch: `codex/yentl-functional-samples-extension-handoff`
- Base: `main`

Latest pushed commits on this branch before this handoff commit:

- `5b61f41 Add Yentl extension validation handoff`
- `2129c59 Improve extension panel analysis snapshot`
- `b4d9d52 Improve extension latency and add Grok challenge`

The branch is pushed. The local workspace is not globally clean because another session
has generated corpus artifacts and script changes. Do not reset the worktree. See
"Dirty worktree" below.

## Product direction to preserve

For the browser-tab product, Yentl is not supposed to listen to one tab while analysis
appears somewhere else. The desired user experience is:

1. The user opens the page where the video/audio/article already lives.
2. The user clicks the Yentl Chrome extension on that same page.
3. Yentl opens as a side panel on that page.
4. The source page remains visible and usable.
5. Page text, live audio transcript, claims, markers, evidence, synthesis, and Devil's
   Advocate stay visually connected in the same experience.

The extension is also not only for video. If the page is already text, Yentl should
analyze readable text immediately. If the page has playable media, Yentl should also
capture tab audio and stream it into the same session.

## What changed in the latest pass

### 1. Extension panel now shows immediate intelligence, not just counters

File:

- `components/session/extension-panel-view.tsx`

The compact in-page panel now includes:

- analysis snapshot card
- claim summary such as `3 claims · 2 false/misleading`
- marker summary such as `1 markers · 1 clear/blatant`
- expandable Claims details inside the panel
- expandable Markers details inside the panel
- verdict/severity tone chips
- no outer session header or project-management UI

This directly addresses the user's complaint that the panel had only count boxes and no
"so what" intelligence without opening the full workspace.

Related test:

- `tests/extension-panel-view.test.tsx`

### 2. Wikimedia page-text extraction was cleaned up

File:

- `extension/content-script.js`

The real Wikimedia test showed junk annotation text like:

`Text of the note ... Gadget-ImageAnnotator ... MediaWiki talk ...`

The content script now filters obvious Wikimedia/ImageAnnotator boilerplate and adds
Commons-specific readable selectors. This does not mean page extraction is perfect, but
the first observed bad case is specifically covered.

Related test:

- `tests/extension-content-script.test.ts`

### 3. Extension audio capture no longer waits for Deepgram before recording

File:

- `extension/offscreen.js`

Before the fix, the offscreen flow was:

1. get tab stream
2. preserve tab audio
3. fetch Deepgram token
4. open Deepgram WebSocket
5. only then start `MediaRecorder`

That meant the first seconds of media could be lost while the token and WebSocket were
coming up. The user reasonably experienced this as a 10-15 second startup delay.

The new flow is:

1. get tab stream
2. preserve tab audio
3. start `MediaRecorder` immediately at 250 ms chunks
4. buffer early audio chunks in memory
5. fetch Deepgram token and open WebSocket
6. flush buffered chunks into Deepgram once the socket opens
7. keep streaming new chunks live

Buffer limits:

- `MAX_BUFFERED_CHUNKS = 120`
- `MAX_BUFFERED_BYTES = 4_000_000`

The no-speech notice was also shortened from 9 seconds to 5 seconds.

Important truth-in-labeling: this removes the capture-start gap. It does not make
speech-to-text physically instantaneous. Deepgram still has network and model latency,
and final transcript timing depends on utterance segmentation. The next session should
measure real first-interim and first-final timings in Chrome after reloading the unpacked
extension.

Related test:

- `tests/extension-offscreen.test.ts`

The new tests assert:

- `MediaRecorder` starts before the Deepgram token request resolves.
- audio chunks emitted before WebSocket open are buffered.
- buffered chunks flush after WebSocket open.

### 4. Devil's Advocate is now a real Grok-backed route

Files:

- `app/api/devil-advocate/route.ts`
- `lib/prompts/devil-advocate.ts`
- `lib/server/grok.ts`
- `lib/client/orchestrator.ts`
- `lib/client/session-store.ts`
- `components/session/extension-panel-view.tsx`

Initial audit result:

- There was no Devil's Advocate implementation in the repo.
- There was no `XAI_API_KEY` or Grok-specific local env var.
- `.env.local` had `VERCEL_OIDC_TOKEN`, and the Vercel AI Gateway model list exposed
  xAI/Grok models.

Confirmed gateway models included:

- `xai/grok-4.1-fast-reasoning`
- `xai/grok-4.1-fast-non-reasoning`
- `xai/grok-4.20-reasoning`
- `xai/grok-4.3`

Chosen default:

- `xai/grok-4.1-fast-reasoning`

The model can be overridden with:

```bash
YENTL_GROK_MODEL=<gateway-model-id>
```

Implementation details:

- `POST /api/devil-advocate` validates transcript, claims, and markers with zod.
- It calls Grok through the AI SDK / Vercel AI Gateway.
- Grok returns strict JSON text.
- The app parses and validates that JSON locally with `parseDevilAdvocateText`.
- The response includes:
  - `stance`
  - exactly 3 `strongest_counterarguments`
  - `weakest_assumption`
  - exactly 2 `questions`
  - `confidence`
  - `model`

Important provider edge discovered:

- AI SDK structured-output mode (`Output.object`) failed against the Grok gateway path
  with a 400.
- Plain text generation plus strict JSON parsing works.
- Keep this in mind before "simplifying" the route back to structured output.

Live smoke result:

```json
{
  "status": 200,
  "model": "xai/grok-4.1-fast-reasoning",
  "confidence": "low",
  "counterpoints": 3,
  "questions": 2
}
```

The panel now shows a compact Devil's Advocate card with Grok label, stance, confidence,
counterpoints, weakest assumption, and questions.

Related test:

- `tests/devil-advocate-route.test.ts`

### 5. Devil's Advocate is wired into the live client orchestrator

File:

- `lib/client/orchestrator.ts`

Behavior:

- `onFinalUtterance` now calls `maybeRunDevilAdvocate`.
- The Devil's Advocate pass waits until at least 3 transcript segments exist.
- It runs every 7 utterances or after 45 seconds.
- It sends recent transcript, recent confirmed/provisional claims, and recent markers.
- It has a separate abort controller from synthesis.
- `runFinalSynthesis` also runs a final Devil's Advocate pass for non-mic bulk sources.

State lives in:

- `lib/client/session-store.ts`

Types:

- `DevilAdvocateBrief`
- `DevilAdvocateState`

The state is intentionally not persisted yet. A future session should decide whether
saved sessions should preserve the latest Devil's Advocate brief alongside synthesis.

### 6. Extension panel is now tabbed around Transcript, Claims, and Markers

File:

- `components/session/extension-panel-view.tsx`

The user rejected the stacked panel because it forced status cards, snapshots, Devil's
Advocate, transcript, and evidence into one long scroll. The panel now treats the three
core analysis objects as primary navigation:

- `Transcript` tab shows elapsed transcript time.
- `Claims` tab shows claim count.
- `Markers` tab shows marker count.

The active tab controls the whole body below the status card:

- Transcript tab shows live transcript lines with inline highlighting.
- Claims tab shows claim summary, expandable claim checks, and Devil's Advocate at the
  bottom.
- Markers tab shows marker summary and expandable marker details.

Inline transcript colors:

- yellow = claim
- orange = bias/rhetoric marker
- red = fallacy

Highlighted transcript spans carry hover/focus titles with the attached claim or marker
detail. This is only a first interaction pass; the next product pass should replace
native title hover with a designed popover so touch/mobile users can inspect highlights.

Related test:

- `tests/extension-panel-view.test.tsx`

### 7. Browser tab source context is now captured and sent into analysis prompts

Files:

- `extension/content-script.js`
- `components/session/ExtensionBridge.tsx`
- `lib/types.ts`
- `lib/client/orchestrator.ts`
- `lib/prompts/extract-claims.ts`
- `lib/prompts/analyze-rhetoric.ts`
- `lib/prompts/devil-advocate.ts`
- `app/api/verify-provisional/route.ts`
- `app/api/verify-confirmed/route.ts`

The extension now emits a `page-context` bridge message and also attaches
`source_context` to page-text snapshots. Captured context includes:

- page title
- site name
- channel name when visible
- author/byline when visible
- username/creator hints when visible
- canonical URL
- description
- detected proper-name candidates from the metadata fields

The session source stores that context under `source.context` for browser-tab sessions.
The client orchestrator forwards source context into:

- claim extraction
- rhetoric analysis
- provisional verification
- confirmed verification
- Grok Devil's Advocate

Important truth-in-labeling: this is not yet a full "famous speaker lookup" or entity
resolver. It gives the models the available page/channel/title context for disambiguation
and better search phrasing. A future layer should add explicit entity resolution, e.g.
derive candidate people from title/channel/transcript, search/lookup stable identifiers,
and show those assumptions in the UI before treating them as context.

Related tests:

- `tests/extension-content-script.test.ts`
- `tests/extension-bridge.test.tsx`

## Current test and build evidence

Focused tests run after the latest changes:

```bash
npx vitest run tests/extension-offscreen.test.ts tests/devil-advocate-route.test.ts tests/extension-panel-view.test.tsx tests/extension-same-page.test.ts tests/extension-content-script.test.ts tests/extension-bridge.test.tsx
```

Result:

- 6 files passed
- 26 tests passed

Full verification run:

```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```

Results:

- `npm run test:run`: 99 files, 1171 tests passed
- `npx tsc --noEmit`: passed
- `npm run lint`: 0 errors, 18 existing warnings
- `npm run build`: passed

Known harmless/noisy output:

- JSDOM prints `Not implemented: HTMLMediaElement's pause() method` during tests.
- Lint warnings are pre-existing; no new lint errors.
- Next build warns that the `middleware` file convention is deprecated.

Browser preview verification:

Opened:

```text
http://localhost:3000/session?surface=extension-panel&source=browser-tab&bridge=preview&title=Fixture%20video&demo=validation
```

Visible body included:

- `Transcribing`
- tab row with `Transcript`, `Claims`, and `Markers`
- Claims tab selected with `1 claims · 1 need evidence`
- `DEVIL'S ADVOCATE` under the Claims tab
- `Grok`
- `Counterpoints and questions`
- no `Overview` header from the full session shell

Screenshot captured during verification:

- `/tmp/yentl-extension-panel-claims-tab.png`

## How to test the real extension next

Use Chrome, not only the in-app browser, because this requires a real unpacked Chrome
extension.

1. Make sure the app is running:

```bash
npm run dev
```

2. Open:

```text
chrome://extensions
```

3. Enable Developer Mode.

4. Load unpacked extension from:

```text
/Users/israelbitton/Live FactCheck/extension
```

5. Open the extension options page and confirm app origin:

```text
http://localhost:3000
```

6. Open local media fixture:

```text
http://localhost:3000/validation/browser-capture.html
```

7. Start video/audio playback.

8. Click the Yentl extension while the fixture page is the active tab.

9. Expected:

- the third-party-style page remains visible
- Yentl panel appears on the right side of the same page
- page text appears quickly
- capture status moves to `Transcribing` or `Audio arriving`
- transcript lines begin from the media
- analysis snapshot updates as claims/markers are found
- Grok Devil's Advocate appears after enough transcript content accumulates

10. Then test real pages:

```text
https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm
https://en.wikinews.org/wiki/Residents_shelter_in_place_for_hours_after_gas_leak_outside_of_Los_Angeles
```

## Debug map for extension failures

If panel does not inject:

- inspect `extension/background.js`
- inspect `extension/content-script.js`
- check page DevTools console
- check extension service worker console in `chrome://extensions`

If panel injects but no page text appears:

- inspect `collectPageTextSnapshot` and `extractReadablePageText` in
  `extension/content-script.js`
- verify `page-text` bridge messages reach `components/session/ExtensionBridge.tsx`

If panel injects but no audio transcript appears:

- reload the unpacked extension
- reload the target page
- inspect `extension/offscreen.js`
- confirm `chrome.tabCapture.getMediaStreamId()` succeeded
- confirm `getUserMedia` in the offscreen document succeeds
- confirm `/api/deepgram/token` returns a key
- confirm WebSocket open and chunk flush
- check whether the media is muted or speechless

If Grok Devil's Advocate fails:

- confirm `.env.local` has `VERCEL_OIDC_TOKEN`
- run model list check:

```bash
set -a; source .env.local >/dev/null 2>&1; set +a
curl -sS -H "Authorization: Bearer $VERCEL_OIDC_TOKEN" \
  https://ai-gateway.vercel.sh/v1/models | jq -r '.data[].id' | grep -i grok
```

- keep `/api/devil-advocate` in plain-text JSON parse mode unless gateway behavior changes
- inspect server logs for `devil-advocate failed`

## Dirty worktree - do not panic, do not reset

The branch changes above are committed and pushed. The local workspace still contains
uncommitted files from a parallel corpus/testing effort. They are not part of the
extension/Grok work and should not be reverted unless the owner of that work says so.

Observed dirty items include:

- modified `package.json`
- modified `scripts/test-corpus/*`
- modified `test-corpus/scores/solo_005.json`
- untracked `.claude/`
- untracked `.claire/`
- untracked `public/corpus-2-report/`
- untracked `scripts/test-corpus-2/`
- untracked many `test-corpus/audio/`, `test-corpus/ground-truth/`,
  `test-corpus/transcripts/`, and generated score files
- untracked `yentl-mark.ai`, `yentl-mark.svg`, downloads, and one PDF

Best practice for next session:

```bash
git status --short --branch
git log --oneline --decorate -8
```

Only stage files relevant to the task. Avoid broad `git add .`.

## What remains to build

### P0 - prove real extension end to end

- Reload unpacked extension after the `offscreen.js` change.
- Record first-click-to-first-interim and first-click-to-first-final timings.
- Capture screenshots/video proof on:
  - local fixture
  - real Wikimedia video page
  - real Wikinews text page
- Confirm page text and audio transcript merge into one session without duplicate spam.
- Confirm claim, marker, synthesis, and Grok cards update from live messages.

### P0 - make the panel feel like a real product

- Add a top-level compact verdict line, not just counters:
  - examples: `3 claims · 2 risky`, `6 markers · 4 clear/blatant`,
    `Grok challenge ready`
- Add a small collapsed/expanded mode in the injected panel.
- Make `Open full workspace` preserve the current browser-tab session.
- Add user-friendly diagnostics when capture has permission, token, WebSocket, or silence problems.
- Replace validation/demo copy when the extension is in true live mode.

### P1 - extension controls

- Add extension popup or native side-panel control with:
  - active tab title
  - app origin
  - connection state
  - start/stop button
  - permission guidance
  - quick debug copy
- Add pause/resume handshake from app panel to extension.
- Add reconnect behavior if Deepgram socket closes mid-session.
- Add clear "Yentl is analyzing page text" versus "Yentl is hearing audio" states.

### P1 - Grok / Devil's Advocate

- Decide whether Devil's Advocate belongs in:
  - extension panel
  - Watch view
  - claim detail
  - all of the above
- Persist latest Devil's Advocate brief in saved sessions if useful.
- Add "refresh challenge" action.
- Consider a user-facing label that explains what the feature does without sounding gimmicky.
- Add route-level rate limiting or debounce if live sessions produce too many Grok calls.

### P1 - UI redesign from flow atlas

- Continue screen-by-screen redesign in `/project/flows`.
- Keep internal project management pages under `/project/*`.
- Keep `/session` user-facing only.
- For desktop Watch, anchor around the 16:9 media/player area and place transcript/claims/markers around it.
- For mobile, build real small-screen layouts rather than squeezed desktop cards.

### P2 - mobile app prep

Important constraint:

- iOS/Android cannot generally capture arbitrary other-app audio the way a Chrome
  desktop extension can.

Mobile architecture should focus on:

- microphone live capture
- file/share-sheet imports
- direct media URL ingestion where allowed
- transcript/text paste/import
- YouTube/media links through server-side or user-supplied captions where available
- shared session schema and analysis APIs with the web app

## Files most likely to matter next

Extension:

- `extension/manifest.json`
- `extension/background.js`
- `extension/content-script.js`
- `extension/offscreen.js`
- `extension/options.html`
- `extension/options.js`

App bridge/panel:

- `components/session/ExtensionBridge.tsx`
- `components/session/extension-panel-view.tsx`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`
- `lib/client/orchestrator.ts`
- `lib/client/session-store.ts`

Grok:

- `app/api/devil-advocate/route.ts`
- `lib/prompts/devil-advocate.ts`
- `lib/server/grok.ts`
- `tests/devil-advocate-route.test.ts`

Validation:

- `public/validation/browser-capture.html`
- `public/validation/extension-panel-preview.html`
- `scripts/validation/verify-real-webpage-targets.mjs`
- `docs/superpowers/validation/real-webpage-targets.json`
- `tests/extension-offscreen.test.ts`
- `tests/extension-content-script.test.ts`
- `tests/extension-same-page.test.ts`
- `tests/extension-bridge.test.tsx`
- `tests/extension-panel-view.test.tsx`

Project flow/UI planning:

- `app/project/flows/page.tsx`
- `components/session/ux-flow-dashboard.tsx`
- `app/project/validation/page.tsx`

## Suggested first commands for next session

```bash
cd "/Users/israelbitton/Live FactCheck"
git status --short --branch
git log --oneline --decorate -8
gh pr view 5 --web
npm run dev
```

Then reload the unpacked extension in Chrome and run the manual local fixture test before
changing more UI. The next big decision should be based on what actually happens in
Chrome with the real extension after the latency fix.
