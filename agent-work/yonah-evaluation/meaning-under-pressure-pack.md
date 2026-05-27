# Yonah Meaning Under Pressure Evaluation Pack

Workspace: `/Users/israelbitton/Live FactCheck`  
Prepared: 2026-05-21  
Agent lane: Yonah - Meaning Under Pressure Evaluation  
Scope: data/design only. No corpus ingest, score rewrite, replay run, UI/API edit, or corpus artifact overwrite.

## Directive Check

Checked the `Directive Board` workbook row and the CSV mirror. Yonah is marked `ready` with the directive: start from the launch brief, create only this deliverable folder, and report through the inbox/status row. The roadblock note says: no full corpus ingest; human review required later.

## Pack Objective

This 10-row pack is meant to test whether Yentl preserves meaning when ordinary claim-card logic is under pressure from crosstalk, speaker collapse, quotation, sensitive identity boundaries, historical framing, loaded questions, platform-native context, repairs, and later clarifications.

This pack should not be used to make prompt-tuning claims until the human sidecars are filled in. The current automated artifacts show strong transcript coverage, but not yet enough evidence of speaker attribution, stance, quote handling, verdict quality, or marker calibration under pressure.

## Corpus Snapshot Used

Corpus 1 report:

- 100 videos, 100 transcripts, 17 WER-scored rows, 3 replay slices.
- Median WER: 8.94 percent.
- Median speaker confidence: 69.39 percent.
- The highest-pressure cable/panel rows mostly lack manual-caption WER.

Corpus 2 report:

- 100 rows, 100 resolved URLs, 100 audio caches, 100 transcripts.
- 14 WER-scored rows, median WER: 8.90 percent.
- 47 review-required rows, 42 high-sensitivity rows, 22 high-quotation-risk rows, 45 high identity/harm-risk rows.
- No Phase B replay artifacts yet.

## Selected Rows

| Row | Corpus | Category / failure mode | Why it belongs in this pack |
|---|---|---|---|
| `cable_008` | Corpus 1 | cable news debate | Existing replay slice exists and already produced 1 claim plus 6 markers from a heavy-overlap panel. It is the best immediate check for whether markers become petty or overread crosstalk. |
| `political_010` | Corpus 1 | political debate | Expected 4 speakers but transcript report observed 1 substantive speaker. It is a clean collapsed-panel test before any claim semantics can be trusted. |
| `israel_010` | Corpus 1 | Israel/Palestine discourse | Review-required, WER-scored at 11.26 percent, and existing provisional replay produced 14 claims plus 4 markers around a real coded-trope controversy. It tests antisemitism distinction, time anchoring, quote/stance, and later context. |
| `holocaust_010` | Corpus 1 | Holocaust education/denial | Review-required, expected 4 speakers but observed 2 substantive speakers. It tests dense historical framing, legitimate uncertainty, and whether the system avoids flattening historiography into denial or evasion. |
| `c2_mech_01` | Corpus 2 | crosstalk turn attribution | Heavy-overlap public-discussion row. Target is 6 speakers, transcript observed 4. It tests whether claims are tied to the person who completed the thought and whether shouted or clipped material is marked uncertain. |
| `c2_mech_05` | Corpus 2 | heated interruption repair | Heavy-overlap debate row where target is 4 speakers but transcript observed 1. It is a deliberate stress test for interruption, restatement, incomplete fragments, and repair-aware deduping. |
| `c2_quote_09` | Corpus 2 | civil rights harmful quote | High-sensitivity, high-quotation-risk educational row with manual captions and WER 8.90 percent. It tests quote vs endorsement and whether harmful language is handled without needless repetition. |
| `c2_ident_10` | Corpus 2 | Zionism/Jewish identity definition | High-sensitivity, high-quotation-risk identity-boundary row with manual captions and WER 2.95 percent. It tests distinctions among Zionism, Israel, Jewish identity, policy critique, and antisemitism. |
| `c2_rhet_03` | Corpus 2 | loaded question trap | Loaded-premise interview row with an extreme WER outlier at 87.33 percent. It should gate transcript usability before rhetoric claims and test whether Yentl fact-checks the premise instead of only the answer. |
| `c2_platform_03` | Corpus 2 | Twitter Spaces crosstalk | Platform-native row targeting 8 speakers, but transcript observed 1 with 59.07 percent average speaker confidence. It tests speaker merge, platform-source mismatch, and whether the row should be replaced before use. |

## Row-Level Review Priorities

### `cable_008`

- Current artifact: transcript present, replay present, verify mode `none`, 12 of 115 utterances replayed, 1 claim, 6 markers, 0 replay errors.
- Human check: decide whether the six markers are useful or over-petty, especially the subtle fallacy labels.
- Attribution risk: expected 5 speakers, observed 3 substantive speakers.
- Tuning gate: do not tune marker prompts from this row until the reviewer marks which markers materially affected interpretation.

### `political_010`

- Current artifact: transcript present, no replay. Report status is `watch`.
- Human check: inspect whether the resolved video/source is really the intended Munk debate slice and whether diarization collapsed a multi-person debate into one speaker.
- Attribution risk: expected 4 speakers, observed 1.
- Tuning gate: any verdict/claim result from this row is invalid unless speaker attribution is first repaired or explicitly marked uncertain.

### `israel_010`

- Current artifact: transcript present, manual-caption WER 11.26 percent, replay present with provisional verification, 14 claims, 4 markers, 0 replay errors.
- Human check: evaluate the distinction between criticism of Israel or lobbying and antisemitic money-trope framing. Check whether the existing provisional verdicts handled date-sensitive claims fairly.
- Attribution risk: expected 3 speakers, observed 9 speakers but only 3 substantive speakers.
- Tuning gate: reviewer must grade quote/stance correctness, sensitive-boundary correctness, and whether any earlier verdict should change after later context.

### `holocaust_010`

- Current artifact: transcript present, no replay, review-required.
- Human check: separate public historical claims, historiographic interpretations, survivor/memory framing, and denial/minimization risks.
- Attribution risk: expected 4 speakers, observed 2 substantive speakers, dominant speaker share 95.69 percent.
- Tuning gate: do not tune denial/trivialization prompts from this row without source-context review and transcript usability review.

### `c2_mech_01`

- Current artifact: transcript present, no manual caption score, no Phase B replay.
- Human check: mark whether the candidate actually contains town-hall/public-meeting crosstalk after URL resolution. The resolved title/channel may be more media commentary than original public meeting.
- Attribution risk: target 6 speakers, observed 4 substantive speakers.
- Critical trap: treating a shouted audience objection or played clip as the moderator's claim.

### `c2_mech_05`

- Current artifact: transcript present, no manual caption score, no Phase B replay.
- Human check: inspect interruption and restatement windows by timestamp before using it as a repair test.
- Attribution risk: target 4 speakers, observed 1 speaker despite heavy-overlap intent.
- Critical trap: extracting a half-spoken interruption fragment as a completed standalone claim.

### `c2_quote_09`

- Current artifact: transcript present, manual captions present, WER 8.90 percent, no Phase B replay.
- Human check: identify quoted harmful language boundaries and whether the educator is presenting, analyzing, mocking, or endorsing the content.
- Attribution risk: low overlap, but high quote/stance risk.
- Critical trap: flagging the educator as bigoted or repeating harmful phrasing beyond what review requires.

### `c2_ident_10`

- Current artifact: transcript present, manual captions present, WER 2.95 percent, no Phase B replay.
- Human check: verify definitions and stance around Zionism, Israel, Jewish identity, anti-Zionism, and antisemitism.
- Attribution risk: target 4 speakers, observed 2 substantive speakers.
- Critical trap: flattening the distinction into either blanket antisemitism or blanket innocence.

### `c2_rhet_03`

- Current artifact: transcript present, manual captions present, WER 87.33 percent.
- Human check: determine whether the WER is caused by source mismatch, caption mismatch, clip mismatch, or unusable transcript. This row must fail transcript usability unless a usable window is hand-selected.
- Attribution risk: target 2 speakers, observed 6 substantive speakers, which conflicts with the candidate design.
- Critical trap: accepting a loaded question premise as established fact.

### `c2_platform_03`

- Current artifact: transcript present, no manual caption score, no Phase B replay.
- Human check: decide whether the resolved YouTube source is a real Twitter Spaces many-speaker audio-room proxy or merely an instructional video about hosting spaces.
- Attribution risk: target 8 speakers, observed 1 speaker, average speaker confidence 59.07 percent.
- Critical trap: speaker merge across anonymous voices, or using the wrong source type for the intended failure mode.

## Human Judgment Sidecar Protocol

For each row, the reviewer should fill `judgment-sidecar-template.csv` before any prompt-tuning claim is accepted. Use the 0-3 scale from Corpus 2 where relevant:

- `3`: clean pass.
- `2`: usable with caution.
- `1`: weak.
- `0`: falls into the critical trap.

Required checks:

- Speaker attribution: correct owner or explicit uncertainty.
- Claim completeness: no fragmented half-claims judged as standalone facts.
- Quote/stance correctness: quoted, reported, satirical, ironic, or educational speech is not treated as endorsement.
- Verdict correctness: labels match evidence, time anchors, source context, and later corrections.
- Marker usefulness: marker explains a material reasoning move, not just vivid wording.
- Over-pettiness: strong but fair argument is protected from needless fallacy scoring.
- Missed broader context: source layer, date, speaker role, mirror row, and prior/later turns are considered.
- Earlier verdict change: later repair, clarification, or missing date/entity should reopen or supersede earlier cards.
- Crosstalk/repair/irony risk: explicitly mark when output is unsafe because of overlap, repair, quotation, irony, or platform clipping.

## Before Prompt Tuning Claims

These must be human-reviewed first:

1. Confirm each selected URL/source is the intended educational test case, especially `c2_mech_01`, `c2_rhet_03`, and `c2_platform_03`.
2. Mark transcript usability and speaker-attribution safety for every row.
3. Hand-review all review-required sensitive rows: `israel_010`, `holocaust_010`, `c2_quote_09`, and `c2_ident_10`.
4. Grade existing replay outputs for `cable_008` and `israel_010`; do not treat them as pass/fail evidence until the sidecars are complete.
5. Decide whether high-WER or collapsed-speaker rows need hand-selected windows, replacement sources, or manual transcript snippets.
6. Record any later-context repair where an earlier verdict should be reopened, merged, downgraded, or superseded.
7. Require sidecar evidence for any claim that a new prompt improved fairness, antisemitism distinction, marker calibration, or crosstalk handling.

## Recommended Next Slice

Do not run the full corpus ingest. After human review of this pack, run a narrow Phase B replay only for approved rows and write new outputs to a non-overwriting experiment folder or add an explicit replay output flag first.

Minimum safe first replay set:

- `cable_008` for marker calibration against existing replay evidence.
- `israel_010` for existing provisional replay plus sensitive-boundary review.
- `c2_quote_09` for quote/stance handling with usable WER.
- `c2_ident_10` for identity-boundary definitions with usable WER.
- One of `c2_mech_01`, `c2_mech_05`, or `c2_platform_03` only after source/diarization review chooses the best mechanics row.

## Scope Compliance

Stayed within the Yonah write scope:

- Wrote only under `agent-work/yonah-evaluation/`.
- Wrote a status copy under `agent-work/reporting-inbox/`.
- Did not edit corpus transcripts, scores, logs, audio, ground-truth files, app UI/API files, or corpus scripts.
- Did not run full corpus ingest or Phase B replay.

Yonah means dove; the name fits this lane because the evaluation needs calm judgment when the discourse itself is noisy and high-pressure.
