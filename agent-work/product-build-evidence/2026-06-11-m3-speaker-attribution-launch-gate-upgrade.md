# M3 Speaker Attribution Launch Gate Upgrade

Date: 2026-06-11

## Product Change

- Replaced stale or mismatched hard-window attribution targets:
  - `political_010_collapsed_panel` -> `cable_005_nato_panel`
  - `c2_mech_05_interruption_repair` -> `c2_mech_03_clip_host_attribution`
  - `c2_platform_03_many_speakers` -> `c2_platform_07_clip_stack`
  - `c2_quote_09_harmful_quote` -> corrected later quote window `c2_quote_09_brown_quote_boundary`
- Added reviewed sidecars for:
  - `cable_005_nato_panel`
  - `israel_010_sensitive_boundary`
  - `holocaust_010_historical_framing`
  - `c2_mech_03_clip_host_attribution`
  - `c2_quote_09_brown_quote_boundary`
  - `c2_ident_10_identity_boundary`
  - `c2_platform_07_clip_stack`
- Tightened quote-vs-endorsement scoring so unsafe questions or hedges are not miscounted as quote/endorsement failures.
- Added a zero-tolerance launch check for real quote-vs-endorsement errors.
- Added per-window speaker-purity and claim-owner accuracy floors so one bad hard case cannot hide behind the mean.

## Current Proof

`npm run analysis:proof:speaker-attribution`

- `ok: true`
- `launch_ready: true`
- windows: 16
- scored: 16
- missing labels: 0
- missing transcripts: 0
- mean speaker purity: 0.9967236675094789
- mean claim-owner accuracy: 1
- unsafe attribution recall: 1
- quote-vs-endorsement errors: 0
- per-window speaker-purity failures: 0
- per-window claim-owner failures: 0

## Caveat

Five rows remain review-required by domain sensitivity. They now have sidecars and launch proof coverage, but future human review would still be valuable before public claims about sensitive identity or historical-memory handling.
