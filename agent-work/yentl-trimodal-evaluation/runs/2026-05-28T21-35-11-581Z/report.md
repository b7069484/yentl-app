# Yentl Tri-Modal Evaluation Run

Run: `2026-05-28T21-35-11-581Z`
Generated: 2026-05-28T22:31:13.305Z

## Scope

- Candidates tested: 8
- Modes analyzed: SRT/text baseline, production-like audio transcription, current YouTube URL caption ingest.
- Diagnostic-only extra: diarized audio transcription for speaker-capability comparison.
- Analysis sampling: up to 8 merged utterances per video/mode, evenly spread across the source.
- Provisional verification: up to 2 claims per video/mode.
- Confirmed/web verification: up to 1 SRT-baseline claims per video.

## Transcript Reliability

| Candidate | Captions | URL vs SRT WER | URL Drift | Audio Prod vs SRT WER | Audio Prod Speakers | Audio Diag Speakers | Warnings |
|---|---:|---:|---:|---:|---:|---:|---|
| tarantino_channel4 | manual:en-GB | 23.2% | 0.6s | 23.1% | 1 | 2 | URL captions diverged from SRT baseline (WER 23.2%).<br>Production-like audio transcription collapsed speakers to one speaker.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |
| bondi_epstein_cnn | manual:en | 0.0% | -0.6s | 6.4% | 1 | 7 | Production-like audio transcription collapsed speakers to one speaker.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |
| vance_walz_debate | manual:en | 0.0% | 0.0s | 6.4% | 1 | 3 | Production-like audio transcription collapsed speakers to one speaker.<br>SRT and audio modes extracted substantially different claim sets.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |
| da_race_kcra | manual:en | 0.0% | 467.6s | 87.6% | 1 | 6 | URL-caption timing drift is large (467.6s vs video duration).<br>Production-like audio transcription collapsed speakers to one speaker.<br>Production-like audio transcript has high drift from SRT (WER 87.6%).<br>SRT and audio modes extracted substantially different claim sets.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |
| vaccine_delay_rciscience | manual:en-CA | 8.8% | 1.8s | 6.9% | 1 | 3 | Production-like audio transcription collapsed speakers to one speaker.<br>SRT and YouTube URL modes extracted substantially different claim sets.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |
| maajid_mehdi_bbc | auto:en | 0.0% | 2.0s | 20.6% | 1 | 4 | SRT baseline uses auto captions, so WER is not human-ground-truth.<br>Production-like audio transcription collapsed speakers to one speaker.<br>SRT and audio modes extracted substantially different claim sets.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |
| hitchens_mcgrath | auto:en | 0.0% | -2.9s | 3.9% | 1 | 1 | SRT baseline uses auto captions, so WER is not human-ground-truth.<br>Production-like audio transcription collapsed speakers to one speaker.<br>SRT and audio modes extracted substantially different claim sets.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |
| trump_biden_factcheck | auto:en | 0.0% | 1.8s | 7.2% | 1 | 8 | SRT baseline uses auto captions, so WER is not human-ground-truth.<br>Production-like audio transcription collapsed speakers to one speaker.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |

## Analysis Consistency

| Candidate | Mode | Utterances | Claims | Provisional Labels | Markers | Marker Topline | Errors |
|---|---|---:|---:|---|---:|---|---:|
| tarantino_channel4 | srt | 8/61 | 0 | none | 4 | False Analogy:2, Loaded Language:1, Red Herring:1 | 0 | |
| tarantino_channel4 | youtube_url | 8/26 | 0 | none | 7 | False Analogy:2, Circular Reasoning:1, Loaded Language:1, Red Herring:2, False Urgency:1 | 0 | |
| tarantino_channel4 | audio_production | 8/37 | 0 | none | 5 | False Analogy:2, Loaded Language:1, Proof by Assertion:1, Special Pleading:1 | 0 | |
| bondi_epstein_cnn | srt | 8/33 | 10 | TRUE:2, unverified:8 | 7 | Loaded Language:3, Pejorative Framing:1, Appeal to Authority:1, Loaded Question:1, Confirmation Bias:1 | 0 | |
| bondi_epstein_cnn | youtube_url | 8/33 | 9 | TRUE:1, MOSTLY_TRUE:1, unverified:7 | 7 | Loaded Language:2, Pejorative Framing:2, Repetition for Emphasis:1, Appeal to Authority:1, Loaded Question:1 | 0 | |
| bondi_epstein_cnn | audio_production | 8/39 | 11 | TRUE:1, PARTIAL:1, unverified:9 | 7 | Ad Hominem:1, Loaded Language:3, Repetition for Emphasis:1, Pejorative Framing:1, Red Herring:1 | 0 | |
| vance_walz_debate | srt | 8/83 | 5 | MISLEADING:1, MOSTLY_TRUE:1, unverified:3 | 8 | Loaded Language:2, Single Cause Fallacy:1, Pejorative Framing:1, Appeal to Fear:1, Absolutism:1, Straw Man:1 | 1 | |
| vance_walz_debate | youtube_url | 8/83 | 4 | TRUE:1, unverified:3 | 8 | Loaded Language:2, Glittering Generalities:1, Single Cause Fallacy:2, Appeal to Fear:1, Repetition for Emphasis:1, Straw Man:1 | 1 | |
| vance_walz_debate | audio_production | 8/36 | 7 | MISLEADING:1, TRUE:1, unverified:5 | 7 | Loaded Language:2, Single Cause Fallacy:2, Cherry Picking:1, Repetition for Emphasis:1, Straw Man:1 | 0 | |
| da_race_kcra | srt | 8/34 | 3 | UNVERIFIABLE:2, unverified:1 | 4 | Loaded Question:1, Appeal to Authority:1, Glittering Generalities:1, Dunning-Kruger/Overconfidence Effect:1 | 0 | |
| da_race_kcra | youtube_url | 8/33 | 4 | UNVERIFIABLE:2, unverified:2 | 3 | Absolutism:1, Glittering Generalities:1, Appeal to Authority:1 | 0 | |
| da_race_kcra | audio_production | 8/20 | 13 | UNVERIFIABLE:2, unverified:11 | 3 | Loaded Question:1, Glittering Generalities:1, Absolutism:1 | 0 | |
| vaccine_delay_rciscience | srt | 8/33 | 6 | MOSTLY_TRUE:2, unverified:4 | 5 | Hedge Words:2, Repetition for Emphasis:1, Framing Effect:1, Euphemism:1 | 0 | |
| vaccine_delay_rciscience | youtube_url | 8/19 | 6 | MOSTLY_TRUE:1, TRUE:1, unverified:4 | 5 | Hedge Words:2, Repetition for Emphasis:1, Vagueness / Hand-waving:1, Loaded Language:1 | 0 | |
| vaccine_delay_rciscience | audio_production | 8/27 | 8 | TRUE:1, MOSTLY_TRUE:1, unverified:6 | 5 | Hedge Words:2, Repetition for Emphasis:1, Loaded Language:1, Optimism Bias:1 | 0 | |
| maajid_mehdi_bbc | srt | 8/34 | 13 | UNVERIFIABLE:2, unverified:11 | 7 | Ad Hominem:1, Red Herring:1, Loaded Language:2, Plurium Interrogationum:1, Anecdotal Fallacy:1, Hasty Generalization:1 | 1 | |
| maajid_mehdi_bbc | youtube_url | 8/34 | 13 | UNVERIFIABLE:1, MOSTLY_TRUE:1, unverified:11 | 7 | Ad Hominem:1, Red Herring:1, Loaded Language:2, Plurium Interrogationum:1, Anecdotal Fallacy:1, Hasty Generalization:1 | 0 | |
| maajid_mehdi_bbc | audio_production | 8/34 | 4 | UNVERIFIABLE:1, MOSTLY_TRUE:1, unverified:2 | 8 | Glittering Generalities:1, Red Herring:2, Straw Man:1, Loaded Language:2, Repetition for Emphasis:1, Anecdotal Fallacy:1 | 0 | |
| hitchens_mcgrath | srt | 8/21 | 9 | TRUE:1, UNVERIFIABLE:1, unverified:7 | 7 | Red Herring:1, Tu Quoque:1, Loaded Language:1, Anecdotal Fallacy:2, No True Scotsman:1, Glittering Generalities:1 | 0 | |
| hitchens_mcgrath | youtube_url | 8/21 | 10 | TRUE:1, UNVERIFIABLE:1, unverified:8 | 6 | Loaded Language:1, False Cause:1, Anecdotal Fallacy:1, Appeal to Emotion:1, No True Scotsman:1, Cherry Picking:1 | 0 | |
| hitchens_mcgrath | audio_production | 8/39 | 1 | TRUE:1 | 6 | Cherry Picking:2, Loaded Language:1, Hedge Words:1, Anecdotal Fallacy:1, No True Scotsman:1 | 0 | |
| trump_biden_factcheck | srt | 8/30 | 19 | FALSE:1, TRUE:1, unverified:17 | 4 | Tu Quoque:1, Loaded Language:1, Appeal to Pity:1, Absolutism:1 | 0 | |
| trump_biden_factcheck | youtube_url | 8/30 | 15 | FALSE:1, TRUE:1, unverified:13 | 4 | Loaded Language:1, Absolutism:1, Appeal to Emotion:1, Red Herring:1 | 0 | |
| trump_biden_factcheck | audio_production | 8/38 | 16 | FALSE:1, UNVERIFIABLE:1, unverified:14 | 3 | Absolutism:1, Red Herring:1, Loaded Language:1 | 0 | |

## Cross-Mode Discrepancies

| Candidate | Claim Jaccard SRT/YT | Claim Jaccard SRT/Audio | Marker Overlap SRT/YT | Marker Overlap SRT/Audio | Verdict Disagreements | Revision Events |
|---|---:|---:|---:|---:|---:|---:|
| tarantino_channel4 | 100.0% | 100.0% | 60.0% | 40.0% | 0 | 0 | |
| bondi_epstein_cnn | 80.0% | 36.4% | 66.7% | 25.0% | 0 | 0 | |
| vance_walz_debate | 40.0% | 14.3% | 44.4% | 50.0% | 0 | 0 | |
| da_race_kcra | 50.0% | 7.7% | 40.0% | 40.0% | 0 | 0 | |
| vaccine_delay_rciscience | 33.3% | 62.5% | 33.3% | 33.3% | 2 | 0 | |
| maajid_mehdi_bbc | 69.2% | 15.4% | 100.0% | 33.3% | 1 | 0 | |
| hitchens_mcgrath | 80.0% | 0.0% | 33.3% | 37.5% | 0 | 0 | |
| trump_biden_factcheck | 63.2% | 47.4% | 33.3% | 40.0% | 0 | 0 | |

## Confirmed Fact-Check Samples

### tarantino_channel4

- No confirmed samples returned.

### bondi_epstein_cnn
- TRUE (98.00, sources 0): Pam Bondi serves as U.S. Attorney General.

### vance_walz_debate

- No confirmed samples returned.

### da_race_kcra
- MOSTLY_TRUE (80.00, sources 8): The race for District Attorney (Sacramento County, per KCRA 3 coverage) is being contested for the first time in 20 years.

### vaccine_delay_rciscience
- TRUE (92.00, sources 0): Canada decided to delay the second dose of COVID-19 vaccines by up to four months.

### maajid_mehdi_bbc

- No confirmed samples returned.

### hitchens_mcgrath
- TRUE (97.00, sources 0): Michael Shermer is president of the Skeptics Society.

### trump_biden_factcheck
- PARTIAL (42.00, sources 16): The Trump administration has pulled the United States out of almost every international organization.

## Artifact Paths

- Summary JSON: `/Users/israelbitton/Live FactCheck/agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/summary.json`
- Per-candidate assets and analysis: `/Users/israelbitton/Live FactCheck/agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/candidates`

## Interpretation Notes

- Treat high URL-vs-SRT WER or timing drift as an ingest-layer problem before blaming claim reasoning.
- Treat production audio speaker collapse as current product behavior unless a diarization consent path is enabled.
- The current analysis outputs do not expose first-class later-context revision events, so revision score is recorded as zero rather than inferred.