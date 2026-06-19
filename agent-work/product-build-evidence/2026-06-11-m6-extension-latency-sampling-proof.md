# 2026-06-11 M6 Extension Latency Sampling Proof

## Scope

Closed the missing repeatable latency sampler for the Chrome extension proof
lane. Previously, installed-extension proofs recorded one `latency_ms` object per
run, but there was no script that could collect repeated samples and write an
aggregate artifact.

## Product Change

- Added `scripts/validation/sample-extension-latency.mjs`.
- Added `npm run extension:latency:sample`.
- Added focused tests in `tests/extension-latency-sample-script.test.ts`.
- The sampler supports:
  - `YENTL_EXTENSION_LATENCY_FROM_EXISTING=1` to summarize existing local and
    external proof artifacts without launching Chrome.
  - `YENTL_EXTENSION_LATENCY_RUNS=<n>` to run repeated fresh local extension
    proof passes.
  - `YENTL_EXTENSION_LATENCY_OUTPUT=<path>` for temp/test output paths.
  - Headless temp-profile proof by default for live sampling unless explicitly
    overridden.

## Proof

Existing-artifact baseline:

```bash
YENTL_EXTENSION_LATENCY_FROM_EXISTING=1 npm run extension:latency:sample
```

Result:

- `ok: true`
- `sample_count: 2`
- sources: installed local proof + installed external proof
- invocation paths: keyboard shortcut + popup
- output: `docs/superpowers/validation/extension-latency-samples.json`

Fresh repeated local run:

```bash
YENTL_EXTENSION_LATENCY_RUNS=2 YENTL_EXTENSION_PROOF_HEADLESS=1 npm run extension:latency:sample
```

Result:

```json
{
  "ok": true,
  "source": "live-proof-runs",
  "requested_runs": 2,
  "sample_count": 2,
  "invocation_paths": ["service-worker-fallback"],
  "latency_ms": {
    "total_ms": { "count": 2, "min": 15932, "max": 16679, "avg": 16306 },
    "panel_injection_ms": { "count": 2, "min": 15932, "max": 16679, "avg": 16306 },
    "first_transcript_wait_ms": { "count": 2, "min": 14025, "max": 14028, "avg": 14027 }
  }
}
```

Focused regression:

```bash
npx vitest run tests/extension-latency-sample-script.test.ts tests/extension-package-check.test.ts tests/installed-extension-proof-script.test.ts
```

Result:

- 3 test files passed
- 12 tests passed

## Boundaries

The fresh repeated run used headless temp-profile mode, so it proves repeatable
panel/page-text timing through the service-worker fallback. It does not replace
a visible/manual user-gesture tabCapture latency sample. That visible run remains
useful before launch.
