# Yentl handoff - extension panel tabs, workspace restore, exports

Date: 2026-05-21
Branch: `codex/yentl-functional-samples-extension-handoff`
PR: https://github.com/b7069484/yentl-app/pull/5
Workspace: `/Users/israelbitton/Live FactCheck`

## One-sentence status

Yentl now has a same-page Chrome extension panel that can receive page text and tab-audio messages, show Transcript / Claims / Markers tabs, use page/source context in analysis, open a restored full workspace snapshot, and export Report / Markdown / JSON; the next unfinished work is true live multi-window sync, full real-world Chrome verification across sites, and a real speaker/entity context resolver.

## Read this first

This handoff supersedes the two earlier extension handoffs for current pickup:

- `docs/superpowers/handoff/2026-05-21-yentl-extension-corpus-functional-samples.md`
- `docs/superpowers/handoff/2026-05-21-yentl-extension-grok-latency-pickup.md`

Those docs remain useful for background, especially the source-picker cleanup, same-page extension direction, corpus sample routes, initial Grok Devil's Advocate implementation, and Deepgram startup-buffer work. This file captures the latest state after the user tested the in-page panel and found these current product issues:

- The extension panel needed Transcript / Claims / Markers as real top-level tabs, not stacked cards.
- Transcript text needed inline highlighting for claims, bias, and fallacies.
- Devil's Advocate belonged under the Claims tab.
- "Open full workspace" was losing all in-panel state by opening a fresh session.
- The panel needed report/export affordances, not just a full workspace button.
- Claims and marker analysis should use page context such as title, URL, host, visible page text, and likely speaker cues from the source page.

## Current PR and commit stack

PR #5 is open:

- URL: https://github.com/b7069484/yentl-app/pull/5
- Branch: `codex/yentl-functional-samples-extension-handoff`
- Base: `main`

Latest pushed commits before this handoff commit:

- `af3f5ae Preserve extension panel workspace and exports`
- `a7e6189 Redesign extension panel tabs and source context`
- `dfa17c3 Add extension Grok latency handoff`
- `b4d9d52 Improve extension latency and add Grok challenge`
- `2129c59 Improve extension panel analysis snapshot`
- `5b61f41 Add Yentl extension validation handoff`

## Product direction to preserve

The browser extension product is same-page analysis. It is not supposed to be one Chrome tab playing media while another Yentl tab listens from elsewhere.

The target flow is:

1. The user opens the actual page where the video, podcast, livestream, class, meeting, or article already lives.
2. The user clicks the Yentl Chrome extension on that same page.
3. Yentl appears beside the page content as an injected side panel.
4. The original page, media player, transcript, claims, markers, evidence, exports, and workspace handoff stay connected.

The same extension must also work on text pages. If the page is already text, Yentl should analyze readable text immediately. If the page has playable media, Yentl should capture tab audio and combine the live transcript with page context.

Also preserve the separation between product UI and project-management UI:

- `/session` is end-user product UI.
- `/project/flows` is the internal UX flow atlas.
- `/project/validation` is the internal validation lab.
- Extension panel UI is end-user UI and should not expose development-board controls.

## What changed latest

### 1. Extension panel tabs

File:

- `components/session/extension-panel-view.tsx`

The in-page extension panel now uses top-level tabs:

- `Transcript`
- `Claims`
- `Markers`

The tab labels keep live counts visible. The body shows one focused view at a time, so the panel does not become a long stack of disconnected cards.

Transcript tab:

- Shows live transcript segments.
- Highlights transcript text with:
  - yellow for claims
  - orange for rhetoric / bias markers
  - red for fallacy markers
- Provides compact inline details for claim and marker matches.
- Keeps the empty/listening state concise.

Claims tab:

- Shows each claim as an expandable top-level item.
- Keeps verdict, confidence, evidence, source context, and reasoning close to the claim.
- Places Devil's Advocate below the claim checks, as requested.

Markers tab:

- Shows marker categories, severity, confidence, rationale, and transcript phrase.
- Keeps marker detail expandable instead of forcing the user to open the full workspace.

Related test:

- `tests/extension-panel-view.test.tsx`

### 2. Page/source context now feeds analysis

Files:

- `components/session/ExtensionBridge.tsx`
- `lib/client/orchestrator.ts`
- `app/api/extract-claims/route.ts`
- `app/api/analyze-rhetoric/route.ts`
- `app/api/verify-provisional/route.ts`
- `lib/prompts/extract-claims.ts`
- `lib/prompts/analyze-rhetoric.ts`
- `lib/prompts/verify-provisional.ts`
- `extension/content-script.js`

The extension already collected page metadata and readable text, but the analysis routes were mostly treating transcript lines as isolated text. The latest pass threads source context through the pipeline:

- page title
- URL
- host
- media title
- selected / visible page text
- candidate speakers or entities inferred from title, byline, metadata, and page text

That context is now available to claim extraction, rhetoric analysis, provisional verification, and Devil's Advocate prompts.

Important limit: this is not yet a real "famous speaker recognition" system. It is source-context injection and candidate entity extraction. The next step is a dedicated resolver that can detect named speakers, verify them against source metadata, explain uncertainty, and avoid inventing identities.

### 3. Full workspace no longer opens blank

Files:

- `components/session/extension-panel-view.tsx`
- `app/session/page.tsx`
- `lib/client/session-storage.ts`
- `lib/client/session-store.ts`
- `tests/session-page.test.tsx`
- `tests/synthesis-persistence.test.ts`

The previous panel button opened `/session` and lost the in-panel work. The panel now:

1. Saves the current extension-panel session to IndexedDB through `saveSession`.
2. Opens `/session?restore=<saved-session-id>&view=overview`.
3. The full session route restores that saved session into the main session store.
4. The route then normalizes the URL to `/session?view=overview`.

Important truth-in-labeling: this is a saved snapshot handoff. It preserves the work at the moment the user opens the full workspace. It is not yet a live synchronized second window. If the panel keeps transcribing after the workspace opens, the full workspace will not automatically keep updating until live sync is built.

### 4. Export and report actions exist in the panel

Files:

- `components/session/extension-panel-view.tsx`
- `components/session/ExportDialog.tsx`
- `lib/client/export-actions.ts`
- `lib/export/report.ts`
- `lib/export/markdown.ts`
- `lib/export/json.ts`
- `tests/export/report.test.ts`
- `tests/export/markdown.test.ts`
- `tests/export/json.test.ts`

Panel actions now include:

- `Full workspace`
- `Report`
- expandable `Export files`
  - `Markdown`
  - `JSON`

The report/export payloads now include Devil's Advocate content when present. `ExportDialog` and the extension panel share the same client-side export helper so this behavior is not duplicated.

### 5. Devil's Advocate persistence and exports

Files:

- `lib/client/session-store.ts`
- `lib/client/session-storage.ts`
- `lib/export/report.ts`
- `lib/export/markdown.ts`
- `lib/export/json.ts`
- `tests/synthesis-persistence.test.ts`
- `tests/export/report.test.ts`
- `tests/export/markdown.test.ts`
- `tests/export/json.test.ts`

Devil's Advocate state now persists as `devil_advocate` in saved sessions and appears in report / Markdown / JSON exports. This protects the Grok pass from vanishing when the user opens the full workspace or exports a session.

## Validation already run

Commands passed after the latest code changes:

```bash
npm run test:run
npm run lint
npm run build
```

Observed results:

- Full test suite: 99 files, 1175 tests passed.
- Lint: 0 errors, 18 existing warnings.
- Build: passed.

Browser preview manually checked:

- Opened `http://localhost:3000/session?surface=extension-panel&source=browser-tab&bridge=preview&title=Fixture%20video&demo=validation`.
- Confirmed `Full workspace`, `Report`, and `Export files` actions render.
- Expanded `Export files`; confirmed `Markdown` and `JSON` actions render.
- Clicked `Full workspace`; it opened a new `/session?view=overview` tab.
- Confirmed the restored workspace retained the fixture library-budget claim, markers, and Export control.

## Manual extension test steps

Use these steps for the next real Chrome test:

1. Start the app:

   ```bash
   npm run dev
   ```

2. Open Chrome to `chrome://extensions`.
3. Enable Developer Mode.
4. Load unpacked extension from:

   ```text
   /Users/israelbitton/Live FactCheck/extension
   ```

5. Open the Yentl extension options.
6. Set app origin to:

   ```text
   http://localhost:3000
   ```

7. Open the local validation page:

   ```text
   http://localhost:3000/validation/browser-capture.html
   ```

8. Play the media.
9. Click the Yentl extension.
10. Expected result:
    - Yentl panel injects on the same page.
    - Page text appears quickly.
    - Audio status changes as tab audio arrives.
    - Transcript lines arrive from Deepgram.
    - Claims / Markers tabs update.
    - Report / Markdown / JSON actions work.
    - Full workspace opens with the current snapshot preserved.

Then test real pages:

- Wikimedia Commons playable WebM page used during prior testing.
- A Wikinews or equivalent article page with no playable media.
- A YouTube page in Chrome, if tab capture permission and site playback allow it.

## Known loose ends

### P0

- Build true live sync between extension panel and full workspace. Use `BroadcastChannel`, IndexedDB subscriptions, or an app-side session event stream so the full workspace keeps updating after it opens.
- Finish real-world Chrome verification across at least three classes: YouTube/video, direct media/WebM, and text-only article page.
- Build a real speaker/entity context resolver. Current page-context injection is helpful but not enough. The resolver should identify names from title/channel/byline/description/transcript, verify them against source metadata, show uncertainty, and avoid celebrity/person hallucinations.
- Replace native hover-only transcript details with polished popovers and touch-friendly expand controls.
- Measure real first-audio, first-interim, and first-final latency in Chrome after the offscreen buffering fix. The code now starts `MediaRecorder` before Deepgram is ready, but actual perceived latency still needs instrumentation.
- Confirm extension permissions and Deepgram token setup in a clean Chrome profile.
- Make panel visual polish tighter at the real injected width, especially long titles, dense claims, and marker detail.

### P1

- Turn `Full workspace` from snapshot handoff into explicit "open live workspace" once sync exists.
- Add a visible saved/exported state after Report / Markdown / JSON actions.
- Improve report design for extension sessions: source context, title, URL, page text excerpt, transcript highlights, claims, markers, Devil's Advocate, and export time.
- Decide how extension snapshot saves should appear in the library. Right now they are durable saved sessions; they may need an autosaved extension-session label or cleanup policy.
- Persist browser-tab status and source metadata more completely if the restored workspace should show the exact original capture state.
- Add focused tests for page-context routing through all analysis routes, not just surface-level panel behavior.

### P2

- Prepare mobile app equivalents: share-sheet ingest, uploaded file/audio, microphone, and URL/text analysis. Mobile cannot generally capture arbitrary other-app audio like a desktop Chrome extension, so the UX should be honest and platform-native.
- Add editorial fixtures for famous-speaker context, multi-speaker YouTube, podcast, livestream, article-only, direct MP3, direct MP4, and hostile/noisy page extraction.
- Create a visible validation dashboard row for the extension acceptance matrix once real Chrome tests are captured.

## File map for next session

Extension:

- `extension/manifest.json`
- `extension/background.js`
- `extension/content-script.js`
- `extension/offscreen.js`
- `extension/options.html`
- `extension/options.js`
- `extension/README.md`

App bridge and panel:

- `components/session/ExtensionBridge.tsx`
- `components/session/extension-panel-view.tsx`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`
- `app/session/page.tsx`
- `components/session/session-shell.tsx`

Analysis routes and prompts:

- `app/api/extract-claims/route.ts`
- `app/api/analyze-rhetoric/route.ts`
- `app/api/verify-provisional/route.ts`
- `app/api/devil-advocate/route.ts`
- `lib/prompts/extract-claims.ts`
- `lib/prompts/analyze-rhetoric.ts`
- `lib/prompts/verify-provisional.ts`
- `lib/prompts/devil-advocate.ts`
- `lib/server/grok.ts`

Session persistence and exports:

- `lib/client/session-store.ts`
- `lib/client/session-storage.ts`
- `lib/client/export-actions.ts`
- `lib/export/report.ts`
- `lib/export/markdown.ts`
- `lib/export/json.ts`
- `components/session/ExportDialog.tsx`

Validation:

- `public/validation/browser-capture.html`
- `public/validation/extension-panel-preview.html`
- `docs/superpowers/validation/real-webpage-targets.json`
- `scripts/validation/verify-real-webpage-targets.mjs`

Tests to start with:

- `tests/extension-panel-view.test.tsx`
- `tests/extension-bridge.test.tsx`
- `tests/extension-content-script.test.ts`
- `tests/extension-offscreen.test.ts`
- `tests/session-page.test.tsx`
- `tests/synthesis-persistence.test.ts`
- `tests/export/report.test.ts`
- `tests/export/markdown.test.ts`
- `tests/export/json.test.ts`
- `tests/devil-advocate-route.test.ts`

## Dirty worktree warning

The workspace has many corpus artifacts and script changes from another active session. Do not stage, revert, or delete them unless the user explicitly asks. They are not part of this extension-panel handoff commit.

Known unrelated dirty areas include:

- `package.json`
- `scripts/test-corpus/*`
- `scripts/test-corpus-2/*`
- `public/corpus-2-report/`
- `test-corpus-2/`
- `test-corpus/audio/`
- `test-corpus/ground-truth/*.vtt`
- many generated `test-corpus/transcripts/*.json`
- many generated `test-corpus/scores/*.json`
- `.claude/`
- `.claire/`
- loose downloaded files such as `download.jpg`, `download-1.jpg`, and `3701551.3704128.pdf`
- `yentl-mark.ai`
- `yentl-mark.svg`

The current extension-panel commit should stage only this handoff file.

## Suggested next commands

```bash
git status --short --branch
git log --oneline -8
gh pr view 5 --web
npm run dev
npm run test:run
npm run lint
npm run build
```

For focused development:

```bash
npx vitest run tests/extension-panel-view.test.tsx tests/extension-bridge.test.tsx tests/extension-content-script.test.ts tests/extension-offscreen.test.ts
npx vitest run tests/session-page.test.tsx tests/synthesis-persistence.test.ts tests/export/report.test.ts tests/export/markdown.test.ts tests/export/json.test.ts
```

## Acceptance definition for the next build

The next session should not call the Chrome extension "done" until it can show evidence for this exact flow:

1. A real webpage is open in Chrome.
2. The page itself remains visible.
3. Yentl injects into that same page.
4. If page text exists, it is analyzed.
5. If playable media exists, audio transcript begins without losing the beginning.
6. Transcript, claims, markers, and Devil's Advocate appear in the panel tabs.
7. Highlighted transcript text maps back to the relevant claim or marker.
8. Full workspace opens with the current state and, ideally after P0 sync work, keeps updating live.
9. Report / Markdown / JSON exports preserve transcript, claims, markers, source context, and Devil's Advocate.

