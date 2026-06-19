# 2026-06-11 M6 Local Popup Live Transcript Proof

## Scope

Closed the controlled installed-extension speech-to-transcript gap. The previous
proofs showed same-page panel injection, tabCapture state, page text, and external
popup capture, but the local proof accepted the first tiny transcript fragment
too easily. This pass fixed the playback verifier and required known fixture
vocabulary before the proof could pass.

## Product/Proof Change

- Fixed `startValidationMediaPlayback` in
  `scripts/validation/prove-installed-extension-local.mjs`; the proof no longer
  references an undefined `video` variable when pausing non-target media.
- The playback helper now surfaces `Runtime.evaluate` exceptions instead of
  silently returning an empty playback object.
- Added `YENTL_EXTENSION_PROOF_REQUIRED_TRANSCRIPT`, allowing the proof to wait
  for known transcript vocabulary before reporting success.
- The report now fails when a required transcript phrase is configured but not
  observed.
- Added regression coverage in `tests/installed-extension-proof-script.test.ts`.

## Proof

Command:

```bash
YENTL_EXTENSION_PROOF_MANUAL_CAPTURE=1 \
YENTL_EXTENSION_PROOF_POPUP_AUTOMATION=1 \
YENTL_EXTENSION_PROOF_TRANSCRIPT_WAIT_MS=45000 \
YENTL_EXTENSION_PROOF_REQUIRED_TRANSCRIPT='operating budget increased' \
node scripts/validation/prove-installed-extension-local.mjs
```

Result:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T21:47:24.923Z",
  "required_transcript_phrase": "operating budget increased",
  "proof": {
    "popup_click_proven": true,
    "manual_invocation_proven": true,
    "panel_injection_proven": true,
    "tab_capture_stream_id_available": true,
    "page_text_proven": true,
    "live_transcription_proven": true,
    "required_transcript_proven": true
  }
}
```

The panel rendered six transcript lines, including:

- `The city library budget increased by 12% this year.`
- `The operating budget increased.`

It also began downstream analysis inside the extension panel:

- `CLAIMS: Caution`
- `2 claims incomplete`
- `EVIDENCE: Checking`

Fresh latency:

```json
{
  "total_ms": 20843,
  "capture_invocation_ms": 1153,
  "panel_injection_ms": 19690,
  "first_transcript_wait_ms": 12022,
  "first_transcript_event_ms": 12022,
  "manual_capture_wait_ms": 7055
}
```

Artifacts:

- `docs/superpowers/validation/installed-extension-local-proof.json`
- `docs/superpowers/validation/screenshots/installed-extension-local-fixture.png`
- `docs/superpowers/validation/extension-latency-samples.json`

## Boundary

This proves controlled local tab-audio transcription through the installed
extension popup path. External real-media transcription is still a separate
launch smoke target because the Wikimedia proof currently proves tabCapture and
page text, but not an external live transcript line.
