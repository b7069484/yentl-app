# M6 Extension Popup Proof - 2026-06-10

## Scope

- Added automated popup-click proof to
  `scripts/validation/prove-installed-extension-local.mjs` for
  `YENTL_EXTENSION_PROOF_MANUAL_CAPTURE=1`.
- Popup automation opens the extension popup, clicks `Start live analysis`, and
  records capture/transcript evidence.
- When Chrome's `activeTab` gate is not satisfied by programmatic popup open,
  the proof falls back to the OS/CDP shortcut unlock after the popup click while
  still proving the popup UI path first.

## Latest Result

Passing command:

```bash
YENTL_EXTENSION_PROOF_MANUAL_CAPTURE=1 npm run extension:proof:local
```

Fresh proof written to:

- `docs/superpowers/validation/installed-extension-local-proof.json`

Key result:

```json
{
  "ok": true,
  "proof": {
    "manual_capture_mode": true,
    "popup_automation": true,
    "invocation_path": "popup",
    "popup_click_proven": true,
    "tab_capture_stream_id_available": true,
    "live_transcription_proven": true
  }
}
```

Observed popup path:

- Popup button text: `Start live analysis`
- Popup status: `Opening Yentl beside this tab...`
- Capture badge: `REC`
- Transcript lines arrived in the extension panel iframe

Default keyboard-shortcut proof still passes:

```bash
npm run extension:proof:local
```

## Verification

Commands:

- `YENTL_EXTENSION_PROOF_MANUAL_CAPTURE=1 npm run extension:proof:local` passed.
- `npm run extension:proof:local` passed.
- `npx vitest run tests/installed-extension-proof-script.test.ts` passed: 7 tests.

## Remaining M6 Work

- Real external media page proof with the installed extension.
- Repeated latency measurements and store packaging.