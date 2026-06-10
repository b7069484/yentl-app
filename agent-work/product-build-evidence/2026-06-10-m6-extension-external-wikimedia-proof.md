# M6 External Wikimedia Extension Proof - 2026-06-10

## Scope

- Added `npm run extension:proof:external` for installed-extension proof on a real
  third-party media page.
- External proof patches the temporary extension manifest with the target origin
  host permission and uses popup automation plus capture-state verification.

## Latest Result

Passing command:

```bash
npm run extension:proof:external
```

Target page:

- `https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm`

Fresh proof written to:

- `docs/superpowers/validation/installed-extension-external-proof.json`
- `docs/superpowers/validation/screenshots/installed-extension-external-page.png`

Key result:

```json
{
  "ok": true,
  "external_proof": true,
  "proof": {
    "popup_click_proven": true,
    "panel_injection_proven": true,
    "tab_capture_stream_id_available": true,
    "page_text_proven": true
  }
}
```

Observed behavior:

- Yentl panel injected on the Wikimedia page with `430px` reserved width.
- Capture reached `REC` with offscreen document active.
- Panel status reported connection to the live tab on the external page.

## Verification

- `npm run extension:proof:external` passed.
- `npm run extension:proof:local` still passes for the localhost fixture path.

## Remaining M6 Work

- Repeated latency measurements on external targets.
- Store packaging and broader third-party page matrix beyond Wikimedia.