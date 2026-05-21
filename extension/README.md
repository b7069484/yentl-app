# Yentl Tab Listener

Manifest V3 Chrome extension for live browser-tab audio capture.

## What It Does

- Captures the active tab after the user clicks the extension action.
- Injects a Yentl analysis side panel into that same tab, so the media player
  and analysis remain visible together.
- Keeps the captured tab audible by routing the captured stream back to the default audio output.
- Streams tab audio to Deepgram with the same `nova-3` live options as the web mic path.
- Loads the Yentl `/session` app inside the injected panel and forwards
  interim/final transcript events into that frame with a per-capture bridge
  token.
- Uses the compact `/session?surface=extension-panel` UI inside the iframe, so
  the injected panel is not a squeezed copy of the full desktop workspace.
- Surfaces connected/no-speech status from the offscreen capture worker when
  the tab stream is open but no transcript has arrived yet.
- Lets the existing Yentl app pipeline handle claim extraction, verification, rhetoric markers, and synthesis.

## Local Install

1. Run the app with `npm run dev` at `http://localhost:3000`.
2. In Chrome, open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked and select this `extension/` directory.
5. Open `http://localhost:3000/validation/browser-capture.html`.
6. Play either the 16:9 video fixture or the audio-only fixture.
7. Click the Yentl extension action while that fixture page is the active tab.
8. Yentl should appear as a right-side panel on that same page while the media
   continues playing.

The default Yentl origin is `http://localhost:3000`. Change it in the extension options page for production or preview deployments.

## Architecture Notes

- `background.js` owns the user gesture, injects the panel content script,
  obtains a `chrome.tabCapture.getMediaStreamId()`, creates the offscreen
  document, and forwards transcript events back to the captured media tab.
- `offscreen.js` consumes the stream ID with `getUserMedia`, preserves local playback with `AudioContext`, and maintains the Deepgram WebSocket.
- `content-script.js` renders the in-page side panel, loads the app iframe, and
  bridges extension messages into that iframe after the app announces that its
  bridge is ready.
- `components/session/ExtensionBridge.tsx` is the app-side receiver.
- `components/session/extension-panel-view.tsx` is the extension-specific
  compact analysis surface.

Chrome 116+ is required because service-worker-created tab capture stream IDs can be consumed by an offscreen document starting there.
