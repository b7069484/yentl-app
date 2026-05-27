# YouTube Live Pipeline Proof - 2026-05-26

## Current Product Goal

The YouTube URL path must keep the playable video on the left and let Yentl release live transcript and analysis on the right against the same playback clock.

## Saved Design Artifacts

- Desktop/live wireframe: `.project/screenshots/youtube-wireframe-connected-metric-no-rail-header-2026-05-26.png`
- Fresh/autosave wireframe: `.project/screenshots/youtube-wireframe-fresh-autosave-toast-2026-05-26.png`
- Short URL/update wireframe: `.project/screenshots/youtube-wireframe-short-url-live-2026-05-26.png`
- Rail tab depth mockups:
  - `.project/screenshots/youtube-rail-transcript-tab-tall-2026-05-26.png`
  - `.project/screenshots/youtube-rail-findings-tab-tall-2026-05-26.png`
  - `.project/screenshots/youtube-rail-findings-lower-tall-2026-05-26.png`
- Source HTML wireframe: `public/validation/youtube-live-wireframe.html`

## Wired Code Path

- `components/session/ingest-panes/youtube-ingest-pane.tsx`
  - Starts analysis in-place instead of routing to the old static session view.
  - Arms timed caption segments returned by `/api/youtube-ingest`.
  - Releases caption lines from the YouTube player clock via `onTimeUpdate`.
  - Sends released lines through `appendFinal` and `onFinalUtterance` so transcript and claim analysis update as playback advances.
  - Keeps Yentl's Read as the first right-rail block.
  - Uses the YouTube title/channel to derive visible speaker names when possible.
  - Groups raw caption fragments into speaker turns and splits mixed caption lines when a turn changes mid-caption.
  - Shows a direct tab-audio fallback state when public captions are unavailable.
- `app/session/page.tsx`
  - Preserves `?source=youtube&url=...` instead of letting the generic share-target handler strip the query and reset the page.
- `lib/server/youtube-captions.ts`
  - Adds a `youtube-transcript` fallback between Innertube and yt-dlp so available YouTube transcripts are not falsely reported as missing.
- `package.json` / `package-lock.json`
  - Adds `youtube-transcript@^1.3.1`.
- `tests/youtube-ingest-pane.test.tsx`
  - Covers caption fetch, in-place analysis start, clock-driven release, title-derived speaker labels, mixed-speaker caption splitting, final utterance analysis, and fallback transcript rendering.
- `tests/youtube-captions.test.ts`
  - Covers the new transcript-scraper fallback before yt-dlp.

## Working Proof URLs

Use:

`http://localhost:3000/session?source=youtube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DfTznEIZRkLg`

This uses the Rosling validation video:

`https://www.youtube.com/watch?v=fTznEIZRkLg`

Current API proof:

- `video_id`: `fTznEIZRkLg`
- `title`: `Hans Rosling: Global population growth, box by box`
- `validation_fixture`: `false`
- timed segments returned: `241`
- first segment: `I still remember the day in school` at `16.26s`

Wide desktop proof:

- Armed state: `.project/screenshots/youtube-pipeline-11-wide-captions-armed-2026-05-26.png`
- Live release state: `.project/screenshots/youtube-pipeline-12-wide-live-release-2026-05-26.png`

The live release proof shows the video playing at `00:36`, `9` timed transcript lines released, and Yentl's Read updated to "Live synced."

Exact user URL:

`http://localhost:3000/session?source=youtube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DIDC8PrZQHts`

`https://www.youtube.com/watch?v=IDC8PrZQHts`

Current API proof:

- `video_id`: `IDC8PrZQHts`
- `title`: `Tucker Debates Kevin O'Leary in Heated Exchange`
- `validation_fixture`: `false`
- timed segments returned: `283`
- first segment: `Let me ask though about why taxpayers` at `0s`

Wide desktop proof:

- `.project/screenshots/youtube-pipeline-14-wide-exact-url-live-captions-2026-05-26.png`
- `.project/screenshots/youtube-live-ui-header-speaker-fix-initial-2026-05-26.png`
- `.project/screenshots/youtube-live-ui-speaker-turns-running-split-2026-05-26.png`

The latest live proof shows the Tucker video playing at `00:33`, `17` timed transcript lines released, the URL control moved into the top strip, the player no longer vertically stretches its shell, and the transcript grouped into named speaker turns: Tucker Carlson and Kevin O'Leary.

## Verification

Passed:

- `pnpm lint app/session/page.tsx components/session/ingest-panes/youtube-ingest-pane.tsx tests/youtube-ingest-pane.test.tsx`
- `pnpm test:run tests/youtube-ingest-pane.test.tsx`
- `pnpm test:run tests/youtube-captions.test.ts tests/youtube-ingest-pane.test.tsx tests/display-audio-capture.test.ts tests/api/deepgram-token.test.ts`

Latest focused result:

- `tests/youtube-ingest-pane.test.tsx`: 15 passed.
- combined caption/live-audio set: 4 files, 56 tests passed.

API checks with consent header:

- `fTznEIZRkLg`: returns 241 timed segments, no validation fixture.
- `IDC8PrZQHts`: returns 283 timed segments, no validation fixture.
- `/api/deepgram/token`: returns 200 with an ephemeral key and expiry present.

## Remaining Wiring Gap

The caption-backed pipeline is working in the same screen.

The captionless path is wired and unit-tested:

- `lib/client/display-audio-capture.ts` requests Chrome display capture with audio-sharing hints.
- `components/session/ingest-panes/youtube-ingest-pane.tsx` sends MediaRecorder chunks into `openDeepgramStream`.
- final Deepgram utterances flow through `appendFinal` and `onFinalUtterance`, matching the caption-backed transcript/analysis rail.
- `tests/display-audio-capture.test.ts` covers audio-share options, no-audio recovery, chunk forwarding, and track cleanup.
- `tests/youtube-ingest-pane.test.tsx` covers a no-captions YouTube URL starting tab-audio capture and routing final utterances into Yentl analysis.

For arbitrary YouTube videos without public captions, the remaining launch-critical proof is live browser permission/share-audio capture in Chrome. The UI now falls back to that path honestly, but the final proof still needs the user-visible capture stack to:

1. capture tab/system audio from the active YouTube player,
2. stream it into transcription,
3. push final utterances through the same transcript/claim/Yentl's Read rail,
4. verify the flow with a known captionless YouTube URL.
