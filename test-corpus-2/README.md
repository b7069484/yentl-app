# Yentl Corpus 2 - Failure-Mode Planning Corpus

Corpus 2 is the next 100-video review set for hard conversation understanding. Unlike Corpus 1, which was organized mainly by discourse topic, this corpus is organized by the Yentl failure each row is meant to expose.

## Current Status

- Corpus 2 has 100 rows, 10 categories, and 10 rows per category.
- All 100 rows are URL-resolved, downloaded to local audio, and transcribed with Deepgram.
- Human captions were available for 14 rows and WER has been scored for those rows.
- Median WER for caption-backed rows is 8.90%, under the current 15% acceptance threshold.
- Phase B replay has not been run yet; it remains the next model-calling gate.
- Browser planning report: `/corpus-2-report/index.html`

## Structure

```text
test-corpus-2/
├── videos.csv          # 100 candidate rows, 10 categories x 10 videos
├── rubric.md           # scoring dimensions and pass bars
├── judgment-key.md     # human-review labels and failure-mode codes
├── report/             # generated planning report copy
└── README.md
```

Generated public report:

```text
public/corpus-2-report/index.html
public/corpus-2-report/corpus-2-plan.json
```

## Candidate Schema

The planning CSV includes the required Corpus 2 fields:

- `id`
- `category`
- `failure_mode`
- `descriptor`
- `search_query`
- `duration_min_target`
- `speaker_count_target`
- `overlap`
- `sensitivity_level`
- `quotation_risk`
- `identity_or_harm_risk`
- `review_required`
- `ideal_pass_behavior`
- `critical_trap`
- `notes`

It also includes Corpus 1 compatible URL-resolution columns:

- `url`
- `video_id`
- `title_resolved`
- `channel_resolved`
- `duration_resolved_s`
- `clip_start_s`
- `clip_end_s`
- `verified`

## Categories

| Category | Count | Primary stress |
|---|---:|---|
| `chaotic_conversation_mechanics` | 10 | Diarization, interruption repair, speaker attribution |
| `quoting_irony_reported_speech` | 10 | Quotation vs endorsement, irony, satire, reported allegations |
| `identity_bigotry_boundaries` | 10 | Harsh critique vs bigotry, symmetric standards across identities |
| `historical_memory_denial` | 10 | Denial, trivialization, memory disputes, uncertainty vs minimization |
| `medical_science_uncertainty` | 10 | Risk communication, uncertainty, evidence quality, harm avoidance |
| `legal_institutional_procedure` | 10 | Allegation vs finding, procedure vs merit, careful institutional language |
| `misinformation_conspiracy_gradients` | 10 | Speculation, evidence gradients, conspiracy cues, source provenance |
| `rhetorical_manipulation_persuasion` | 10 | Fallacies, goading, framing, persuasion without factual hallucination |
| `cross_cultural_translation_register` | 10 | Translation, idiom, register, accent, interpreter lag |
| `platform_native_discourse` | 10 | Clips, stitches, streams, community notes, platform-native context loss |

## Commands

Planning report:

```bash
npm run corpus2:report
```

Later, after human review and before any paid ingestion, resolve a small slice:

```bash
npm run corpus2:resolve -- --id=c2_mech_01
npm run corpus2:resolve -- --category=chaotic_conversation_mechanics --limit=3
```

After resolution is approved, the existing Corpus 1 tooling can target Corpus 2 through `YENTL_CORPUS_DIR=test-corpus-2`:

```bash
npm run corpus2:ingest -- --id=c2_mech_01
npm run corpus2:captions -- --id=c2_mech_01
npm run corpus2:score-wer
npm run corpus2:replay -- --id=c2_mech_01 --verify=none
```

## Review Gate

Before Phase B replay/model evaluation:

1. Confirm that the 10 categories are the right next frontier.
2. Remove or rewrite any row whose educational value does not justify its sensitivity.
3. Confirm mirror-pair intent where notes mention a mirror test.
4. Confirm that review-required rows have enough editorial value to keep.
5. Check high-WER rows and any row marked review-required before using the corpus for model judgment.

## Full Artifact Results - 2026-05-21

Full Corpus 2 command scope:

```bash
npm run corpus2:resolve -- --search-limit=25
npm run corpus2:ingest
npm run corpus2:captions
npm run corpus2:score-wer
npm run corpus2:report
```

Full artifact status:

| Artifact | Count | Notes |
|---|---:|---|
| Rows | 100 | 10 categories x 10 failure-mode rows. |
| Resolved URLs | 100 | Weak automatic picks were repaired before final ingest. |
| Cached audio | 100 | Stored under `test-corpus-2/audio/`. |
| Deepgram transcripts | 100 | Stored under `test-corpus-2/transcripts/`. |
| Human caption files | 14 | Auto-captions are excluded by design. |
| WER scores | 14 | Median WER is 8.90%; mean WER is 18.94%; p90 WER is 69.48%. |
| Review-required rows | 47 | Sensitive-topic rows require human review before replay conclusions. |

## Pilot 1 Results - 2026-05-21

Pilot command scope:

```bash
npm run corpus2:ingest -- --ids=c2_mech_05,c2_quote_08,c2_quote_09,c2_ident_01,c2_hist_02,c2_science_01,c2_legal_01,c2_misinfo_01,c2_xcult_01,c2_platform_08
npm run corpus2:captions -- --ids=c2_mech_05,c2_quote_08,c2_quote_09,c2_ident_01,c2_hist_02,c2_science_01,c2_legal_01,c2_misinfo_01,c2_xcult_01,c2_platform_08
npm run corpus2:score-wer -- --ids=c2_mech_05,c2_quote_08,c2_quote_09,c2_ident_01,c2_hist_02,c2_science_01,c2_legal_01,c2_misinfo_01,c2_xcult_01,c2_platform_08
```

Pilot artifact status:

| Artifact | Count | Notes |
|---|---:|---|
| Resolved URLs | 10 | The first automatic pass had weak picks; obvious bad matches were cleared before accepting the pilot. |
| Cached audio | 10 | Stored under `test-corpus-2/audio/`. |
| Deepgram transcripts | 10 | Stored under `test-corpus-2/transcripts/`. |
| Human caption files | 1 | Only `c2_quote_09` exposed human captions. |
| WER scores | 1 | `c2_quote_09` scored 8.90% WER. |

Phase B replay remains the next model-calling gate. Run it only after the full transcript set and review-required rows are reviewed.
