# Yentl Tab Listener

Manifest V3 Chrome extension for live browser-tab audio capture.

## What It Does

- Captures the active tab after the user clicks the extension action.
- Injects a Yentl analysis side panel into that same tab, so the media player
  and analysis remain visible together.
- Keeps the captured tab audible by routing the captured stream back to the default audio output.
- Starts recording tab audio immediately, buffers early audio while Deepgram
  connects, then streams the buffered and live chunks with the same `nova-3`
  options as the web mic path.
- Loads the Yentl `/session` app inside the injected panel and forwards
  interim/final transcript events into that frame with a per-capture bridge
  token.
- Uses the compact `/session?surface=extension-panel` UI inside the iframe, so
  the injected panel is not a squeezed copy of the full desktop workspace.
- Surfaces connected/no-speech status from the offscreen capture worker when
  the tab stream is open but no transcript has arrived yet.
- Warns when the active Chrome tab no longer matches the tab Yentl is capturing,
  so the user can return to the original source page or choose a fallback path.
- Lets the existing Yentl app pipeline handle claim extraction, verification,
  rhetoric markers, synthesis, and the Grok-backed Devil's Advocate brief.

## Production Install

1. In Chrome, open `chrome://extensions`.
2. Enable Developer mode for unpacked validation, or install the packaged build.
3. Click Load unpacked and select this `extension/` directory.
4. Open a media page or article page in Chrome.
5. Click the Yentl extension action while that source page is the active tab.
6. Yentl should appear as a right-side panel on that same page while the media
   continues playing.

The default Yentl origin is `https://yentl.it`. Change it in the extension
options page only for preview or internal validation deployments.

## Local Validation

The launch manifest is production-first and does not grant localhost access by
default. For local end-to-end validation:

1. Run the app with `npm run dev` at `http://localhost:3000`.
2. Temporarily copy `manifest.local.json` over `manifest.json`.
3. Load the unpacked `extension/` directory in Chrome.
4. Open `http://localhost:3000/validation/browser-capture.html`.
5. Set the extension options page origin to `http://localhost:3000`.
6. Play either the 16:9 video fixture or the audio-only fixture.
7. Click the Yentl extension action while that fixture page is the active tab.
8. Restore the production `manifest.json` before packaging or launch review.

## Architecture Notes

- `background.js` owns the user gesture, injects the panel content script,
  obtains a `chrome.tabCapture.getMediaStreamId()`, creates the offscreen
  document, and forwards transcript events back to the captured media tab.
- `offscreen.js` consumes the stream ID with `getUserMedia`, preserves local
  playback with `AudioContext`, starts `MediaRecorder` before Deepgram is ready,
  buffers early chunks, and maintains the Deepgram WebSocket.
- `content-script.js` renders the in-page side panel, loads the app iframe, and
  bridges extension messages into that iframe after the app announces that its
  bridge is ready.
- `components/session/ExtensionBridge.tsx` is the app-side receiver.
- `components/session/extension-panel-view.tsx` is the extension-specific
  compact analysis surface with transcript, claim/marker snapshot, expandable
  evidence, and Grok Devil's Advocate.

Chrome 116+ is required because service-worker-created tab capture stream IDs can be consumed by an offscreen document starting there.
