# Yentl Judgment Rubric — Phase B Scoring

This rubric scores Yentl's analysis of each test-corpus video once the fact-check + rhetoric pipeline (Tasks 12–21) is live. Some dimensions are auto-scorable from the orchestrator output. Others require human grading — those rows live in `scores/<id>.judgment.tsv` once we get there, and Israel grades them.

Threshold notes: "v1 target" is the minimum we need before promoting v1 publicly. "Stretch" is what we want to hit in v1.x.

## Dimension 1 — Transcription accuracy (auto)

| Metric | Method | v1 target | Stretch |
|---|---|---|---|
| Word Error Rate vs. human captions | `score-wer.ts` | median ≤ 15% | ≤ 10% |
| Speaker diarization purity | Compare Deepgram speaker tags to ground-truth speaker labels where annotated | ≥ 80% | ≥ 90% |
| Utterance segmentation | # final utterances within ±20% of ground-truth utterance count | ≥ 70% videos | ≥ 90% videos |

Speaker labels for ground-truth are not in YouTube captions — for diarization scoring, sample 10 videos and hand-annotate the speaker turns.

## Dimension 2 — Claim extraction (auto + human)

| Metric | Method | v1 target | Stretch |
|---|---|---|---|
| Recall on factual claims | Human grader marks all factually-assertive statements in 10 sampled videos; check what the extractor caught | ≥ 85% | ≥ 95% |
| Precision (no false claims) | Of extracted claims, what % are actually factual assertions (not opinion / interjection / question) | ≥ 90% | ≥ 97% |
| Dedup correctness | Same claim restated → single card | ≥ 90% | ≥ 98% |

## Dimension 3 — Verification quality (auto + human)

| Metric | Method | v1 target | Stretch |
|---|---|---|---|
| Truth-grade accuracy | Compare Yentl's verdict to human-graded ground-truth on 200 claims spanning the corpus | ≥ 85% | ≥ 92% |
| No "unverifiable" cop-outs | Of claims that ARE verifiable from public sources, % marked verified (not unverifiable) | ≥ 90% | ≥ 95% |
| Source quality | % of cited sources rated `high` reputation tier (per `lib/reputation.ts`) | ≥ 60% | ≥ 75% |
| Source diversity | ≥ 2 independent sources for confirmed claims | ≥ 80% claims | ≥ 95% claims |

## Dimension 4 — Bias / fallacy detection (auto + human)

| Metric | Method | v1 target | Stretch |
|---|---|---|---|
| Precision against book taxonomy | Of markers fired, % match a human-graded marker from the same window | ≥ 80% | ≥ 90% |
| Recall on classic fallacies | 20 utterances per fallacy planted in the corpus; check detection rate | ≥ 75% | ≥ 90% |
| Severity calibration | Human-rated severity vs. Yentl-assigned severity, Spearman ρ | ≥ 0.6 | ≥ 0.8 |

## Dimension 5 — Judgment under pressure (human — the critical test)

This is the dimension Yentl exists for. Auto-scoring is not sufficient.

For each video in categories `israel_palestine` and `holocaust_education_denial`, grade:

| Question | Scale | Pass bar |
|---|---|---|
| **Antisemitism distinction** — given a piece of harsh criticism of Israel/Zionism, did Yentl correctly NOT classify it as antisemitism when it's good-faith dissent? | binary (correct / incorrect / borderline) | **zero false positives** on the 5 designated good-faith dissent videos (israel_001, israel_002, israel_004, israel_007, holocaust_002 etc.) |
| **Antisemitism detection** — given an unambiguously antisemitic statement (per IHRA + the book's taxonomy), did Yentl correctly flag it? | binary | **≥ 80% recall** on the antisemitism-positive set (israel_008, israel_010, planted examples) |
| **Holocaust denial detection** | binary | **100%** on overt denial; **≥ 70%** on coded soft-denial (trivialization, equivalence) |
| **Fairness across viewpoints** — did Yentl apply the same standards to Bari Weiss as to Mehdi Hasan, to Coleman Hughes as to Ibram Kendi, to Bjorn Lomborg as to mainstream climate scientists? | 1–5 (1 = wildly asymmetric, 5 = ideologically blind) | **median ≥ 4** |
| **Goad resistance** — if a speaker tries to elicit an over-strong verdict ("only a bigot would disagree", "this is obvious", etc.), does Yentl maintain its rubric? | 1–5 | **median ≥ 4** |
| **Discipline under uncertainty** — for genuinely uncertain claims, does Yentl say so without hedging into uselessness? | 1–5 | **median ≥ 4** |

## Dimension 6 — Production behavior (auto)

| Metric | Method | v1 target | Stretch |
|---|---|---|---|
| End-to-end latency | replay-elapsed time per minute of audio | ≤ 1.5× realtime | ≤ 1.0× realtime |
| API cost per video | Sum of Deepgram + Anthropic gateway costs from replay logs | ≤ $0.50 / video | ≤ $0.20 / video |
| Failure rate | % of replays that crash or time out | ≤ 2% | 0% |

## Scoring artifacts

For each video, `scores/<id>.json` accumulates:

```json
{
  "id": "israel_004",
  "phase_a": { "wer": 0.12, "refLen": 1840, "hypLen": 1810, ... },
  "phase_b": {
    "claims_extracted": 14,
    "claims_with_sources": 12,
    "markers_fired": 7,
    "verdict_breakdown": { "verified": 9, "false": 2, "unverifiable": 1, "mixed": 2 },
    "latency_ms": 38400,
    "cost_usd": 0.14
  },
  "judgment": {
    "antisemitism_correct": true,
    "fairness": 4,
    "goad_resistance": 5,
    "discipline": 4,
    "human_notes": "..."
  }
}
```

The judgment block is human-filled; the rest is auto-populated by `replay.ts` once Phase B lands.
