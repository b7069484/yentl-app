# Yentl Committee Report - Gamification, Gaming, and Game-Based Learning

    **Committee member:** Noam Gil  
    **Remit:** Game-based learning, media-literacy practice loops, motivation, assessment, classroom activity design.  
    **Why this name:** Noam means pleasantness; Gil means joy. This seat asks how Yentl can teach critical thinking through satisfying practice without trivializing serious claims.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `lib/taxonomy/*`, `components/session/marker-detail.tsx`, `components/session/marker-learn-more.tsx`, `components/session/claim-learn-more.tsx`, `components/session/visual-evidence-dashboard.tsx`, `public/visual-evidence/markers/*`, `test-corpus/rubric.md`, `test-corpus-2/judgment-key.md`.
- External research: Bad News/inoculation research shows gamified inoculation can reduce susceptibility to misinformation techniques; PubMed summary: https://pubmed.ncbi.nlm.nih.gov/31934684/. Harvard Misinformation Review notes online games can confer resistance against misinformation strategies, not just examples: https://misinforeview.hks.harvard.edu/article/global-vaccination-badnews/.

## Strategic Frame

Yentl should not become a points-and-badges toy layered onto a serious tool. Its game-based learning opportunity is deeper: make users practice noticing claims, evidence gaps, rhetoric moves, uncertainty, and context repair.

The best model is not `score the speaker`; it is `train the user`. Yentl can become a replayable media-literacy gym.

## Strengths

The taxonomy is rich: 123 bias/fallacy/rhetoric entries, marker icons, learn-more pages, and source-linked markers. The corpus already supplies realistic practice material. The Watch view can anchor practice to real moments.

Yentl's mission fits inoculation/prebunking: teach manipulation techniques before the user encounters stronger real-world versions.

## Severe Gaps

There is no explicit learning progression. Marker pages explain terms, but the app does not yet build skill over time.

There is no practice mode, quiz mode, classroom mode, challenge mode, or reflection loop. Users consume Yentl's judgments instead of learning to predict and evaluate them.

There is no assessment model for media literacy outcomes: no pre/post tasks, no skill map, no confidence calibration, no false-positive/false-negative reflection.

Gamification could easily become harmful if it rewards dunking, ideological scorekeeping, or treating serious identity/history claims as a game.

## Recommendations

Add `Practice Replay` mode using corpus clips. The user sees a short transcript/video moment, predicts: checkable claim? source needed? marker present? speaker asserted or quoted? Then Yentl reveals its analysis and evidence.

Add skill tracks:

1. Claim spotting.
2. Source quality.
3. Rhetoric and fallacy recognition.
4. Quote vs endorsement.
5. Uncertainty discipline.
6. Sensitive-topic boundary judgment.
7. Crosstalk speaker attribution.

Use feedback loops, not leaderboards. Reward calibrated uncertainty and correction: `You changed your mind when new context arrived` should be a success.

Add teacher dashboards only after the student loop works: assign clips, review reasoning, export class discussion prompts, and hide sensitive clips by default.

Add a `Why Yentl might be wrong` step in every game loop to prevent automation bias.

## Launch Blockers

Do not gamify public controversy or sensitive identity claims until editorial review and classroom safeguards exist. Do not add points for `catching lies`; add progress for evidence reasoning and calibration.

## Metrics

Pre/post misinformation discernment, source-quality ranking accuracy, claim/opinion distinction, quote/assertion distinction, marker precision by user, confidence calibration, retention after one week, and whether users overtrust or challenge Yentl appropriately.
