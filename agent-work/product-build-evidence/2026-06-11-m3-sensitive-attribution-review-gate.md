# M3/M7 Sensitive Attribution Review Gate

## Purpose

Turn the sensitive speaker-attribution launch blocker into a concrete review gate keyed to the current speaker-attribution proof. The scorer can prove attribution metrics, but public launch claims still need human/editorial approval for sensitive windows.

## Product Change

- Added `scripts/validation/prove-sensitive-attribution-review.mjs`.
- Added `npm run analysis:proof:sensitive-review`.
- Added `tests/sensitive-attribution-review-proof-script.test.ts`.
- Wired `docs/superpowers/validation/sensitive-attribution-review-proof.json` into `scripts/validation/prove-release-readiness.mjs`.
- Updated release readiness so the human-review blocker points to the review artifact, not only the raw scorer output.

## Review Contract

The review canary requires a manifest at `agent-work/validation/sensitive-attribution-reviews.json` unless `YENTL_ATTRIBUTION_REVIEW_MANIFEST` points elsewhere.

Each required review must include:

- `window_id`
- `status: "approved_for_public_claims"`
- `public_claims_allowed: true`
- `reviewer`
- `reviewed_at`
- `notes` of at least 20 characters

Optional integrity fields `source_id` and `failure_family` are checked against the current speaker-attribution proof when present. The default freshness window is 30 days.

## Current Result

`npm run analysis:proof:sensitive-review` generated `docs/superpowers/validation/sensitive-attribution-review-proof.json` and failed as expected because no review manifest exists yet.

Current review status:

- `ok`: `false`
- `manifest_status`: `missing_manifest`
- `public_claims_review_status`: `review_required_before_public_claims`
- `required_window_count`: `5`
- `reviewed_window_count`: `0`

Required windows:

- `israel_010_sensitive_boundary`
- `holocaust_010_historical_framing`
- `c2_quote_09_brown_quote_boundary`
- `c2_ident_10_identity_boundary`
- `c2_platform_07_clip_stack`

## Release Readiness Impact

`npm run release:readiness` now reports the sensitive-attribution blocker with concrete evidence:

- Blocker: `human-review-sensitive-attribution`
- Status: `missing_manifest`
- Evidence: `docs/superpowers/validation/sensitive-attribution-review-proof.json`
- Count: `5`
- Reviewed count: `0`
- Next action: create the review manifest, run `npm run analysis:proof:sensitive-review`, and approve every required window before public launch claims.

## Verification

- `node --check scripts/validation/prove-sensitive-attribution-review.mjs`
- `node --check scripts/validation/prove-release-readiness.mjs`
- `npx vitest run tests/sensitive-attribution-review-proof-script.test.ts tests/speaker-attribution-proof-script.test.ts tests/release-readiness-proof-script.test.ts`
- `npm run analysis:proof:sensitive-review` failed intentionally with `missing_manifest` and wrote the proof artifact.
- `npm run release:readiness` passed report generation with `launch_ready: false`.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:run` passed: 175 files, 1827 tests.
- `npm run build:automation` passed: 42/42 static pages.
- `git diff --check`
