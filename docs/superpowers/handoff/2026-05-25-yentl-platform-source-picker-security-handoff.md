# Yentl handoff - platform-aware source picker and launch-security pass

Date: 2026-05-25
Branch: `codex/yentl-functional-samples-extension-handoff`
Workspace: `/Users/israelbitton/Live FactCheck`

## One-sentence status

The public source-selection flow now adapts to desktop Chrome, desktop non-Chrome, iOS web, Android web, and generic mobile web; internal validation/sample language has been removed from end-user source paths; public copy leaks have been cleaned; and a first test-backed security slice is in place for consent, rate limits, private Blob transcription/deletion, and claim-scope gating.

## Read this first

The test corpus, replay samples, validation fixtures, and launch-readiness dashboards are internal development tools only. They should remain under `/project/*`, `docs/superpowers/*`, `test-corpus/*`, and related internal scripts/docs.

End-user product surfaces should not expose:

- corpus language
- "functional samples"
- validation lab links
- local fixture URLs
- `/project/*` links
- developer-only test-page affordances

The public source flow is now the source picker plus the relevant ingest pane. `/project/validation` remains the internal validation lab.

## What changed in this pass

### 1. Platform-aware source picker

Primary file:

- `components/session/source-picker.tsx`

The source picker now detects and adapts to:

- `desktop-chrome`
- `desktop-other`
- `mobile-ios`
- `mobile-android`
- `mobile-web`

Behavior:

- Desktop Chrome features same-page tab capture first.
- Desktop non-Chrome leads with link/upload/transcript/mic/media URL and shows the desktop Chrome extension as an alternate path.
- Mobile web does not present browser-tab capture as a selectable source card.
- iOS copy points toward YouTube link, upload, transcript, mic, media URL, and future native Share Sheet/file-import/mic/link paths.
- Android copy points toward share intents, file import, mic, links, and upload paths.

Tests:

- `tests/source-picker.test.tsx`

Screenshot proof:

- `docs/superpowers/validation/screenshots/source-picker-desktop-platform-aware.png`
- `docs/superpowers/validation/screenshots/source-picker-mobile-390-platform-aware.png`

Mobile browser verification recorded:

- viewport width: `390`
- document scroll width: `390`
- detected platform: `mobile-ios`

### 2. End-user source flows no longer expose internal validation/sample UI

Primary file:

- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`

Removed from the public browser-tab pane:

- "Open real test page"
- "Functional samples"
- `/project/validation` link
- replay-backed sample cards
- hardcoded `http://localhost:3000` user guidance

The pane now focuses on the real user path:

1. Open the media/article page in desktop Chrome.
2. Click the Yentl Chrome extension there.
3. Keep the extension pointed at this Yentl app.
4. Review transcript, claims, markers, and evidence together beside the source.

Related cleanup:

- `components/session/ExtensionBridge.tsx` no longer tells users to keep the app origin set to `http://localhost:3000`.

Tests:

- `tests/browser-tab-ingest-pane.test.tsx`

### 3. Public copy leaks cleaned

Files touched:

- `components/session/chips.tsx`
- `components/session/claim-row.tsx`
- `components/session/filtered-list.tsx`
- `components/verdict/VerdictCard.tsx`
- `lib/client/filter-selectors.ts`
- `lib/export/report.ts`
- `app/changelog/page.tsx`
- `app/accessibility/page.tsx`

Visible language changed away from internal/awkward labels:

- `No backing` -> `No reliable backing`
- `NO BACKING` -> `NO RELIABLE BACKING`
- `? UNVERIFIED` -> `NO RELIABLE BACKING`
- `No valid backing found` -> `No reliable backing`
- public changelog wording now uses claim-scope language rather than "engagement gate"
- accessibility page no longer links to missing `/contact`

Notes:

- Internal enums such as `UNVERIFIABLE` still exist where they are part of the pipeline contract.
- Internal `/project/*` dashboards may still use validation/planning language.

### 4. Consent headers and hard source-analysis consent checks

New/shared files:

- `lib/source-consent.ts`
- `lib/server/consent.ts`

Client paths now send `x-yentl-source-consent: source-analysis-v1`:

- `lib/client/audio-ingest.ts`
- `lib/client/deepgram-stream.ts`
- `components/session/ingest-panes/media-url-ingest-pane.tsx`
- `components/session/ingest-panes/youtube-ingest-pane.tsx`
- `extension/offscreen.js`

Server routes now require consent before cost-bearing source/audio work:

- `app/api/deepgram/token/route.ts`
- `app/api/upload-audio/route.ts`
- `app/api/transcribe-batch/route.ts`
- `app/api/media-ingest/route.ts`
- `app/api/youtube-ingest/route.ts`

Blob upload token generation accepts consent either through the request header or the Vercel Blob `clientPayload`, so the browser-direct upload path remains enforceable.

Tests:

- `tests/api/deepgram-token.test.ts`
- `tests/api/upload-audio.test.ts`
- `tests/api/transcribe-batch.test.ts`
- `tests/audio-ingest.test.ts`
- `tests/media-url-ingest-pane.test.tsx`
- `tests/youtube-ingest-pane.test.tsx`
- `tests/extension-offscreen.test.ts`

### 5. Rate limits added to cost-bearing routes

New file:

- `lib/server/rate-limit.ts`

Routes now call shared in-process rate limits:

- `app/api/deepgram/token/route.ts`
- `app/api/upload-audio/route.ts`
- `app/api/transcribe-batch/route.ts`
- `app/api/media-ingest/route.ts`
- `app/api/youtube-ingest/route.ts`
- `app/api/source-preview/route.ts`
- `app/api/extract-claims/route.ts`
- `app/api/analyze-rhetoric/route.ts`
- `app/api/synthesize/route.ts`
- `app/api/devil-advocate/route.ts`
- `app/api/verify-provisional/route.ts`
- `app/api/verify-confirmed/route.ts`

Important limit:

This is a first launch-security slice, not final production-grade distributed rate limiting. Because it is in process, it will not coordinate across serverless instances. Before public launch, back this with Redis, Upstash, Vercel KV, or another shared limiter.

Tests:

- `tests/api/model-route-security.test.ts`

### 6. Private Blob access and post-transcription deletion

Primary files:

- `lib/client/audio-ingest.ts`
- `app/api/upload-audio/route.ts`
- `app/api/transcribe-batch/route.ts`

Behavior:

- Large browser uploads now request Vercel Blob `access: "private"`.
- The client includes consent headers and consent client payload when requesting the upload token.
- `/api/transcribe-batch` detects Vercel Blob URLs.
- For Vercel Blob URLs, the server retrieves the Blob with authenticated Blob SDK access and streams it to Deepgram.
- After transcription attempt, the route calls `del(blob_url)` in a `finally` block.

Compatibility note:

The transcribe route still handles older/public Vercel Blob URLs by inferring `public` access from the hostname. That keeps older test fixtures and existing blobs from breaking during the transition.

Tests:

- `tests/api/transcribe-batch.test.ts`
- `tests/api/upload-audio.test.ts`
- `tests/audio-ingest.test.ts`

### 7. Claim-scope gate inserted before verification

New file:

- `lib/server/engagement-gate.ts`

Routes now gate claims before model/web-search verification:

- `app/api/verify-provisional/route.ts`
- `app/api/verify-confirmed/route.ts`

Current behavior:

- Refuses private personal information/doxxing-style requests with `403`.
- Declines obvious opinion/preference claims with `422`.
- Allows ordinary factual claims through to the existing verification pipeline.

Important limit:

This is a deterministic first guard, not the final Haiku-class policy classifier described in earlier methodology planning. It gives the verification routes a runtime gate now, but it should be expanded or replaced with the intended policy classifier before broader public launch.

Tests:

- `tests/api/model-route-security.test.ts`

## Verification completed

Commands run:

```bash
npx vitest run tests/source-picker.test.tsx tests/browser-tab-ingest-pane.test.tsx tests/audio-ingest.test.ts tests/media-url-ingest-pane.test.tsx tests/youtube-ingest-pane.test.tsx tests/extension-offscreen.test.ts tests/api/deepgram-token.test.ts tests/api/upload-audio.test.ts tests/api/transcribe-batch.test.ts tests/streaming-upload.test.ts tests/api/media-ingest.test.ts tests/api/youtube-ingest.test.ts tests/api/model-route-security.test.ts tests/verdict-card.test.tsx
npm run lint
npx tsc --noEmit
npm run build
npm run test:run
```

Results:

- Focused Vitest run: `14` files passed, `176` tests passed.
- Full Vitest run: `105` files passed, `1223` tests passed.
- `npm run lint`: passed with existing warnings only.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Browser screenshot check: desktop source picker rendered with no validation/sample leak.
- Headless Chrome mobile check: 390px mobile viewport rendered with `scrollWidth: 390`.

Historical build warning from this checkpoint:

- Next.js warned that the `middleware` file convention was deprecated in favor of `proxy`. This was resolved in a later continuation by moving the request gate to `proxy.ts`.

Historical local production start note:

- `npm run start -- --hostname 127.0.0.1 --port 3001` originally hit a Clerk publishable-key runtime error in local production mode. This was resolved in a later continuation by only wrapping the app in `ClerkProvider` when Clerk is configured and by making product auth explicit with `YENTL_REQUIRE_AUTH=1`.

## Screenshots

Desktop:

- `docs/superpowers/validation/screenshots/source-picker-desktop-platform-aware.png`

Mobile 390px:

- `docs/superpowers/validation/screenshots/source-picker-mobile-390-platform-aware.png`

## Current risk register

### Must finish before public launch

1. Replace in-process rate limiting with shared/distributed limits.
2. Replace or augment the deterministic claim-scope gate with the intended policy classifier.
3. Verify Vercel Blob private upload/transcribe/delete behavior in deployed Vercel environment.
4. Confirm production Clerk env keys only for deployments that set `YENTL_REQUIRE_AUTH=1`.
5. Run a real Chrome extension end-to-end pass after the public-copy cleanup.
6. Ensure no public route links to `/project/*`.

### Should finish before launch

1. Add route-level observability for consent failures, rate-limit hits, Blob deletion failures, and claim-scope refusals.
2. Move the consent contract into public/privacy wording only after legal/product language is approved.
3. Add user-facing retry copy for consent/rate-limit failures where appropriate.
4. Add mobile web handoff UX for share-link/file-import expectations once native iOS/Android direction is set.

### Internal-only surfaces to keep internal

These are useful and should stay, but not leak into user source flows:

- `/project/validation`
- `/project/flows`
- `lib/validation/fixtures.ts`
- `public/validation/*`
- `test-corpus/*`
- `docs/superpowers/validation/*`
- corpus/replay/sample routes and reports

## Suggested next pickup

1. Add a Redis/Upstash-backed rate limiter while preserving the current helper API.
2. Expand the claim-scope gate to a policy-classifier route or model call with tests for refusal, decline, engage, and engage-cautiously.
3. Smoke the deployed private Blob flow: upload -> private Blob -> server stream -> Deepgram -> delete -> verify Blob no longer accessible.
4. Run the Chrome extension against one real video page, one YouTube page, and one text article page.
5. Re-scan public app routes for `validation`, `sample`, `corpus`, `localhost`, `/project`, `UNVERIFIED`, and `No backing`.

## Continuation update - 2026-05-25

Pickup completed from item 1 and part of item 5.

### Distributed limiter path added

Primary file:

- `lib/server/rate-limit.ts`

The shared `enforceRateLimit` helper is now async and uses an Upstash/Vercel-KV-compatible Redis REST backend when configured with:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- or `KV_REST_API_URL` + `KV_REST_API_TOKEN`

Behavior:

- Redis-backed limiting uses an atomic Lua script over REST to increment the bucket and set the TTL on first hit.
- In tests, the helper stays memory-backed unless `YENTL_RATE_LIMIT_BACKEND=redis` is explicitly set.
- Local/dev runs without Redis env vars keep the in-process fallback.
- Partial Redis configuration or Redis enforcement failure fails closed with `RATE_LIMIT_UNAVAILABLE` (`503`) rather than silently allowing cost-bearing traffic.
- Rate-limit keys hash the request IP before storing the bucket key.

All API routes that call `enforceRateLimit` now await it.

Tests:

- `tests/api/model-route-security.test.ts`

### Public/internal route tightening

Files touched:

- `app/session/page.tsx`
- `lib/validation/fixtures.ts`
- `proxy.ts`

Behavior:

- `/session?sample=...` no longer loads corpus replay samples unless `demo=validation` is also present.
- Internal validation links now use `/session?demo=validation&sample=...&view=watch`.
- Legacy `/session?view=flows` no longer redirects end users into `/project/flows`; it falls back to normal session behavior.
- Production proxy now protects `/project/*` and internal APIs behind Clerk when configured, blocks internal surfaces with 404 when Clerk is absent, and keeps guest-first `/session` behavior unless `YENTL_REQUIRE_AUTH=1`.

Tests:

- `tests/session-page.test.tsx`
- `tests/project-validation-page.test.tsx`
- `tests/middleware-security.test.ts`

Verification completed in this continuation:

```bash
npx vitest run tests/api/model-route-security.test.ts tests/api/deepgram-token.test.ts tests/api/upload-audio.test.ts tests/api/transcribe-batch.test.ts tests/api/media-ingest.test.ts tests/api/youtube-ingest.test.ts
npx vitest run tests/session-page.test.tsx tests/project-validation-page.test.tsx tests/middleware-security.test.ts tests/api/model-route-security.test.ts
npx tsc --noEmit
npm run lint
```

Results:

- Focused API/security run: `6` files passed, `67` tests passed.
- UI/middleware/security run: `4` files passed, `30` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with existing warnings only.

Remaining before launch:

1. Verify Redis-backed limiter against the real deployed Upstash/Vercel KV env.
2. Smoke the deployed private Blob upload/transcribe/delete path.
3. Replace or augment the deterministic claim-scope gate with the intended policy classifier.
4. Run the real Chrome extension end-to-end pass after this route cleanup.
5. Decide whether the validation-demo corpus loader should remain query-gated or move fully under a `/project/*` route.

## Continuation update - source-picker version build-out

The source-picker build-out is now beyond simple card reordering. The picker has platform-specific versions for:

- desktop Chrome
- desktop non-Chrome
- iOS web
- Android web
- generic mobile web

Primary file:

- `components/session/source-picker.tsx`

Behavior now implemented:

- Desktop Chrome gets same-page capture as the recommended source path.
- Desktop non-Chrome keeps only link/upload/text/mic/media alternatives visible and uses a short user-facing note for Chrome-extension current-page capture.
- iOS gets shared-link/File/Text/Mic/URL choices and does not expose tab capture as selectable.
- Android gets shared-link/file/text/mic/URL choices and does not expose tab capture as selectable.
- Generic mobile web gets shared-link/file/text/mic/media URL paths and does not expose tab capture as selectable.
- Cards are grouped by user job instead of internal technology/status labels.
- The end-user picker no longer shows destination-preview rails, disabled "future native path" cards, platform chips, screenshot/proof language, or flow-atlas/dev handoff language.

Flow atlas update:

- `components/session/az-flow-dashboard.tsx`

Updated the source-choice, source-selected, source-unavailable, and mobile-share/import nodes so `/project/flows` no longer marks these platform-version screens as missing.

Screenshot proof:

- `docs/superpowers/validation/screenshots/source-picker-desktop-chrome-variant.png`
- `docs/superpowers/validation/screenshots/source-picker-desktop-other-variant.png`
- `docs/superpowers/validation/screenshots/source-picker-ios-variant.png`
- `docs/superpowers/validation/screenshots/source-picker-android-variant.png`
- `docs/superpowers/validation/screenshots/source-picker-mobile-web-variant.png`

Verification completed for this build-out:

```bash
npx vitest run tests/source-picker.test.tsx
npx vitest run tests/source-picker.test.tsx tests/session-page.test.tsx tests/browser-tab-ingest-pane.test.tsx tests/youtube-ingest-pane.test.tsx tests/audio-ingest-pane.test.tsx tests/media-url-ingest-pane.test.tsx tests/mic-prerecord-pane.test.tsx
npx tsc --noEmit
npm run lint
npm run build
```

Results:

- Source picker unit run after visual cleanup: `1` file passed, `24` tests passed.
- Focused source/session ingest run after visual cleanup: `7` files passed, `108` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed.

Remaining product work at that checkpoint, superseded by later continuation updates:

1. Capture per-source permission-denied recovery states.
2. Wire native iOS/Android share target plumbing when the native shell exists.

## Continuation update - permission-denied and no-audio recovery

Browser-tab capture and live microphone capture now have user-facing recovery paths instead of dead-end failure banners.

Primary files:

- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`
- `app/session/layout.tsx`
- `tests/browser-tab-ingest-pane.test.tsx`
- `tests/session-layout.test.tsx`

Behavior now implemented:

- Browser-tab `error` status shows `Browser capture needs a different path` with `Upload recording`, `Use media URL`, `Paste text`, and `Use microphone` actions.
- Browser-tab `no_audio_detected` status gets different copy: Yentl connected to the tab but did not hear usable speech, with the same alternate source actions.
- Microphone permission denial now returns to the mic-ready pane instead of leaving the user in a paused workspace that still says it is listening.
- The mic recovery strip offers `Try microphone again`, `Upload recording`, `Paste text`, and `Check one claim`.
- Initial mic permission failure resets the empty attempted session back to the selected mic setup state; populated sessions keep their workspace and pause recording if a later mic restart fails.

Flow atlas update:

- `components/session/az-flow-dashboard.tsx`

The source-unavailable node no longer carries the per-source permission-recovery gap. Extension audio permission, extension no-audio, and mic browser-permission nodes now point to current screenshots and only retain the deeper browser/extension/mobile states that still need exact capture.

Screenshot proof:

- `docs/superpowers/validation/screenshots/browser-tab-permission-recovery.png`
- `docs/superpowers/validation/screenshots/browser-tab-no-audio-recovery.png`
- `docs/superpowers/validation/screenshots/mic-permission-recovery.png`

Verification completed for this continuation:

```bash
npx vitest run tests/browser-tab-ingest-pane.test.tsx tests/session-layout.test.tsx
npx tsc --noEmit
```

Results:

- Permission recovery run: `2` files passed, `21` tests passed.
- `npx tsc --noEmit`: passed.

Remaining product work at that checkpoint, superseded by later continuation updates:

1. Capture the exact Chrome extension/browser permission prompt and selected-tab-changed diagnostic state from the real extension surface.
2. Add mic device selection / browser settings help for blocked permissions.
3. Wire native iOS/Android share target plumbing when the native shell exists.

## Continuation update - active-session source switch confirmation

The session shell now has a real source-switch confirmation instead of a native browser confirm.

Primary files:

- `components/session/session-shell.tsx`
- `components/session/SourceSwitchDialog.tsx`
- `tests/session-shell.test.tsx`

Behavior now implemented:

- The in-session `Sources` control opens a Yentl-styled confirmation dialog.
- The dialog shows current utterance, claim, and marker counts before switching.
- Captured sessions get `Save first` and `Export first` exits.
- `Choose new source` stops browser-tab capture when needed, resets the workspace, and routes back to `/session`.
- Native `window.confirm` is no longer used for this product path.

Flow atlas update:

- `components/session/az-flow-dashboard.tsx`

The source-choice/source-selected nodes no longer list active-session source-switch confirmation as missing. The remaining source-picker gap is the dedicated claim-only quick-check pane.

Screenshot proof:

- `docs/superpowers/validation/screenshots/source-switch-confirmation.png`

Verification completed for this continuation:

```bash
npx vitest run tests/session-shell.test.tsx
npx vitest run tests/source-picker.test.tsx tests/session-page.test.tsx tests/session-shell.test.tsx
```

Results:

- Session shell run: `1` file passed, `43` tests passed.
- Combined source/session run: `3` files passed, `82` tests passed.

Remaining product work at that checkpoint, superseded by later continuation updates:

1. Build a dedicated claim-only quick-check pane if it should be separate from the text/transcript path.
2. Capture per-source permission-denied recovery states.
3. Wire native iOS/Android share target plumbing when the native shell exists.

## Continuation update - claim-only quick check

The source picker now includes a real claim-only entry path, backed by a dedicated pane rather than forcing single-claim work through the full transcript/document paste flow.

Primary files:

- `components/session/source-picker.tsx`
- `components/session/ingest-panes/claim-quick-check-pane.tsx`
- `lib/client/source-router.tsx`
- `lib/types.ts`
- `tests/claim-quick-check-pane.test.tsx`
- `tests/source-router.test.tsx`
- `tests/source-picker.test.tsx`

Behavior now implemented:

- `Check one claim` appears as a source-picker option on desktop and mobile variants.
- The source uses `text_doc` with `intent: "claim_only"` so existing source contracts remain stable while routing to a dedicated pane.
- The pane captures one claim plus optional context/source note.
- Too-short/topic-only entries are stopped before verification with user-facing recovery copy.
- Starting a quick check creates a claim-only session, adds a checking claim, calls provisional and confirmed verification, then routes to `/session?view=claims`.
- Existing sessions can run another quick check without restarting the session.
- The recording-consent reminder no longer appears on the generic picker or claim-only/text-style paths; it is reserved for selected mic/browser capture paths.

Flow atlas update:

- `components/session/az-flow-dashboard.tsx`

The source-choice/source-selected nodes no longer list the dedicated claim-only quick-check pane as missing. The claim-only quick-check node now points to the implemented pane screenshot, with remaining gaps limited to duplicate/recent-claim notice, guest limits, mobile capture, and dedicated result variants.

Screenshot proof:

- `docs/superpowers/validation/screenshots/claim-quick-check-pane.png`

Verification completed for this continuation:

```bash
npx vitest run tests/claim-quick-check-pane.test.tsx tests/source-picker.test.tsx tests/source-router.test.tsx
npx vitest run tests/claim-quick-check-pane.test.tsx tests/source-picker.test.tsx tests/source-router.test.tsx tests/session-page.test.tsx tests/session-shell.test.tsx tests/ux-flow-dashboard.test.tsx tests/two-party-disclosure.test.tsx
npx tsc --noEmit
npm run lint
npm run build
npm run test:run
```

Results:

- Claim/source routing run: `3` files passed, `41` tests passed.
- Focused flow/session/source run: `7` files passed, `111` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed.
- Full Vitest suite: `106` files passed, `1245` tests passed.

Remaining product work at that checkpoint, superseded by later continuation updates:

1. Capture the exact Chrome extension/browser permission prompt and selected-tab-changed diagnostic state from the real extension surface.
2. Add mic device selection / browser settings help for blocked permissions.
3. Wire native iOS/Android share target plumbing when the native shell exists.

## Final verification update for this handoff continuation

After the permission-recovery work, flow-atlas updates, screenshot refresh, and dashboard timeout stabilization, the broader verification state is:

```bash
npx vitest run tests/browser-tab-ingest-pane.test.tsx tests/session-layout.test.tsx tests/ux-flow-dashboard.test.tsx
npx vitest run tests/ux-flow-dashboard.test.tsx
npx tsc --noEmit
npm run lint
npm run build
npm run test:run
```

Results:

- Focused recovery/flow run: `3` files passed, `29` tests passed.
- Flow-dashboard run: `1` file passed, `8` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed.
- Full Vitest suite: `106` files passed, `1249` tests passed.

## Continuation update - mic device selection and settings recovery

The remaining mic recovery item from the handoff is now implemented in the web app: the user can choose a microphone before starting, the choice is passed into the real `getUserMedia` constraints, and permission-denied recovery preserves that selected device while explaining browser site-settings recovery.

Primary files:

- `components/session/ingest-panes/mic-prerecord-pane.tsx`
- `lib/client/mic.ts`
- `lib/client/session-store.ts`
- `app/session/layout.tsx`
- `tests/mic-prerecord-pane.test.tsx`
- `tests/mic.test.ts`
- `tests/session-store.test.ts`
- `tests/session-layout.test.tsx`

Behavior now implemented:

- The mic pre-record pane enumerates available audio inputs and shows a `Microphone input` selector plus a refresh action.
- `startMic` accepts `deviceId` and sends `deviceId: { exact: selectedId }` in the audio constraints while preserving the existing speaker-mode echo/noise/auto-gain behavior.
- `startSession` preserves the selected microphone device across the transition into a live mic session.
- Initial mic permission denial still returns to the mic-ready pane, but now preserves the selected device instead of wiping the user's choice.
- The permission recovery strip now explains the browser address-bar/site-settings path, then keeps `Try microphone again`, `Upload recording`, `Paste text`, and `Check one claim`.

Flow atlas update:

- `components/session/az-flow-dashboard.tsx`

The mic-consent node now points to the current device-picker screenshot instead of the older reference capture. The mic-permission node now notes preserved selected input and site-settings help; `select different mic` and `permission blocked settings help` are no longer listed as missing.

Screenshot proof:

- `docs/superpowers/validation/screenshots/mic-prerecord-device-picker.png`
- `docs/superpowers/validation/screenshots/mic-permission-recovery.png`

Verification completed for this continuation:

```bash
npx vitest run tests/mic-prerecord-pane.test.tsx tests/mic.test.ts tests/session-store.test.ts tests/session-layout.test.tsx
npx vitest run tests/mic-prerecord-pane.test.tsx tests/mic.test.ts tests/session-store.test.ts tests/session-layout.test.tsx tests/ux-flow-dashboard.test.tsx
npx vitest run tests/ux-flow-dashboard.test.tsx
npx tsc --noEmit
npm run lint
npm run build
npm run test:run
```

Results:

- Focused mic/device run: `4` files passed, `44` tests passed.
- Focused mic/device/flow run: `5` files passed, `52` tests passed.
- Flow-dashboard run: `1` file passed, `8` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed.
- Full Vitest suite: `106` files passed, `1252` tests passed.

Remaining product work at that checkpoint, superseded by later continuation updates:

1. Capture the exact Chrome extension/browser permission prompt and selected-tab-changed diagnostic state from the real extension surface.
2. Finish the remaining mic consent variants that are not just web-app UI: stronger privacy boundary copy, start-disabled consent gating if desired, and mobile OS permission capture.
3. Wire native iOS/Android share target plumbing when the native shell exists.

## Continuation update - selected-tab-changed extension diagnostic

The browser-tab capture flow now distinguishes "capture failed" from "Yentl is still listening to the original tab, but the active Chrome tab changed." This removes the selected-tab-changed item from the reachable extension diagnostic list.

Primary files:

- `extension/background.js`
- `extension/README.md`
- `components/session/ExtensionBridge.tsx`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`
- `components/session/session-shell.tsx`
- `components/session/extension-panel-view.tsx`
- `lib/client/session-store.ts`
- `tests/browser-tab-ingest-pane.test.tsx`
- `tests/extension-bridge.test.tsx`
- `tests/extension-same-page.test.ts`
- `tests/session-shell.test.tsx`
- `tests/extension-panel-view.test.tsx`

Behavior now implemented:

- Extension background status checks compare the active Chrome tab against the stored captured tab.
- When they differ, the extension returns `phase: "tab_changed"` with source-title recovery copy.
- The app-side bridge accepts the new `tab_changed` phase and stores it in browser-tab status.
- The public browser-tab pane treats `tab_changed` as a recovery state with upload, media URL, paste text, and microphone alternatives.
- The session header/rail and extension-panel phase map now show a "return to captured tab" status rather than generic waiting.

Flow atlas update:

- `components/session/az-flow-dashboard.tsx`

The extension audio-permission node no longer lists `selected tab changed` as missing. Its note points to the selected-tab recovery screenshot as a separate implemented proof state; the exact Chrome permission prompt still remains external/manual.

Screenshot proof:

- `docs/superpowers/validation/screenshots/browser-tab-selected-tab-changed-recovery.png`

Verification completed for this continuation:

```bash
npx vitest run tests/browser-tab-ingest-pane.test.tsx tests/extension-bridge.test.tsx tests/extension-same-page.test.ts tests/session-shell.test.tsx tests/extension-panel-view.test.tsx
npx vitest run tests/browser-tab-ingest-pane.test.tsx tests/extension-bridge.test.tsx tests/extension-same-page.test.ts tests/session-shell.test.tsx tests/extension-panel-view.test.tsx tests/ux-flow-dashboard.test.tsx
npx tsc --noEmit
npm run lint
npm run build
npm run test:run
```

Results:

- Focused selected-tab diagnostic run: `5` files passed, `69` tests passed.
- Focused selected-tab/flow run: `6` files passed, `77` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed.
- Full Vitest suite: `106` files passed, `1254` tests passed.

Remaining product work:

1. Capture the exact Chrome permission prompt from the real extension surface.
2. Finish remaining mic consent variants that depend on product policy/platform behavior: stronger privacy boundary copy, start-disabled consent gating if desired, and mobile OS permission capture.
3. Wire native iOS/Android share target plumbing when the native shell exists.

## Continuation update - mic consent and share target completion

The remaining web-app pieces from the latest continuation are now implemented: mic start is consent-gated, mobile/web share payloads route into the right source panes, and `/project/flows` no longer lists those source-picker items as missing web-app states.

Primary files:

- `app/manifest.ts`
- `app/session/page.tsx`
- `app/session/layout.tsx`
- `components/session/ingest-panes/mic-prerecord-pane.tsx`
- `components/session/ingest-panes/text-ingest-pane.tsx`
- `components/session/ingest-panes/youtube-ingest-pane.tsx`
- `components/session/ingest-panes/media-url-ingest-pane.tsx`
- `components/session/az-flow-dashboard.tsx`
- `lib/client/session-store.ts`
- `lib/types.ts`

Behavior now implemented:

- The PWA manifest registers Yentl as a GET share target for `title`, `text`, and `url` payloads at `/session`.
- `/session?url=...` now routes shared YouTube links into the YouTube ingest pane and shared non-YouTube HTTP(S) links into the media URL pane.
- `/session?text=...` and title/text share payloads now route into a prefilled text ingest pane.
- YouTube, media URL, and text ingest panes initialize from the selected source, so share/import handoff payloads are visible before processing.
- The mic pre-record pane now has explicit record/analyze consent copy, a required consent checkbox, disabled start until consent, and mobile OS/browser permission guidance.
- The spacebar mic-start shortcut now respects accepted mic consent instead of bypassing the pre-start gate.
- Mic permission-denied recovery preserves both selected microphone and accepted consent while returning the user to the mic setup state.
- The flow atlas marks the implemented mic-consent and mobile share-target web states as current, with current screenshot proof paths.

Screenshot proof:

- `docs/superpowers/validation/screenshots/mic-prerecord-consent-gated.png`
- `docs/superpowers/validation/screenshots/mobile-share-target-youtube-prefill.png`
- `docs/superpowers/validation/screenshots/mobile-share-target-text-prefill.png`
- `docs/superpowers/validation/screenshots/mobile-share-target-text-prefill-390.png`

Verification completed for this continuation:

```bash
npx vitest run tests/mic-prerecord-pane.test.tsx tests/session-layout.test.tsx tests/session-page.test.tsx tests/manifest.test.ts tests/text-ingest-pane.test.tsx tests/youtube-ingest-pane.test.tsx tests/media-url-ingest-pane.test.tsx tests/ux-flow-dashboard.test.tsx
npx tsc --noEmit
npm run lint
npm run build
npx vitest run --maxWorkers=1
curl -s http://127.0.0.1:3000/manifest.webmanifest
```

Results:

- Focused mic/share/manifest/flow run: `8` files passed, `104` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed. The Next.js middleware/proxy convention warning noted here was resolved in a later continuation by moving to `proxy.ts`.
- Full Vitest suite with constrained workers: `107` files passed, `1261` tests passed.
- Local browser mic check: `Start a session` was disabled before consent and enabled after checking consent; privacy/mobile permission copy was visible.
- Local browser shared YouTube check: `https://youtu.be/dQw4w9WgXcQ` opened the YouTube pane with the input prefilled and `Fetch captions` enabled.
- Local browser shared text check: shared text opened the text pane with the textarea prefilled and `Process transcript` enabled.
- Local browser mobile-width check: shared text at `390px` viewport rendered with `scrollWidth: 390`.
- Manifest check: `/manifest.webmanifest` exposes the `share_target` contract for `title`, `text`, and `url`.
- Chrome backend check: Chrome automation connected successfully. The exact Yentl Tab Listener Chrome-toolbar permission prompt is still a manual proof item because the current automation can control page tabs but not click/capture an unpacked extension toolbar prompt in the user's Chrome profile without changing browser extension state.

Remaining external/manual proof:

1. Capture the exact Chrome permission prompt from a manually loaded `extension/` build in Chrome using the README flow (`chrome://extensions` -> Load unpacked -> `public/validation/browser-capture.html` -> click the Yentl extension action).
2. Wire native-shell deep links only if an actual iOS/Android native wrapper is introduced. The web/PWA share-target path is now implemented.
3. Deployed Redis limiter and private Blob upload/transcribe/delete smoke tests still require the real deployment environment and secrets.

## Continuation update - policy classifier, observability, and retry copy

The remaining buildable launch-hardening items from the risk register are now implemented locally: the deterministic claim-scope gate is augmented with a production model-classifier path, route-level security events are emitted for consent/rate-limit/claim-scope/Blob-deletion failures, and client retry copy no longer exposes raw API statuses for common safety gates.

Primary files:

- `lib/prompts/claim-scope.ts`
- `lib/server/engagement-gate.ts`
- `lib/server/security-events.ts`
- `lib/server/rate-limit.ts`
- `lib/server/consent.ts`
- `app/api/verify-provisional/route.ts`
- `app/api/verify-confirmed/route.ts`
- `app/api/transcribe-batch/route.ts`
- `lib/client/api-errors.ts`
- `lib/client/audio-ingest.ts`
- `components/session/ingest-panes/claim-quick-check-pane.tsx`
- `components/session/ingest-panes/media-url-ingest-pane.tsx`
- `components/session/ingest-panes/youtube-ingest-pane.tsx`

Behavior now implemented:

- Claim-scope screening keeps the deterministic first guard, then uses the model classifier in production or when `YENTL_CLAIM_SCOPE_CLASSIFIER=model` is set.
- The classifier supports `engage`, `engage_cautiously`, `decline`, and `refuse`; unavailable classifier checks fail closed with `CLAIM_SCOPE_UNAVAILABLE` (`503`).
- Verification routes await the new async gate before any verification model or web-search work.
- Structured `yentl-security-event` logs are emitted for missing source-analysis consent, rate-limit hits, shared limiter outages, claim-scope declines/refusals/cautious passes, classifier outages, and Vercel Blob deletion failures.
- Security logs avoid raw claim text, raw source URLs, and raw client IPs.
- Audio upload/transcription, quick claim check, media URL ingest, and YouTube ingest now translate consent/rate-limit/safety-gate envelopes into user-facing retry or recovery copy.
- Private Blob deletion failures remain non-fatal to the finished transcription, but are now observable as security events.

Tests added/updated:

- `tests/api/model-route-security.test.ts`
- `tests/api/deepgram-token.test.ts`
- `tests/api/transcribe-batch.test.ts`
- `tests/audio-ingest.test.ts`
- `tests/api-errors.test.ts`
- `tests/claim-quick-check-pane.test.tsx`
- `tests/media-url-ingest-pane.test.tsx`
- `tests/youtube-ingest-pane.test.tsx`

Verification completed for this continuation:

```bash
npx vitest run tests/api/model-route-security.test.ts tests/api/deepgram-token.test.ts tests/api/transcribe-batch.test.ts tests/audio-ingest.test.ts tests/api-errors.test.ts tests/claim-quick-check-pane.test.tsx tests/media-url-ingest-pane.test.tsx tests/youtube-ingest-pane.test.tsx
npx tsc --noEmit
npm run lint
npm run build
npx vitest run --maxWorkers=1
```

Results:

- Focused policy/observability/retry run: `8` files passed, `118` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed. The Next.js middleware/proxy convention warning noted here was resolved in a later continuation by moving to `proxy.ts`.
- Full Vitest suite with constrained workers: `108` files passed, `1272` tests passed.
- Local browser check: `http://127.0.0.1:3000/session` rendered the source picker, the `Quick check` card opened the claim pane, and an incomplete claim showed the expected validation recovery.

Remaining external/manual proof:

1. Capture the exact Chrome permission prompt from a manually loaded `extension/` build in Chrome using the README flow.
2. Smoke the deployed Redis limiter and private Blob upload/transcribe/delete path against the real deployment environment and secrets.
3. Wire native-shell deep links only if an actual iOS/Android wrapper is introduced; the web/PWA share-target path is already implemented.

## Continuation update - public launch readiness sweep

This continuation closed the remaining local/buildable launch-readiness gaps that were still visible after the policy/observability pass. The app is now internally consistent for a guest-first v1 public preview, while still supporting account-gated deployments by setting `YENTL_REQUIRE_AUTH=1`.

Primary files:

- `proxy.ts`
- `app/layout.tsx`
- `app/contact/page.tsx`
- `lib/contact.ts`
- `scripts/launch-smoke.ts`
- `app/session/page.tsx`
- `app/api/corpus-sample/route.ts`
- `components/session/extension-panel-view.tsx`
- `components/session/SaveSessionDialog.tsx`
- `components/session/ExportDialog.tsx`
- `app/sessions/page.tsx`
- `extension/manifest.json`
- `extension/manifest.local.json`
- `extension/README.md`
- `.env.example`

Behavior now implemented:

- Public validation-demo loading is disabled in production unless explicitly enabled, and both `/session?demo=validation...` and the extension-panel validation fixture honor the disable flag.
- The Chrome extension launch manifest defaults to `https://yentl.it` and no longer includes localhost permissions; `extension/manifest.local.json` holds the local validation permissions separately.
- Save/export failures now show visible retry errors instead of silently closing or swallowing errors.
- The local saved-session library now has a user-controlled clear-all flow with confirmation.
- A public `/contact` page exists with support, privacy, and accessibility mailboxes, and the public trust pages link to it.
- Auth mode is explicit: guest-first is the default, while deployments can set `YENTL_REQUIRE_AUTH=1` to protect `/session` and cost-bearing APIs.
- Internal project dashboards and write APIs are not publicly exposed in production. If Clerk is absent, they return 404; if Clerk is configured, they are protected.
- The request gate moved from deprecated `middleware.ts` to `proxy.ts`, clearing the Next.js 16 middleware/proxy convention warning.
- `scripts/launch-smoke.ts` now checks the public manifest, contact page, session auth contract, internal corpus API exposure, and internal project dashboard/comment API exposure. Optional Redis/rate and Blob token smoke checks remain environment-gated.
- The root layout no longer throws a production Clerk publishable-key runtime error for guest-first/keyless deployments.
- The YouTube local validation-caption fixture is explicitly regression-tested to stay disabled in production.

Tests added/updated:

- `tests/extension-panel-view.test.tsx`
- `tests/session-page.test.tsx`
- `tests/api/corpus-sample.test.ts`
- `tests/extension-same-page.test.ts`
- `tests/save-session-button.test.tsx`
- `tests/export-dialog.test.tsx`
- `tests/sessions-library-page.test.tsx`
- `tests/launch-smoke-script.test.ts`
- `tests/trust-contact-pages.test.tsx`
- `tests/middleware-security.test.ts`
- `tests/youtube-validation-fixtures.test.ts`

Verification completed:

```bash
npx vitest run tests/middleware-security.test.ts tests/launch-smoke-script.test.ts tests/trust-contact-pages.test.tsx tests/session-page.test.tsx tests/extension-panel-view.test.tsx tests/youtube-validation-fixtures.test.ts
npx vitest run tests/session-page.test.tsx tests/youtube-validation-fixtures.test.ts tests/api/youtube-ingest.test.ts
npx vitest run tests/save-session-button.test.tsx tests/export-dialog.test.tsx tests/sessions-library-page.test.tsx tests/session-storage.test.ts
npx tsc --noEmit
npm run lint
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
YENTL_SMOKE_BASE_URL=http://127.0.0.1:3001 npm run smoke:launch
npx vitest run --maxWorkers=1
```

Results:

- Focused new-regression runs passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed with no Next.js middleware/proxy warning.
- Local production start: `http://127.0.0.1:3001/session` returned `200`, `http://127.0.0.1:3001/contact` returned `200`, `http://127.0.0.1:3001/project/validation` returned `404`, and `http://127.0.0.1:3001/api/corpus-sample?id=solo_005` returned `404`.
- Launch smoke against local production passed: manifest share target, public contact page, guest-first session entry, internal corpus sample not exposed, and internal project surfaces not exposed.
- Full Vitest suite with constrained workers: `111` files passed, `1292` tests passed.
- Browser QA on `http://127.0.0.1:3000/session`: desktop source picker rendered without `corpus`, `Functional samples`, `/project`, `localhost:3000`, or validation-lab copy; `Quick check` opened a claim pane without internal leaks.
- Browser QA on `http://127.0.0.1:3000/contact`: support, privacy, and accessibility mailto links were visible.
- Browser QA at 390px viewport: `/session` rendered with `scrollWidth: 390`.

Remaining external/manual proof:

1. Capture the exact Chrome permission prompt from a manually loaded `extension/` build in the user's Chrome profile.
2. Run `YENTL_SMOKE_BASE_URL=<deployed URL> YENTL_SMOKE_RATE_LIMIT=1 npm run smoke:launch` against the real deployed Redis/Upstash/Vercel KV environment.
3. Run `YENTL_SMOKE_BASE_URL=<deployed URL> YENTL_SMOKE_BLOB_TOKEN=1 npm run smoke:launch` against the real deployed Vercel Blob environment.
4. Complete non-code legal/compliance sign-offs that are still marked pending in `docs/dpia.md` and `docs/dpa-status.md`: transfer impact assessments, Quebec PIA/Law 25 review, Anthropic retention confirmation, and manual screen-reader testing.
5. Wire native-shell deep links only if an actual iOS/Android wrapper is introduced; the web/PWA share-target path is implemented.

## Continuation update - full-surface honesty pass

This continuation corrected the earlier over-broad "launch-ready" language. The local web/PWA and Chrome-extension-adjacent launch surface is significantly stronger, but the app is not honestly complete across every screen/state/version. The flow atlas still records deeper UI states, native shell work, configured-auth recovery captures, real extension permission prompts, and deployed-environment proofs that are outside the local buildable pass.

### What was built in this pass

Primary files:

- `app/page.tsx`
- `app/pricing/page.tsx`
- `app/faq/page.tsx`
- `app/demo/page.tsx`
- `app/signin/[[...rest]]/page.tsx`
- `app/signup/[[...rest]]/page.tsx`
- `app/api/youtube-preview/route.ts`
- `components/session/ingest-panes/youtube-ingest-pane.tsx`
- `components/session/az-flow-dashboard.tsx`
- `scripts/launch-smoke.ts`
- `tests/public-entry-pages.test.tsx`
- `tests/api/youtube-preview.test.ts`

Behavior now implemented:

- The homepage is now a full product entry surface with hero, examples, source paths, method, features, trust links, pricing, FAQ, and guest/account entry routes.
- `/pricing` now publishes the honest v1 posture: free public preview, no published paid plan, responsible partner pilot by contact, and no hidden enterprise/SLA promise.
- `/faq` now answers launch-critical questions about authority, supported sources, accounts, local saves, media handling, rhetoric markers, captions/playback failures, and pricing.
- `/demo` now gives guest users a real entry path, including a prepared text sample that routes into `/session?title=...&text=...` plus a normal source-picker exit.
- Sign-in and sign-up routes now preserve a guest-first value frame instead of becoming blank account walls. Keyless builds show fallback CTAs; configured Clerk builds get product-context panels and guest/privacy exits.
- A new `/api/youtube-preview` route resolves YouTube identity before caption fetch: video id, title, channel, thumbnail URL, and thumbnail provenance (`youtube-oembed` or `youtube-static`).
- The YouTube ingest pane now shows title/channel/thumbnail provenance before the user fetches captions.
- Launch smoke now checks `/`, `/pricing`, `/faq`, and `/demo` in addition to manifest, contact, session entry, and internal route exposure.
- `/project/flows` was updated so public entry, trust/pricing/FAQ, auth fallback, guest demo, and YouTube preview nodes no longer pretend those code surfaces are missing.

Screenshot proof added:

- `docs/superpowers/validation/screenshots/public-homepage-full.png`
- `docs/superpowers/validation/screenshots/youtube-preview-identity.png`
- `docs/superpowers/validation/screenshots/auth-signin-fallback.png`
- `docs/superpowers/validation/screenshots/auth-signup-fallback.png`
- `docs/superpowers/validation/screenshots/guest-demo-entry.png`

Flow-atlas state after this pass:

- Total nodes: `99`
- Current screenshot/status nodes: `20`
- Reference-only nodes: `31`
- Stale nodes: `2`
- Still-missing nodes: `46`
- Nodes still carrying at least one missing-state note: `93`

This is the important honesty point: the atlas is improving, but it still does not represent every screen, every interaction, every recovery state, or every app-version wrapper as complete.

### Current version-scope truth

Code-backed surfaces in this repo:

- Next.js web/PWA app under `app/*`
- Chrome extension under `extension/*`
- Public/internal flow and validation dashboards under `/project/*`
- Test corpus and local validation fixtures

No native iOS/Android wrapper was found in the repo:

- Directory sweep only found `./node_modules/msw/native` for native-like directory names.
- No `Podfile`, `Info.plist`, `build.gradle`, `AndroidManifest.xml`, `capacitor.config.*`, or native-shell `app.json` was found.

Therefore, native iOS/Android app versions cannot be called launch-ready from this repo. The implemented mobile work is web/PWA/share-target behavior, not native wrapper behavior.

### Verification completed for this pass

Focused and regression commands:

```bash
npx vitest run tests/public-entry-pages.test.tsx tests/trust-contact-pages.test.tsx tests/auth-fallback.test.tsx
npx vitest run tests/api/youtube-preview.test.ts tests/youtube-ingest-pane.test.tsx
npx vitest run tests/ux-flow-dashboard.test.tsx tests/public-entry-pages.test.tsx tests/auth-fallback.test.tsx tests/api/youtube-preview.test.ts tests/youtube-ingest-pane.test.tsx
npx tsc --noEmit
npm run lint
npm run build
npx vitest run --maxWorkers=1
npm run start -- --hostname 127.0.0.1 --port 3001
YENTL_SMOKE_BASE_URL=http://127.0.0.1:3001 npm run smoke:launch
```

Results:

- Focused public/auth tests: `3` files passed, `8` tests passed.
- Focused YouTube preview/API tests: `2` files passed, `23` tests passed.
- Focused flow/public/auth/YouTube regression: `5` files passed, `37` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed.
- Full Vitest suite with constrained workers: `113` files passed, `1299` tests passed.
- Local production launch smoke passed: manifest share target, public entry pages, public contact page, guest-first session entry, internal corpus sample not exposed, and internal project surfaces not exposed.

Browser QA:

- `http://127.0.0.1:3000/` rendered hero, pricing, FAQ, and trust sections with no `/project`, validation-lab, or functional-sample leaks; desktop `scrollWidth` matched viewport width (`1280`).
- `http://127.0.0.1:3000/pricing`, `/faq`, and `/demo` rendered without public/internal copy leaks.
- `http://127.0.0.1:3000/session?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ` opened the YouTube pane with recognized video id, title, channel, thumbnail, and `Thumbnail source: YouTube oEmbed` copy.

### Still not done, by category

Buildable local web/app UI still represented as gaps in `/project/flows`:

- Deeper YouTube progress variants: transcript ghost rows, claim/evidence placeholder rail, mobile capture, duration, caption precheck, edit URL confirmation, timeout/retry.
- Auth with real configured Clerk: invalid credentials, password reset, email verification, expired session, post-auth redirect, and mobile auth recovery captures.
- Document/PDF/OCR states and article URL import remain target states, not implemented production paths.
- Visual evidence detail layer still needs first-class source-detail drawers, no-thumbnail reason variants, claim source gallery variants, and mobile detail captures.
- Some review-depth states remain target/reference: Yentl Opinion live update variants, Devil's Advocate strengthening flow, report preview, end-session save/export sheet, and several mobile bottom-sheet views.

External/manual proof still required:

1. Load the extension in the user's real Chrome profile and capture the exact permission prompt, selected-tab-changed diagnostic, one real video page, one YouTube page, and one text article page.
2. Run launch smoke against the deployed URL with Redis/Upstash/Vercel KV enabled and `YENTL_SMOKE_RATE_LIMIT=1`.
3. Run launch smoke against the deployed URL with Vercel Blob enabled and `YENTL_SMOKE_BLOB_TOKEN=1`.
4. Complete legal/compliance sign-offs in `docs/dpia.md` and `docs/dpa-status.md`.
5. Create native iOS/Android wrappers before claiming native app versions are launch-ready.

## Continuation update - project dashboard screenshot review pass

This pass answered the dashboard-specific gap: `/project/flows` is now the review surface for current route screenshots instead of only a planning atlas.

What changed:

- `components/session/ux-flow-dashboard.tsx` now opens on the `A-to-Z Flow` tab by default, with `Screen Atlas` and `Visual Evidence System` still available as tabs.
- `components/session/az-flow-dashboard.tsx` now registers a route screenshot review group with 24 current screenshot-backed nodes.
- `tests/ux-flow-dashboard.test.tsx` now verifies the default commentable screenshot dashboard, the route nodes, the screenshot modal, target-UI actuals, and point-comment create/edit/remove controls.

Screenshot proof added to both:

- `docs/superpowers/validation/screenshots/route-*.png`
- `public/visual-evidence/flow-screenshots/current/route-*.png`

Captured route/page-state set:

- `/`, `/about`, `/methodology`, `/privacy`, `/terms`, `/subprocessors`, `/accessibility`, `/contact`, `/pricing`, `/faq`, `/demo`, `/changelog`
- `/signin`, `/signup`, `/sessions`, `/session`
- `/session?url=...` YouTube preview state
- `/session?title=...&text=...` text prefill state
- `/project/validation`, `/project/flows`
- `/session/detail/claim/c-1` empty current-session state
- `/session/detail/marker/marker-123` empty current-session state
- `/session/learn/marker/loaded_language`
- `/session/learn/claim/c-1` empty current-session state

Verification completed:

```bash
npx vitest run tests/ux-flow-dashboard.test.tsx
npx tsc --noEmit
npm run lint
npm run build
```

Results:

- Focused dashboard test: `1` file passed, `8` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with the existing `17` warnings.
- `npm run build`: passed.
- Browser QA confirmed `/project/flows` opens to `A-to-Z Flow`, exposes `24` route screenshot buttons, opens the `Home / Product Page` screenshot modal, and shows the screenshot point-comment input. Automated typing into the textarea was blocked by the in-app browser virtual clipboard, so the exact create/edit/remove comment behavior is covered by the passing dashboard unit test.

Still not done:

- Mobile-specific route captures are still separate work; the route nodes retain mobile-capture notes.
- Populated dynamic detail/learn routes still need hydrated session captures.
- Configured Clerk, deployed rate-limit/blob, and real Chrome-extension permission-page captures still require those external environments.

## Continuation update - mobile and populated route proof

This pass completed the local, buildable route-proof gaps that were still listed above.

What changed:

- Added repeatable headless Chrome DevTools capture tooling at `scripts/visual-evidence/capture-launch-screenshots.ts`.
- Added `npm run visual:capture-launch`.
- Captured 390px mobile route screenshots for the route screenshot review set into both:
  - `public/visual-evidence/flow-screenshots/current/route-*-mobile.png`
  - `docs/superpowers/validation/screenshots/route-*-mobile.png`
- Added validation-sample hydration for direct detail/learn routes:
  - `components/session/validation-sample-hydrator.tsx`
  - `app/session/detail/[type]/[id]/page.tsx`
  - `app/session/learn/[type]/[id]/page.tsx`
- Captured populated dynamic route screenshots for claim detail, marker detail, claim learn, and marker learn in desktop and mobile.
- Added an in-dialog export report preview in `components/session/ExportDialog.tsx`, with desktop and mobile screenshot proof:
  - `route-session-report-preview.png`
  - `route-session-report-preview-mobile.png`
- Updated `/project/flows` to include mobile route review nodes, populated dynamic route review nodes, and current report-preview proof.
- Fixed mobile session-header action wrapping and a marker-learn long-heading overflow discovered during screenshot review.
- Added `docs/superpowers/validation/2026-05-26-external-launch-proof-checklist.md` for proof items that still require real Chrome profile, deployed env, configured Clerk, or legal authority.

Still not done:

- Real Chrome extension permission prompt and real-site captures remain external/manual proof.
- Deployed Redis/Upstash/Vercel KV and Blob smokes remain external deployment proof.
- Configured Clerk error/recovery/post-auth/mobile captures remain external deployment proof.
- Legal/compliance signoff remains owner/legal-counsel proof, not a codebase-local completion.
- Document/PDF/OCR/article import is still a product build gap beyond pasted text/share-target handling.
