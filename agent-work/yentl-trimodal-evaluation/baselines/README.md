# Trimodal eval baselines

Each `<date>-summary.json` here is the canonical reference point against which
`scripts/eval/check-baseline.ts` compares new eval runs. The script exits
non-zero if any per-candidate metric regresses past the tolerances declared
in [`lib/eval/compare-summary.ts`](../../../lib/eval/compare-summary.ts).

## How to update

A baseline is a point-in-time snapshot. Update it only when a deliberate
metrics shift is approved (e.g., after landing a fix that improves the
numbers, run the eval, manually inspect the new summary, and copy it over).

```bash
# 1. run the eval with API keys
npx tsx scripts/experiments/yentl-trimodal-eval.ts

# 2. compare new run against current baseline
npx tsx scripts/eval/check-baseline.ts \
  agent-work/yentl-trimodal-evaluation/baselines/<latest>-summary.json \
  agent-work/yentl-trimodal-evaluation/runs/<new>/summary.json

# 3. if intentional improvement, copy the new summary into baselines/
cp agent-work/yentl-trimodal-evaluation/runs/<new>/summary.json \
   agent-work/yentl-trimodal-evaluation/baselines/$(date +%Y-%m-%d)-summary.json
```

## 2026-05-28-summary.json

Captured BEFORE the Phase 1d Task 1 URL caption drift fix (commit `1fa75b2`).
Contains the canonical 467.6-second drift on `da_race_kcra` and the
SRT-vs-audio claim Jaccard of 0% on `hitchens_mcgrath`. Treat as the
"high-water mark of failures we're fighting against" — the next eval run
should drive those numbers down. When that happens, replace this file with
the new run's summary.
