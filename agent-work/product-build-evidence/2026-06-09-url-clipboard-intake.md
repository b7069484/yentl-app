# URL Clipboard Intake

Date: 2026-06-09

## Product Change

- Added a shared client helper for clipboard URL intake:
  - extracts the first `http` or `https` URL from copied prose.
  - normalizes the URL with the browser `URL` parser.
  - rejects empty clipboard text, missing URLs, unsupported clipboard access, and denied permissions with explicit user-facing messages.
- Added clipboard paste controls to all three URL-based source panes:
  - web/article URL import
  - direct media URL import
  - YouTube live-watch import
- Added visible success/error status near each source input so users know whether the paste worked.
- Kept each URL pane's existing routing behavior:
  - article/web URLs still import through `/api/article-ingest`.
  - direct media URLs still transcribe through `/api/media-ingest`.
  - YouTube URLs still use the live player/caption/tab-audio path.
- Fixed source-intake mobile touch targets discovered during browser proof:
  - YouTube Start control
  - YouTube Transcript/Findings tabs
  - YouTube fallback action buttons
  - media URL browser-tab fallback buttons

## Verification

- Focused tests:
  - `npx vitest run tests/clipboard-url.test.ts tests/web-url-ingest-pane.test.tsx tests/media-url-ingest-pane.test.tsx tests/youtube-ingest-pane.test.tsx`
  - Result: 4 files passed, 52 tests passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/session`, `/mobile`, `/manifest.webmanifest`, and source API routes remain in the build output.
- Standalone typecheck:
  - `npx tsc --noEmit`
  - Result: passed after the build regenerated `.next/types`.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Browser Proof

- Rendered each source-entry state at 390px mobile viewport:
  - web/article URL: `/session?title=Clipboard%20proof&url=https%3A%2F%2Fexample.com%2Fstory`
  - direct media URL: `/session?title=Clipboard%20proof&url=https%3A%2F%2Fexample.com%2Fepisode.mp3`
  - YouTube URL: `/session?source=youtube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ`
- Confirmed in the rendered DOM:
  - expected paste action visible in each pane.
  - `documentElement.scrollWidth` and `body.scrollWidth` measured `390` in each pane.
  - horizontal overflow count: `0` in each pane.
  - visible undersized button count after fixes: `0` in each pane.

## Remaining Product Gap

Clipboard paste now improves mobile and desktop URL intake, but it is still browser-permission dependent. Full native share/open-with coverage still requires device-level iOS/Android validation on a deployed HTTPS origin, and URL intake still needs richer pasted-content parsing for cases where users copy whole article snippets without any URL.
