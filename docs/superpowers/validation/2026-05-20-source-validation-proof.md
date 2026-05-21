# Yentl Source Validation Proof

Run date: 2026-05-20 23:47 EDT

This is the current proof record for the source-ingest validation pass. It separates product UI proof from project-management surfaces and keeps reusable fixtures in the repo.

## Fixture Catalog

- Project UI: `/project/validation`
- Fixture manifest: `lib/validation/fixtures.ts`
- Local browser-tab page: `public/validation/browser-capture.html`
- Real video webpage fixture:
  `https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm`
- Real article webpage fixture:
  `https://en.wikinews.org/wiki/Residents_shelter_in_place_for_hours_after_gas_leak_outside_of_Los_Angeles`
- Real webpage harness report:
  `docs/superpowers/validation/real-webpage-targets.json`
- Corpus report:
  `public/corpus-report/index.html`
- Functional corpus samples:
  `/session?sample=solo_005&view=watch`,
  `/session?sample=cable_008&view=watch`,
  `/session?sample=israel_010&view=watch`
- Synthetic audio: `public/validation/yentl-synthetic-panel.wav`
- Synthetic 16:9 video: `public/validation/yentl-synthetic-panel.mp4`
- Same-page panel preview: `public/validation/extension-panel-preview.html`
- Text fixtures: `public/validation/yentl-synthetic-transcript.txt`, `public/validation/yentl-synthetic-transcript.md`
- Timed-text fixtures: `public/validation/yentl-synthetic-captions.vtt`, `public/validation/yentl-synthetic-captions.srt`
- YouTube validation fixture: `https://www.youtube.com/watch?v=fTznEIZRkLg`
- Media URL validation fixture: `https://raw.githubusercontent.com/mozilla/DeepSpeech/master/data/smoke_test/LDC93S1.wav`

## API Proof

- `POST /api/youtube-ingest` with `fTznEIZRkLg` returned the local development validation fixture: title `Hans Rosling: Global population growth, box by box`, channel `TED`, 10 transcript segments, first segment `I still remember the day in school`.
- `POST /api/youtube-ingest` with `dQw4w9WgXcQ` returned the expected `NO_CAPTIONS` recovery branch.
- `POST /api/transcribe-batch` with `public/validation/yentl-synthetic-panel.wav` returned 5 utterances and 1 speaker. First utterance began `Welcome to the Yentle validation panel. The city library budget increased by 12% this year...`.
- `POST /api/media-ingest` with the Mozilla WAV returned `audio/wav`, 1 utterance, first utterance `She had your ducks suit and greasy wash water all year.`
- The earlier Wikimedia OGG candidate was rejected as a ready fixture because Deepgram remote fetch returned 403, even though its HEAD metadata looked acceptable.

## Rendered UI Proof

Screenshots saved under `docs/superpowers/validation/screenshots/`:

- `validation-lab.png`: project validation lab renders 9 fixtures and the runbook.
- `youtube-watch-success.png`: rendered `/session?view=watch` after YouTube ingest, with the 16:9 player surface, Hans Rosling metadata, 10 transcript lines, and evidence queue.
- `media-url-watch-success.png`: rendered `/session?view=watch` after direct media URL ingest, with transcript text from the Mozilla WAV.
- `text-transcript-success.png`: rendered `/session?view=transcript` after text fixture ingest, with two speaker lanes and the synthetic transcript.
- `browser-tab-waiting-recovery.png`: rendered Browser tab waiting state with the fallback message, extension origin checklist, and `Sources` escape hatch.
- `session-source-picker-job-ui.png`: rendered `/session` after the job-based source-picker redesign, with no active-session chrome and “Analyze a video I can play” as the primary path.
- `browser-capture-validation-page.png`: rendered `/validation/browser-capture.html` with both the 16:9 video fixture and audio-only fixture.
- `extension-panel-surface.png`: rendered `/session?surface=extension-panel&source=browser-tab` with the compact side-panel UI and without the old session nav/export/library chrome.
- `extension-panel-same-page-preview.png`: earlier rendered `/validation/extension-panel-preview.html` with media on the left and the 430px Yentl panel on the right.
- `extension-panel-realistic-page-preview.png`: rendered the updated preview as a representative third-party Civic Ledger article/video page with site header, article copy, video, page sidebar modules, and the injected Yentl panel on the right.
- `extension-panel-demo-analysis-full.png`: rendered `/validation/extension-panel-preview.html` after adding preview demo data, showing transcript, claim count, marker count, live transcript rows, and evidence queue content.
- `real-webpage-wikimedia-candidate.png`: rendered the actual Wikimedia
  Commons WebM file page selected for installed-extension validation.
- `real-webpage-wikinews-text-candidate.png`: rendered the actual Wikinews
  article page selected for text-only extension validation.
- `project-validation-corpus-samples.png`: rendered `/project/validation` with
  the corpus proof section and three functional sample links.
- `corpus-functional-sample-cable-008.png`: rendered
  `/session?sample=cable_008&view=watch` with 12 transcript rows, 1 claim, and
  6 markers loaded into the Watch UI.

## Product Bug Fixed

Successful prerecorded ingests were loading transcript data but sometimes leaving users on Overview instead of Watch. Root cause: the ingest pane unmounted when `bulkIngest()` started a session, and its unmount cleanup aborted the same controller used by the success redirect. The fix adds a handoff guard to the text, audio, YouTube, and media URL panes so expected session-start unmounts do not cancel the post-ingest navigation or background analysis.

## Browser-Tab Capture Status

Architectural correction: the browser-tab path is not meant to make Yentl
listen to another tab while the user watches elsewhere. The target UX is same
page: click the extension on the media page, then keep the media player and
Yentl analysis visible together as a side panel or overlay, matching the
YouTube Watch mental model.

The app-side browser-tab flow is now testable and visible:

- The Browser tab source enters a `Waiting` state.
- If the extension does not answer, the UI shows `No extension response yet...` with the required `http://localhost:3000` origin and a `Choose another source` escape path.
- The local audio page exists at `/validation/browser-capture.html` and contains an `<audio>` element pointing to `/validation/yentl-synthetic-panel.wav`.
- The ExtensionBridge unit tests verify capture-start, transcript-final, capture-stop, status, and synthesis dispatch behavior.

Update after the same-page extension pass:

- The extension no longer opens/reuses a separate Yentl session tab.
- `background.js` injects the content script into the clicked media page, and
  the content script renders a right-side Yentl analysis panel on that page.
- The panel loads `/session?source=browser-tab&surface=extension-panel` and
  uses a per-capture bridge token for iframe/app messages.
- The app now has a dedicated compact `surface=extension-panel` route for the
  injected iframe, so the same-page extension panel is not the full desktop
  session UI squeezed into a narrow column.
- `offscreen.js` now forwards capture status, including a no-speech notice when
  the tab stream opens but no transcript arrives after the initial wait.
- The local browser-capture page now includes both a known speech audio fixture
  and a generated 16:9 MP4 video fixture using that same audio.
- The content script now extracts readable text from the active page and sends
  it to the side-panel bridge as `page-text`, so real article pages are
  analyzable even when no playable media exists.
- `ExtensionBridge.tsx` turns `page-text` chunks into transcript segments and
  sends them through the same claim/rhetoric pipeline used by final audio
  transcript utterances.
- `node scripts/validation/verify-real-webpage-targets.mjs` verifies the real
  Wikimedia and Wikinews targets by loading their HTML, injecting the actual
  content script, opening the Yentl side panel, and confirming page-text capture.

What remains for browser-tab capture is a true installed-extension run in Chrome:
open a real page, click the Yentl extension, and verify that the side panel
appears on that same page. For video, use the Wikimedia Commons WebM page and
confirm both page text and audio transcript lines arrive. For text-only, use the
Wikinews article and confirm readable page text is analyzed without waiting for
audio.

Latest extension-readiness verification:

- `npx vitest run tests/extension-panel-view.test.tsx tests/extension-bridge.test.tsx tests/extension-content-script.test.ts tests/extension-same-page.test.ts tests/session-page.test.tsx tests/session-shell.test.tsx`
- Result: 6 files passed, 62 tests passed.
- `npx tsc --noEmit`
- Result: passed.
- `npm run lint`
- Result: passed with 0 errors and 21 existing warnings.
- Browser rendered `http://localhost:3000/validation/browser-capture.html`: video fixture present, audio fixture present, no horizontal overflow.
- Browser rendered `http://localhost:3000/session?surface=extension-panel&source=browser-tab&bridge=demo-token&title=Fixture%20video`: compact extension panel present, no session nav, no Export button, no Library link, no source picker.
- Browser rendered `http://localhost:3000/validation/extension-panel-preview.html`: video fixture present, right-side panel width 430px, iframe width 429px, no horizontal overflow.
- Browser rendered `http://localhost:3000/validation/extension-panel-preview.html` with `demo=validation` iframe: panel shows transcribing state, 4 transcript lines, 1 claim, 1 marker, and a note explaining that this is preview data while the browser-capture page remains the installed-extension live test.
- Browser rendered the updated realistic page preview: publisher header present, article headline present, page sidebar present, video present, Yentl panel fixed to the right edge, demo iframe enabled, and no horizontal overflow.

## Test Proof

Targeted tests after the fix:

- `npx vitest run tests/youtube-ingest-pane.test.tsx tests/media-url-ingest-pane.test.tsx tests/audio-ingest-pane.test.tsx tests/project-validation-page.test.tsx tests/youtube-validation-fixtures.test.ts tests/media-mime.test.ts`
- Result: 6 files passed, 94 tests passed.

Full verification after the fix:

- `npx vitest run`
- Result: 92 files passed, 1135 tests passed.
- `npx tsc --noEmit`
- Result: passed.
- `npm run lint`
- Result: passed with 0 errors and 25 pre-existing warnings.

Earlier API/UI smoke proof in this pass also verified:

- `/project/validation` rendered the fixture catalog.
- `/project/validation` now exposes the 100-video corpus report and the three
  replay-backed functional samples.
- `/api/corpus-sample?id=cable_008` returns a rendered-session-ready sample:
  YouTube source metadata, 12 transcript segments, 1 claim, and 6 markers.
- YouTube fixture reached Watch.
- Media URL fixture reached Watch.
- Text fixture reached Transcript.
- Browser-tab waiting recovery rendered correctly.

## Corpus Report Integration

The 100-video corpus report changed the acceptance picture from ad hoc source
checks to category-backed product evidence:

- Phase A transcription quality is acceptable on the scored caption subset:
  median WER 8.94%, mean WER 9.82%, p90 WER 20.62%.
- Coverage is balanced across 10 content families, with all 100 videos
  transcribed and 20.8 transcript hours represented.
- Diarization stress is concentrated where expected: cable-news debate,
  political debate, interviews, and sensitive editorial-review categories.
- Replay slices proved the current local APIs on three useful product states:
  clean solo explainer, rhetoric-heavy crosstalk, and sensitive
  Israel/antisemitism review with provisional verification.

Integrated changes:

- Added `GET /api/corpus-sample?id=...` for `solo_005`, `cable_008`, and
  `israel_010`.
- Added `/session?sample=<id>&view=watch`, which loads the replayed transcript,
  claims, markers, speakers, and YouTube source into the real Watch UI.
- Added a corpus proof section to `/project/validation` so the report and
  functional samples are visible from the validation lab.
