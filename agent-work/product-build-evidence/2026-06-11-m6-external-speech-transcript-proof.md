# 2026-06-11 M6 External Speech Transcript Proof

## Scope

Closed the first real external speech-transcription proof for the installed
Chrome extension. Previous external runs proved panel injection and tabCapture
state, but did not prove that a non-local media URL produced live transcription.

## Product/Proof Change

- Added offscreen capture diagnostics to `extension/offscreen.js`:
  token timing, media recorder state, socket state, audio chunk counts, bytes
  sent, Deepgram result counts, final/interim transcript counts, and transcript
  previews.
- Exposed offscreen diagnostics through `extension/background.js` and the
  installed-extension proof artifact.
- Hardened `scripts/validation/prove-installed-extension-local.mjs`:
  - uses resolved target metadata and DevTools target id for redirected/native
    media pages;
  - records JSON-safe media playback candidates and attempts;
  - adds a hard proof timeout;
  - supports `YENTL_EXTENSION_PROOF_REQUIRE_LIVE_TRANSCRIPT=1`;
  - distinguishes offscreen transcription proof from cross-origin iframe text
    readability;
  - records panel transcript-status proof when the external-page shell receives
    transcript/capture messages.

## Proof

Command:

```bash
YENTL_EXTENSION_PROOF_TARGET_URL='https://archive.org/download/MLKDream/MLKDream_64kb.mp3' \
YENTL_EXTENSION_PROOF_SHORTCUT=1 \
YENTL_EXTENSION_PROOF_SHORTCUT_STRATEGY=os \
YENTL_EXTENSION_PROOF_TRANSCRIPT_WAIT_MS=60000 \
YENTL_EXTENSION_PROOF_REQUIRE_LIVE_TRANSCRIPT=1 \
YENTL_EXTENSION_PROOF_HARD_TIMEOUT_MS=140000 \
node scripts/validation/prove-installed-extension-local.mjs
```

Result:

```json
{
  "ok": true,
  "invocation_path": "keyboard-shortcut",
  "tab_capture_stream_id_available": true,
  "deepgram_socket_open_proven": true,
  "offscreen_audio_chunks_proven": true,
  "media_playback_proven": true,
  "panel_transcript_status_proven": true,
  "live_transcription_proven": true
}
```

Offscreen diagnostics:

```json
{
  "chunksObserved": 203,
  "bytesObserved": 982604,
  "chunksSent": 203,
  "bytesSent": 982604,
  "socketResultCount": 71,
  "emptyTranscriptResults": 24,
  "finalTranscriptCount": 11,
  "interimTranscriptCount": 36,
  "transcriptChars": 1176,
  "lastTranscriptPreview": "as a great"
}
```

Artifacts:

- `docs/superpowers/validation/installed-extension-external-proof.json`
- `docs/superpowers/validation/screenshots/installed-extension-external-page.png`

## Boundary

The proof cannot read the panel iframe body on an external page because the
iframe is cross-origin from the captured page. It therefore proves transcription
through offscreen diagnostics and the content-script panel status, not through
direct iframe text inspection. The controlled local fixture still proves iframe
transcript rendering with readable text.
