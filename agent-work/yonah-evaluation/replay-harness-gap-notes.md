# Replay Harness Gap Notes

Prepared: 2026-05-21  
Scope: design notes only. No corpus script edits were made.

## Current Harness Strengths

- `scripts/test-corpus/replay.ts` can replay a selected corpus row through `/api/extract-claims`, optional verification, and `/api/analyze-rhetoric`.
- The context helper slices utterances only through the current index, so replay is closer to live timing than bulk upload analysis.
- `_shared.ts` supports `YENTL_CORPUS_DIR`, so Corpus 2 can be targeted without duplicating core scripts.
- Existing Corpus 1 replay artifacts prove the path can write replay JSON for a small sample.

## Gaps Blocking Meaning-Under-Pressure Claims

1. Replay writes directly to `scores/<id>.replay.json`.
   - This can overwrite existing replay artifacts.
   - For this pack, new experiments need a non-overwriting output directory, run id, or explicit `--out-dir`.

2. Replay does not include production source context.
   - Production extraction/verification can include source context, but replay currently posts only utterance text, timing, rolling context, and recent hashes.
   - Sensitive and time-dependent rows need title, channel, URL, publish date when available, descriptor, and row notes in the replay payload.

3. Replay does not carry row-level evaluation intent.
   - Corpus 2 rows contain `failure_mode`, `ideal_pass_behavior`, and `critical_trap`.
   - These should be copied into replay metadata so human sidecars can compare output against the intended trap.

4. Replay can only start at the beginning of a transcript.
   - `--max-utterances` truncates from the front, but there is no `--start-utterance`, `--start-time`, or `--window`.
   - Several failure modes may occur later than the opening segment, especially repairs, platform context shifts, and quote boundaries.

5. Replay has no transcript-usability gate.
   - High-WER rows such as `c2_rhet_03` should not produce prompt-tuning evidence until a reviewer marks the transcript usable.
   - Collapsed-speaker rows such as `political_010`, `c2_mech_05`, and `c2_platform_03` need attribution warnings before claim judgments.

6. Replay does not output speaker-confidence bands.
   - Deepgram word-level `speaker_confidence` exists in transcripts, but replay collapses utterances to a single `speaker_id`.
   - Human review needs confidence bands such as safe, caution, uncertain, and do-not-attribute.

7. Replay has no stance or quote-boundary field.
   - Extracted claims currently carry topic fields but not whether the text is asserted, denied, quoted, reported, joked, hypothetical, or repaired.
   - Quote-heavy rows cannot be fairly judged without stance metadata.

8. Replay does not emit meta-review events.
   - There is no event type for merged, repaired, superseded, reopened, or context-changed claims.
   - The sidecar asks whether earlier verdicts should change later, but the harness cannot yet capture that as a first-class output.

9. Rhetoric analysis is window-based but not floor-state-aware.
   - `/api/analyze-rhetoric` receives a transcript window, not a structured turn/floor model.
   - Markers cannot reliably distinguish backchannel, interruption, repair, quotation, irony, or goading without extra metadata.

10. Existing replay outputs are not enough evidence.
    - `cable_008` used `verify=none`, so it is useful for marker calibration but not verdict quality.
    - `israel_010` used provisional verification and only the first 12 utterances, so later context and source-aware confirmation remain untested.

## Minimum Harness Changes Before Running This Pack

- Add `--out-dir` or `--run-id` so replay outputs never overwrite `scores/*.replay.json`.
- Add `--start-utterance` and `--utterance-count`, or `--start-time` and `--end-time`.
- Include source metadata and row evaluation metadata in replay result JSON.
- Include transcript stats: utterance count, word count, observed speakers, substantive speakers, average word confidence, average speaker confidence, and warnings.
- Add a sidecar-friendly result schema with claim stance, claim span type, quote boundary, attribution confidence, and meta-review events.
- Add a dry-run metadata mode that emits selected rows and transcript stats without calling model APIs.
- Add a strict no-future-context assertion test for replay and a separate bulk-ingest test proving early segment analysis cannot see later transcript text.

## Safe Use Recommendation

After human row review, run only a narrow, approved slice. Do not run the full corpus ingest or full replay from this lane. The first safe Phase B experiment should write to a new run folder and preserve all existing transcripts, scores, logs, audio, and ground-truth files.
