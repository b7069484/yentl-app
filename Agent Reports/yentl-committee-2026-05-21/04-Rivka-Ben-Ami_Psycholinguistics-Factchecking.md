# Yentl Committee Report - Psycholinguistics, Discourse, Fact-Checking, and Sensitive Topics

    **Committee member:** Rivka Ben-Ami  
    **Remit:** Psycholinguistics, discourse analysis, rhetoric taxonomy, evidence standards, sourcing/news judgment, sensitive-topic handling.  
    **Why this name:** Rivka signals discernment and continuity; Ben-Ami means of my people. This seat protects meaning across fragmented speech and communities affected by identity/history claims.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- Prompts: `lib/prompts/extract-claims.ts`, `lib/prompts/analyze-rhetoric.ts`, `lib/prompts/verify-provisional.ts`, `lib/prompts/verify-confirmed.ts`.
- Pipeline: `lib/client/orchestrator.ts`, `app/api/verify-confirmed/citations.ts`, `docs/engagement-gate.md`, `docs/dpia.md`.
- Corpora: `test-corpus/README.md`, `test-corpus/rubric.md`, `test-corpus-2/README.md`, `test-corpus-2/rubric.md`, `test-corpus-2/judgment-key.md`.
- Prior study, security, and synthesis reports.
- External standard: IFCN Code of Principles, which emphasizes nonpartisan and transparent fact-checking as a guard against distrust and pollution of public understanding: https://ifcncodeofprinciples.poynter.org/.

## Strengths

Yentl has a serious test foundation. Corpus 1 explicitly stresses solo monologues, interviews, cable debates, podcasts, academic Q&A, political debates, Israel/Palestine discourse, Holocaust education/denial, culture-war topics, and misinformation-prone topics. Corpus 2 is even more targeted: crosstalk, quotation/irony, identity boundaries, historical memory, medical/science uncertainty, legal procedure, misinformation gradients, rhetoric, cross-cultural register, and platform-native discourse.

The extractor has absorbed meaningful linguistic lessons: entity anchoring, source metadata for disambiguation, reported-speech handling, and primary/secondary topic tagging. The confirmed verifier now stitches citations from tool outputs rather than trusting model-invented source metadata. The rhetoric prompt uses a listener-detectability severity scale, which is a better starting point than moral outrage.

## Severe Gaps

Sensitive-topic policy is documented but not enforced. `docs/engagement-gate.md` calls itself policy-only, while the orchestrator sends claims straight to provisional and confirmed verification. That means private-person allegations, hate traps, defamation traps, and extremist-adjacent claims can still become verdict cards.

Meaning over time is under-modeled. Current claim objects lack stance, quote boundary, repair status, time anchor, claim cluster, verdict history, and speaker-confidence field. Yentl is therefore fragile when speakers quote falsehoods to refute them, start a thought and repair it, use irony, paraphrase opponents, or get interrupted.

Fact-check labels need editorial discipline. `UNVERIFIABLE + score 50` is not acceptable as a user-facing judgment. `PARTIAL`, `MISLEADING`, and `OMISSION` overlap unless the product defines them with examples and source requirements.

Evaluation truth is not yet decisive. Corpus 1 has only a few replay slices, while Corpus 2 lacks Phase B replay artifacts. WER does not prove quote/refutation handling, repairs, irony, crosstalk attribution, or sensitive-boundary judgment.

## Recommendations

Implement `EngagementDecision` before verification: `ENGAGE`, `ENGAGE_CAUTIOUSLY`, `DECLINE_FRIVOLOUS`, `REFUSE_INAPPROPRIATE`; fail closed on parse/model errors; store non-amplifying refusal states.

Extend claim extraction with stance, span type, time anchor, source layer, speaker confidence, and `too_fragmented_to_judge`. Add claim clusters and verdict history so Yentl can merge, repair, supersede, reopen, or downgrade earlier cards.

Split rhetoric detection from moral judgment. Marker outputs need confidence, floor state, stance effect, pattern count, calibration level, and an internal `not a fallacy because...` trace. This protects harsh-but-fair critique from overflagging.

Use an evidence ladder aligned with fact-checking practice: primary source, public record, official data, reputable wire/news, peer-reviewed source, expert consensus, contested expert field, low-quality/social source. Show the user what tier each source occupies and why.

## Launch Blockers

No public launch for sensitive discourse until engagement gating, hard consent, source-quality enforcement, claim-cluster/meta-review, Corpus 2 replay, and human sidecars exist.

## Evaluation Ideas

Build a ten-row meaning-under-pressure pack: `cable_008`, `political_010`, `israel_010`, `holocaust_010`, `c2_mech_01`, `c2_mech_05`, `c2_quote_09`, `c2_ident_10`, `c2_rhet_03`, `c2_platform_03`. Score speaker attribution, claim completeness, quote/stance correctness, verdict correctness, marker usefulness, over-pettiness, missed context, and whether later context should change earlier judgments.
