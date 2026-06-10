# Yentl Tri-Modal Evaluation Run

Run: `smoke-2026-05-28`
Generated: 2026-05-28T21:34:51.676Z

## Scope

- Candidates tested: 1
- Modes analyzed: SRT/text baseline, production-like audio transcription, current YouTube URL caption ingest.
- Diagnostic-only extra: diarized audio transcription for speaker-capability comparison.
- Analysis sampling: up to 2 merged utterances per video/mode, evenly spread across the source.
- Provisional verification: up to 0 claims per video/mode.
- Confirmed/web verification: up to 0 SRT-baseline claims per video.

## Transcript Reliability

| Candidate | Captions | URL vs SRT WER | URL Drift | Audio Prod vs SRT WER | Audio Prod Speakers | Audio Diag Speakers | Warnings |
|---|---:|---:|---:|---:|---:|---:|---|
| tarantino_channel4 | manual:en-GB | 23.2% | 0.6s | 23.0% | 1 | 2 | URL captions diverged from SRT baseline (WER 23.2%).<br>Production-like audio transcription collapsed speakers to one speaker.<br>No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior. | |

## Analysis Consistency

| Candidate | Mode | Utterances | Claims | Provisional Labels | Markers | Marker Topline | Errors |
|---|---|---:|---:|---|---:|---|---:|
| tarantino_channel4 | srt | 2/61 | 0 | none | 0 | none | 3 | |
| tarantino_channel4 | youtube_url | 2/26 | 0 | none | 0 | none | 3 | |
| tarantino_channel4 | audio_production | 2/37 | 0 | none | 0 | none | 3 | |

## Cross-Mode Discrepancies

| Candidate | Claim Jaccard SRT/YT | Claim Jaccard SRT/Audio | Marker Overlap SRT/YT | Marker Overlap SRT/Audio | Verdict Disagreements | Revision Events |
|---|---:|---:|---:|---:|---:|---:|
| tarantino_channel4 | 100.0% | 100.0% | 100.0% | 100.0% | 0 | 0 | |

## Confirmed Fact-Check Samples

### tarantino_channel4

- No confirmed samples returned.

## Artifact Paths

- Summary JSON: `/Users/israelbitton/Live FactCheck/agent-work/yentl-trimodal-evaluation/runs/smoke-2026-05-28/summary.json`
- Per-candidate assets and analysis: `/Users/israelbitton/Live FactCheck/agent-work/yentl-trimodal-evaluation/runs/smoke-2026-05-28/candidates`

## Interpretation Notes

- Treat high URL-vs-SRT WER or timing drift as an ingest-layer problem before blaming claim reasoning.
- Treat production audio speaker collapse as current product behavior unless a diarization consent path is enabled.
- The current analysis outputs do not expose first-class later-context revision events, so revision score is recorded as zero rather than inferred.