# M2 Ingestion Route And Recovery Proof

Timestamp: 2026-06-09 21:46 EDT

## Scope

This was a focused M2 ingestion hardening slice, not the full M2 exit declaration.

Implemented:
- Added route-context preservation for one-claim quick-check result navigation.
- Made microphone device status announce through `role=status` / `role=alert`.
- Added route-level `/api/document-ingest` coverage for selectable PDFs, missing file, unsupported containers, no-text-layer scanned PDFs, and parser cleanup on parse failure.
- Fixed `/api/document-ingest` to destroy the PDF parser in a `finally` path when extraction throws.
- Enlarged the two-party recording reminder dismiss control to a 44x44 mobile tap target.

## Verification

Commands:
- `npx vitest run tests/api/document-ingest.test.ts tests/mic-prerecord-pane.test.tsx tests/claim-quick-check-pane.test.tsx tests/two-party-disclosure.test.tsx` passed: 4 files, 27 tests.
- `npx vitest run tests/youtube-ingest-pane.test.tsx tests/web-url-ingest-pane.test.tsx tests/media-url-ingest-pane.test.tsx tests/audio-ingest-pane.test.tsx tests/text-ingest-pane.test.tsx tests/browser-tab-ingest-pane.test.tsx tests/claim-quick-check-pane.test.tsx tests/mic-prerecord-pane.test.tsx tests/api/youtube-ingest.test.ts tests/api/youtube-preview.test.ts tests/api/article-ingest.test.ts tests/api/media-ingest.test.ts tests/api/transcribe-batch.test.ts tests/api/upload-audio.test.ts tests/api/document-ingest.test.ts` passed: 15 files, 200 tests.
- `npx tsc --noEmit` passed.
- `npm run lint` passed with 0 errors and the existing 18-warning baseline.
- `npm run test:run` passed: 147 files, 1641 tests.
- `npm run build` passed.
- `npm run build:automation` passed.

Browser smoke:
- Desktop quick-check source route rendered the quick-check pane with 0 console errors and 0 horizontal overflow.
- Mobile 390x844 source-picker-to-microphone path rendered the mic pane, kept Start disabled until consent, had 0 console errors, 0 horizontal overflow, no small visible controls after excluding the native checkbox inside its padded label, and the recording reminder dismiss control measured 44x44.
- Temporary Chrome tab proof: consent gate accepted, Current tab source selected through `button[data-source-card-id="browser-tab"]`, Check extension action fired, browser-tab pane and Chrome extension checklist rendered, 0 console errors, and 0 horizontal overflow.

Real external ingest proof:
- `/api/article-ingest` imported `https://www.w3.org/TR/WCAG22/` with status 200, title `Web Content Accessibility Guidelines (WCAG) 2.2`, 19,965 source words, and the intended 2,200-word analysis cap.
- `/api/media-ingest` rejected `https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg` because Deepgram's remote fetch received 403 from the host. This is an external-host/provider fetch blocker, not a Yentl URL validation blocker.
- `/api/media-ingest` successfully transcribed `https://raw.githubusercontent.com/mozilla/DeepSpeech/master/data/smoke_test/LDC93S1.wav` with status 200, MIME `audio/wav`, and 1 Deepgram utterance.

## Input Checklist

- YouTube: pane and API coverage for paste, preview, validation fixture, fallback/error states.
- Current-tab extension: pane coverage for waiting/recovery states, Chrome UI proof for selecting Current tab and firing Check extension. Full packaged extension audio capture belongs to M6.
- Web/article URL: pane and API coverage plus real W3C article import proof.
- Direct media URL: pane and API coverage plus real public WAV transcription proof; remote-host 403 case recorded from Wikimedia.
- Audio/video upload: pane and API coverage for validation WAV, file validation, large-file upload progress, transcription failure, and handoff.
- Microphone: pane coverage for consent/device selection, unavailable browser, permission-denied recovery, mobile browser proof.
- Text/doc/PDF/SRT/VTT: pane coverage for paste, launch files, TXT/MD/DOCX/PDF/VTT/SRT validation loaders, timed text, unsupported/oversized files, and document metadata.
- One-claim quick check: pane coverage for context guard, duplicate handling, two-stage progress, rate-limit recovery, result routing, and route-context preservation.

## Remaining M2 Work

- Full audio capture from a real media page through the packaged Chrome extension remains for the M6 extension packaging/proof milestone.
