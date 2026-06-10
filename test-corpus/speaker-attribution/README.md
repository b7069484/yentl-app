# Speaker Attribution Hard Windows

This folder is the hand-label layer for the Yentl hard-window attribution pack.

The manifests live at:

- `test-corpus/speaker-attribution-windows.csv`
- `test-corpus-2/speaker-attribution-windows.csv`

Each manifest row points to a sidecar under `speaker-attribution/sidecars/`.
Missing sidecars are allowed during the labeling phase. The scorer must report
them as missing labels, not silently pass them.

## Sidecar Schema

```json
{
  "schema_version": 1,
  "window_id": "solo_003_smoke_single_speaker",
  "corpus_id": "test-corpus",
  "source_id": "solo_003",
  "start_s": 30,
  "end_s": 60,
  "reviewer": "human-or-agent",
  "review_date": "2026-06-08",
  "transcript_usable": true,
  "labels": {
    "reference_text": "Optional hand transcript for WER on this window.",
    "turns": [
      {
        "id": "turn-1",
        "start_s": 30,
        "end_s": 60,
        "speaker_id": "speaker_a",
        "expected_provider_speaker_id": 0,
        "overlap_class": "none"
      }
    ],
    "claims": [
      {
        "id": "claim-1",
        "start_s": 30,
        "end_s": 60,
        "owner_speaker_id": "speaker_a",
        "expected_provider_speaker_id": 0,
        "stance": "asserted",
        "unsafe_attribution": false
      }
    ],
    "markers": [
      {
        "id": "marker-1",
        "start_s": 30,
        "end_s": 60,
        "owner_speaker_id": "speaker_a",
        "expected_provider_speaker_id": 0
      }
    ],
    "unsafe_attribution_spans": [
      {
        "id": "unsafe-1",
        "start_s": 42,
        "end_s": 47,
        "reason": "parallel_claim"
      }
    ]
  }
}
```

`expected_provider_speaker_id` is intentionally explicit. The first scorer
compares human reference spans with the current provider transcript, so it needs
the provider speaker number the reviewer believes should own the audible span.
Later turn-builder or product predictions can add separate predicted owner
fields without changing the label contract.
