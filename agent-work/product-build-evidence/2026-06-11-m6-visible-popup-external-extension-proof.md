# 2026-06-11 M6 Visible Popup External Extension Proof

## Scope

Refreshed the real installed-extension path after the newer M6 work. This proof
uses a visible temporary Chrome profile, loads the unpacked extension, opens a
real Wikimedia Commons WebM page, starts Yentl through popup automation, and
records capture/panel evidence.

## Proof

Command:

```bash
npm run extension:proof:external
```

Result:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T21:39:28.566Z",
  "external_proof": true,
  "headless": false,
  "target_url": "https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm",
  "proof": {
    "invocation_path": "popup",
    "popup_click_proven": true,
    "manual_invocation_proven": true,
    "panel_injection_proven": true,
    "tab_capture_stream_id_available": true,
    "page_text_proven": true
  }
}
```

Fresh latency:

```json
{
  "total_ms": 14830,
  "media_ready_ms": 1637,
  "capture_invocation_ms": 1637,
  "panel_injection_ms": 13193,
  "first_transcript_wait_ms": 5010,
  "manual_capture_wait_ms": 7355
}
```

Artifacts:

- `docs/superpowers/validation/installed-extension-external-proof.json`
- `docs/superpowers/validation/screenshots/installed-extension-external-page.png`
- `docs/superpowers/validation/extension-latency-samples.json`

## Boundary

The proof confirms the user-gesture/popup path, tabCapture stream ID, same-page
panel injection, and page-text handoff on a real video page. It did not produce a
live transcript line from the external WebM during the probe window, so real
external audio transcription remains a launch smoke target.
