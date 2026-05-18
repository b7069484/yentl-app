# Yentl Test Corpus — 100 YouTube Videos

This directory is the **acceptance spec** for the Yentl fact-check + rhetoric pipeline. It runs the same Deepgram engine the production app uses, against 100 curated YouTube videos representing the gamut of contemporary public discourse.

## Structure

```
test-corpus/
├── videos.csv               # the curated 100 (URL, duration, # speakers, category, overlap, notes)
├── transcripts/<id>.json    # Deepgram batch outputs (diarized, with utterances)
├── ground-truth/<id>.vtt    # human-authored YouTube captions when available
├── scores/<id>.json         # WER (Phase A) + judgment scores (Phase B)
├── audio/<id>.opus          # cached audio (gitignored; large)
├── logs/                    # ingest logs (gitignored)
├── rubric.md                # judgment criteria for Phase B
└── README.md                # this file
```

## How it works

**Phase A — transcription accuracy (now):**

1. `scripts/test-corpus/ingest-all.ts` reads `videos.csv`, and for each row:
   - Downloads audio via `yt-dlp` → `audio/<id>.opus`
   - Sends to Deepgram pre-recorded `/v1/listen` (`nova-3`, `diarize`, `utterances`, `punctuate`, `smart_format`)
   - Saves transcript → `transcripts/<id>.json`
2. `scripts/test-corpus/fetch-ground-truth.ts` pulls human-authored captions when YouTube has them → `ground-truth/<id>.vtt`
3. `scripts/test-corpus/score-wer.ts` computes Word Error Rate of Deepgram vs. ground-truth → `scores/<id>.json`

**Phase B — fact-check + rhetoric quality (lands as Tasks 12–21 ship):**

4. `scripts/test-corpus/replay.ts` feeds each transcript's final utterances into the production claim orchestrator (extract-claims → verify-provisional + verify-confirmed → analyze-rhetoric), as if the words were spoken live.
5. The judgment rubric (`rubric.md`) is applied — automated where possible, human-graded for the contested-topic videos.

## Running

```bash
# one video, end-to-end (smoke test)
npm run corpus:ingest -- --id=hardtalk_001

# full batch (resumes from where it left off; skips cached transcripts)
npm run corpus:ingest -- --all

# WER scoring (requires ground-truth/ to be populated)
npm run corpus:score-wer

# Phase B (future, once Tasks 12-21 are merged)
npm run corpus:replay -- --all
```

## Curation philosophy

The 100 videos span 10 categories chosen to stress different parts of the pipeline:

| Category | Count | What it stresses |
|---|---|---|
| Solo monologues | 10 | Baseline transcription accuracy, claim density |
| 1-on-1 interviews | 10 | 2-speaker diarization, professional pacing |
| Cable news debates | 10 | 3–4 speakers, overlapping speech, hot tempers |
| Long-form podcasts | 10 | Endurance, casual speech, mixed audio quality |
| Academic lectures + Q&A | 10 | Dense factual content, citations, technical vocab |
| Political debates (US/UK) | 10 | Moderated turn-taking, point-scoring rhetoric |
| **Israel/Palestine discourse** | 10 | **Antisemitism-vs-dissent distinction** ← the critical test |
| **Holocaust education vs. denial** | 10 | **Coded language, historical claim verification** |
| Contentious cultural topics | 10 | Race, gender, immigration — bias detection |
| Misinformation-prone topics | 10 | Vaccines, elections, climate — source quality |

The two **bolded** categories require the user's editorial review before the corpus is final. They live in `videos.csv` rows where `review_required = TRUE`.

## What "passing" looks like

- **Phase A:** Median WER ≤ 15% across all 100 videos (Deepgram nova-3 typical performance on broadcast English).
- **Phase B (future):**
  - Claim extraction: ≥85% of factually-asserted statements caught
  - Verification: ≥90% truth-grade agreement on a human-graded sample of 200 claims
  - Antisemitism distinction: zero false positives against the good-faith dissent set
  - Rhetoric: ≥80% bias/fallacy precision against the book taxonomy

These thresholds are starting points — refine after the first run.
