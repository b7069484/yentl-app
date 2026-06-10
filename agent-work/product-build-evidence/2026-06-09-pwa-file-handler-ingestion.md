# PWA File Handler Ingestion

Date: 2026-06-09

## Product Change

- Registered Yentl as an installed-PWA file handler for supported document, caption, audio, and video files.
- Added a conservative launch-file mapper that routes:
  - `.txt`, `.md`, `.pdf`, `.docx`, `.srt`, and `.vtt` into the text/document ingest path.
  - `.mp3`, `.wav`, `.m4a`, `.ogg`, `.opus`, `.webm`, `.mp4`, and `.mov` into the audio/video ingest path.
  - unknown files with blank or unsupported MIME to no-op instead of inventing a source.
- Added a session-mounted `launchQueue` consumer that:
  - handles one launched file at a time for v1.
  - refuses to overwrite an already-started session.
  - stages the browser `File` object transiently in the session store.
  - reuses the normal text/audio panes instead of creating a parallel parser.
- Added transient launch-file store state and clear actions; pending launch files are cleared by `startSession`, `reset`, and `restoreSession`.
- Updated text ingest to auto-load a pending launched document/caption file through the same parser and metadata path as manual upload.
- Updated audio ingest to auto-stage a pending launched audio/video file through the same probe/transcription path as manual upload.
- Updated `/mobile` platform copy so Android and Files sections describe installed-app supported-file opening.
- Fixed the `/mobile` logo/home link to meet a 44px touch-target height.

## Verification

- Focused tests:
  - `npx vitest run tests/manifest.test.ts tests/launch-files.test.ts tests/pwa-file-launch-handler.test.tsx tests/text-ingest-pane.test.tsx tests/audio-ingest-pane.test.tsx tests/session-store.test.ts tests/session-store-restore.test.ts tests/session-page.test.tsx tests/public-entry-pages.test.tsx`
  - Result: 9 files passed, 113 tests passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/manifest.webmanifest`, `/mobile`, `/session`, `/sessions`, and `/tv` remain in the build output.
- Standalone typecheck:
  - `npx tsc --noEmit`
  - Result: passed after the build regenerated `.next/types`.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Live Proof

- Manifest HTTP proof:
  - `curl -sS http://127.0.0.1:3000/manifest.webmanifest`
  - Confirmed:
    - `start_url: "/mobile"`
    - share target still routes `title`, `text`, and `url` into `/session`.
    - `file_handlers[0].action: "/session"`.
    - Accept map includes `.txt`, `.md`, `.vtt`, `.srt`, `.pdf`, `.docx`, `.mp3`, `.wav`, `.m4a`, `.ogg`, `.opus`, `.webm`, `.mp4`, and `.mov`.
- Browser proof at 390px mobile viewport on `http://127.0.0.1:3000/mobile`:
  - Page title: `Yentl mobile app`.
  - New Android copy visible: installed app can open supported files.
  - New Files copy visible: installed-app file opens.
  - `documentElement.scrollWidth` and `body.scrollWidth` both measured `390`.
  - Horizontal overflow count: `0`.
  - Visible undersized interactive target count after logo fix: `0`.

## Remaining Product Gap

This completes the web/PWA file-handler registration and in-app launch-file routing. It does not prove real OS-level install/open-with behavior on physical iOS or Android devices, and it does not add native wrapper projects. Actual native install proof still needs device-level validation once the app is deployed on an HTTPS origin with the manifest served to installable browsers.
