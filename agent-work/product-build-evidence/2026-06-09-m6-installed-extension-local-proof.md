# M6 Installed Extension Local Proof - 2026-06-10 Refresh

## Scope

- `npm run extension:proof:local` is the repeatable local proof for the
  installed Chrome extension path.
- The harness launches Chrome for Testing with a temporary profile, copies the
  extension with the local manifest, opens `/validation/browser-capture.html`,
  invokes the extension command, records extension diagnostics, probes the panel
  iframe for transcript evidence, and writes JSON/screenshot artifacts.
- It does not mutate the user's normal Chrome profile.

## Latest Result

Passing command:

```bash
npm run extension:proof:local
```

Fresh proof written to:

- `docs/superpowers/validation/installed-extension-local-proof.json`
- `docs/superpowers/validation/screenshots/installed-extension-local-fixture.png`

Key report fields from the June 10 run:

```json
{
  "ok": true,
  "proof": {
    "extension_loaded": true,
    "shortcut_attempted": true,
    "shortcut_strategy": "os",
    "shortcut_command_proven": true,
    "debug_service_worker_fallback_used": false,
    "panel_injection_proven": true,
    "tab_capture_stream_id_available": true,
    "live_transcription_proven": true
  }
}
```

The report also records:

- `badgeText: "REC"`
- an `OFFSCREEN_DOCUMENT` context at the extension `offscreen.html`
- `captureState.running: true`
- successful validation audio playback after capture start
- iframe transcript evidence containing `Welcome to the Yentle validation panel`
- panel status `Transcript updating`

## What This Proves

- The unpacked extension loads in a temporary Chrome for Testing profile.
- The installed extension can be invoked by the OS-level `Alt+Shift+Y` command.
- The same-page Yentl panel is injected into the active validation tab.
- Chrome tab capture reaches running state through the offscreen document.
- Captured validation audio reaches the app panel as live transcript text.

## Remaining Release Gate

Before store submission, also prove the normal toolbar/popup click path:

```bash
YENTL_EXTENSION_PROOF_MANUAL_CAPTURE=1 npm run extension:proof:local
```

That mode records `manual_invocation_proven`,
`tab_capture_stream_id_available`, and `live_transcription_proven` separately,
so the release proof can distinguish toolbar invocation, tab-audio capture, and
transcript delivery.

## Known Limits

- Official Google Chrome may ignore `--load-extension` in automation launches;
  the harness prefers local Chrome for Testing.
- Headless Chrome does not reliably expose this installed-extension path, so the
  default proof uses a visible temporary Chrome for Testing profile.
- This run proves the local validation fixture. Store-readiness still needs at
  least one real external media page and repeated latency measurements.
