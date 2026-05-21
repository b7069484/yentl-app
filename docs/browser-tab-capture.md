# Browser Tab Capture Architecture

Yentl's Chrome extension path must make "any video on any page" feel like the
YouTube Watch experience: the media player and Yentl analysis belong together
on the same page. The production target is an in-page side panel or overlay
launched from the extension on the page where the video is playing, not a
separate Yentl tab that listens in the background.

## Why This Path

- Server-side YouTube captions are brittle in production because YouTube blocks
  many data-center IPs. The v1.6 handoff confirmed both Innertube and yt-dlp
  fail from Vercel while working locally.
- A Chrome extension can capture the active tab after the user clicks the
  extension action. That works for YouTube, social video, news sites, embedded
  players, livestreams, and private pages the user can already play.
- The same extension should inject or open Yentl as a side panel/overlay in
  that page so users keep the source video, transcript, claims, and evidence in
  one visual workspace.
- The extension is not only an audio listener. When the active page already has
  readable text, Yentl should extract that page text immediately and analyze it
  through the same transcript, claim, marker, and synthesis pipeline. Audio
  capture then adds live transcript lines when playable media is present.
- Chrome 116+ allows a Manifest V3 service worker to call
  `chrome.tabCapture.getMediaStreamId()` and pass the ID to an offscreen
  document, which can consume the stream with `getUserMedia`.
- Captured tab audio is muted unless the extension routes the stream back to an
  `AudioContext` destination, so the offscreen document does that immediately.

Official Chrome references:

- `chrome.tabCapture`: https://developer.chrome.com/docs/extensions/mv2/reference/tabCapture
- Audio recording and screen capture: https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
- `chrome.offscreen`: https://developer.chrome.com/docs/extensions/reference/api/offscreen

## Current Implementation

Files:

- `extension/manifest.json`
- `extension/background.js`
- `extension/offscreen.html`
- `extension/offscreen.js`
- `extension/content-script.js`
- `extension/options.html`
- `extension/options.js`
- `components/session/ExtensionBridge.tsx`
- `components/session/extension-panel-view.tsx`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`
- `public/validation/browser-capture.html`
- `public/validation/extension-panel-preview.html`
- `public/validation/yentl-synthetic-panel.wav`
- `public/validation/yentl-synthetic-panel.mp4`

Current same-page flow:

1. User clicks the Yentl extension while a tab is playing audio.
2. `background.js` injects `content-script.js` into that same media tab with
   `chrome.scripting.executeScript()`.
3. `content-script.js` creates a fixed Yentl side panel on the page and loads
   `/session?source=browser-tab&surface=extension-panel` in an iframe.
4. `content-script.js` extracts readable text from the active page and sends a
   `page-text` event to the panel, so real article pages work even without
   playable media.
5. `/session?surface=extension-panel` renders a compact side-panel experience
   instead of the full session chrome.
6. The app bridge and content script exchange messages with a per-capture
   bridge token so transcript events reach only that injected panel.
7. `background.js` creates or reuses the offscreen document and obtains a tab
   capture stream ID.
8. `offscreen.js` consumes the stream ID, keeps audio audible, opens a Deepgram
   live WebSocket, and emits interim/final transcript events.
9. If the stream opens but no transcript arrives, `offscreen.js` sends a
   no-speech status so the panel can tell the user what is happening.
10. `background.js` forwards capture, status, and transcript events back to the
   media tab.
11. `content-script.js` buffers events until the iframe app bridge says it is ready.
12. `ExtensionBridge.tsx` starts a `browser_tab` session, appends page-text and
   audio transcript segments, and lets the existing claim/rhetoric/synthesis
   pipeline run.

Local test path:

1. Run `npm run dev`.
2. Load `extension/` as an unpacked Chrome extension.
3. Open `http://localhost:3000/validation/browser-capture.html`.
4. Play either the 16:9 video fixture or the audio-only fixture.
5. Click the Yentl extension action in that same tab.
6. Expected result: the page reserves space for a right-side Yentl panel, the
   compact extension panel appears, status updates move from waiting to
   connected/transcribing/no-speech as appropriate, and transcript lines appear
   when Deepgram returns speech.

Real external validation targets:

1. Video page:
   `https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm`
   - Expected: Yentl injects into the real Wikimedia page, extracts page text
     immediately, and transcribes tab audio after the native video plays.
2. Text page:
   `https://en.wikinews.org/wiki/Residents_shelter_in_place_for_hours_after_gas_leak_outside_of_Los_Angeles`
   - Expected: Yentl injects into the real Wikinews article, extracts readable
     article text, and starts the analysis pipeline without waiting for media.

Repeatable harness:

```bash
node scripts/validation/verify-real-webpage-targets.mjs
```

The harness fetches both real targets, loads the actual extension content
script into those page DOMs, opens the Yentl panel, verifies a `page-text`
snapshot, and writes the proof report to
`docs/superpowers/validation/real-webpage-targets.json`.

Static layout preview:

- Open `http://localhost:3000/validation/extension-panel-preview.html` to see
  the expected same-page composition without installing the extension. The
  preview is a representative third-party article/video page; the page remains
  intact and Yentl is injected on the right. This page uses `demo=validation`
  in the iframe so transcript, claim, and marker rows are visible immediately.
  It is a preview of the intended product state, not proof that tab audio has
  been captured.

Product flow:

1. User opens any page with readable content and/or playable media.
2. User clicks the Yentl extension on that page.
3. The extension opens a Yentl side panel or overlay in the same page.
4. If page text is present, Yentl extracts and analyzes it immediately.
5. If playable media is present, the extension captures that tab's audio and
   streams transcript lines into the same analysis session.
6. The panel renders the same core analysis experience: player context,
   transcript, claims, markers, evidence queue, synthesis, save, and export.
7. The user never has to switch away from the source page to understand what
   Yentl is reading or hearing.

## Still Needed Before Store Release

- Add signed extension build and Chrome Web Store listing assets.
- Add a proper extension popup with start/stop status, target tab title, current
  Yentl origin, and capture diagnostics instead of relying only on the action
  badge and injected panel chrome.
- Decide whether the injected panel remains the production default or graduates
  to Chrome's native Side Panel API where available.
- Add user-visible permission and consent copy for recording third-party audio.
- Add a native pause/resume handshake between the Yentl app and extension.
- Add an automated installed-extension integration harness. The local manual
  media fixture now exists at `/validation/browser-capture.html`.
- Add production app-origin defaults once `yentl.it` DNS is fully live.

## Mobile App Prep

This browser extension path does not map directly to iOS because iOS apps cannot
generally capture arbitrary other-app audio. The mobile architecture should be:

- iOS/Android microphone live capture for conversations.
- File/share-sheet import for downloaded audio and video.
- URL ingestion where the URL is a direct media file.
- Platform-specific screen/audio capture only where OS APIs and policy allow it.
- Shared Yentl core contracts: `TranscriptSegment`, `SessionSource`,
  claim/marker/synthesis APIs, and saved-session export formats.
