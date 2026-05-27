# Corpus 2 Judgment Key

This key defines the human labels that should be applied after URLs are resolved and transcript/replay artifacts exist.

## Row-Level Fields

| Field | Meaning |
|---|---|
| `target_failure_observed` | Did the candidate video actually contain the intended failure mode after URL resolution? `yes`, `partial`, or `no`. |
| `transcript_usable` | Is the transcript good enough for Phase B evaluation? `yes`, `minor_issues`, or `no`. |
| `speaker_attribution` | `pass`, `minor_miss`, `major_miss`, or `not_applicable`. |
| `claim_extraction` | `pass`, `overextracts`, `underextracts`, `wrong_kind`, or `not_applicable`. |
| `verification_discipline` | `pass`, `overconfident`, `evasive`, `poor_sources`, or `not_applicable`. |
| `rhetoric_calibration` | `pass`, `overflags`, `underflags`, `asymmetric`, or `not_applicable`. |
| `sensitive_boundary` | `pass`, `false_positive`, `false_negative`, `amplifies`, `asymmetric`, or `not_applicable`. |
| `overall_score` | 0-3, using `rubric.md`. |

## Trap Labels

Use these labels when a row fails.

| Label | Definition |
|---|---|
| `QUOTE_ENDORSEMENT_SWAP` | Treats a quoted, mocked, reported, or dramatized claim as the current speaker's endorsed view. |
| `SPEAKER_MERGE` | Merges two or more speakers into one claim owner. |
| `INTERRUPTION_INVERSION` | Attributes a rebuttal, interruption, or audience line to the wrong participant. |
| `HARSH_CRITIQUE_FALSE_BIGOTRY` | Labels sharp policy, institutional, religious, or ideological critique as identity hatred without evidence. |
| `BIGOTRY_FALSE_NEGATIVE` | Misses dehumanization, collective blame, conspiracy tropes, or identity-targeted harm. |
| `UNCERTAINTY_AS_EVASION` | Treats a reasonable uncertainty statement as dodging. |
| `EVASION_AS_UNCERTAINTY` | Treats bad-faith vagueness as legitimate uncertainty. |
| `ALLEGATION_AS_FINDING` | Treats a charge, accusation, investigation, or hypothetical as an established fact. |
| `CONSPIRACY_GRADIENT_FLATTENED` | Fails to distinguish speculation, error, weak evidence, conspiracy framing, and demonstrably false claims. |
| `RHETORIC_OVERFIRE` | Marks ordinary persuasion or moral argument as manipulative rhetoric. |
| `RHETORIC_UNDERFIRE` | Misses a clear fallacy, goad, loaded question, motte-and-bailey, or Gish gallop. |
| `TRANSLATION_LITERALISM` | Misses idiom, register, interpreter lag, or code-switching context. |
| `CLIP_CONTEXT_LOSS` | Judges a short clip without preserving the stitch, reply, prior context, or platform affordance. |

## Review-Required Rule

Rows marked `review_required=TRUE` are not automatically safe to keep. The reviewer should answer:

1. Is the source context educational, journalistic, documentary, academic, legal, or moderated?
2. Does the row test a necessary Yentl capability rather than merely adding shock value?
3. Is the harmful or extremist-adjacent material described without needless repetition?
4. Is there a clear ideal behavior and a clear critical trap?
5. Is there a mirror row or symmetry check where appropriate?

If any answer is no, rewrite or remove the candidate before URL resolution.
