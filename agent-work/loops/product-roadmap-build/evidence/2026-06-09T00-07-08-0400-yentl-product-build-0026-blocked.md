# YENTL-PRODUCT-BUILD-0026 c2_platform_03 preflight blocker

Status: blocked_needs_context
Timestamp: 2026-06-09T00:07:08-04:00
Lane: product-roadmap-build

## Row Preflighted

- ID: `YENTL-PRODUCT-BUILD-0026`
- Intended slice: add the bounded non-review hard-window sidecar for `c2_platform_03_many_speakers`.
- Manifest row: `test-corpus-2/speaker-attribution-windows.csv` lists source `c2_platform_03`, `0-90s`, failure family `platform_native_speaker_merge`, expected risk `platform_context`, review required `false`.
- Manifest note: "Platform-native many-speaker target where current source may be mismatched or collapsed."

## Transcript Evidence

Transcript: `test-corpus-2/transcripts/c2_platform_03.json`

- Full transcript direct word count: 1969.
- Full transcript provider speakers: `0` only.
- Full transcript time range: `0.56s` to `664.66s`.
- Target `0-90s` direct word count: 268.
- Target `0-90s` provider speakers: `0` only.
- Target `0-90s` time range: `0.56s` to `90.58s`.
- Target `0-90s` mean ASR confidence: about `0.949`.
- Target `0-90s` mean speaker confidence: about `0.586`.

Window transcript summary:

- `0.56-41.95s`, speaker `0`: single-speaker explanation of Twitter Spaces as a voice chat feature.
- `47.31-90.58s`, speaker `0`: single-speaker channel/tutorial intro about hosting Twitter Spaces and phone-battery/headphone logistics.

## Decision

Blocked/context-needed.

The intended row is a platform-native many-speaker/speaker-merge target, but the available transcript evidence is a single-speaker tutorial with only provider speaker `0`. Adding a sidecar would either:

- incorrectly relabel a single-speaker tutorial as a many-speaker platform-native failure, or
- create a clean single-speaker label that does not satisfy the row's intended failure family.

No sidecar was added, and scorer report outputs were not regenerated for this row.

## Required Next Action

Pick one:

- provide a corrected `c2_platform_03` window/audio/caption source with multiple speakers,
- replace this row with a better platform-native many-speaker sample,
- or explicitly approve reclassifying this sample as a single-speaker platform-context control.

Until then, do not fabricate `c2_platform_03_many_speakers` labels in unattended product-roadmap builds.
