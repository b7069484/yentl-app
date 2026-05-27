# Yentl Committee Report - Sourcing, News, Fact-Checking Methodology, and Evidence Quality

    **Committee member:** Ezra Meir  
    **Remit:** News sourcing, evidence retrieval, fact-checking standards, ClaimReview integrations, source reputation, editorial audit trails.  
    **Why this name:** Ezra means help; Meir means one who illuminates. This seat helps Yentl illuminate claims with sources instead of model confidence alone.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `lib/reputation.ts`, `app/api/verify-confirmed/route.ts`, `app/api/verify-confirmed/citations.ts`, `lib/prompts/verify-confirmed.ts`, `lib/prompts/verify-provisional.ts`, `app/methodology/page.tsx`, `test-corpus/rubric.md`.
- External references: Google FactCheck Claim Search API lets users query Fact Check Explorer results and receive latest updates on a query; it requires an API key: https://developers.google.com/fact-check/tools/api. IFCN Code of Principles emphasizes nonpartisan and transparent fact-checking: https://ifcncodeofprinciples.poynter.org/.

## Strengths

Yentl's confirmed verifier is on the right track: it uses web search, merges citations from tool results, extracts domains, and classifies reputation tier. The provisional verifier is explicitly forbidden from citing sources, which prevents fake citations in the fast pass.

The rubric already defines source quality and source diversity targets: percentage of cited sources rated high and at least two independent sources for confirmed claims.

## Severe Gaps

`lib/reputation.ts` is too small and static for serious use. A handful of high/low domains cannot cover public claims across law, medicine, history, science, local government, international conflict, court records, academic research, and breaking news.

There is no explicit evidence hierarchy in the UI or prompt layer. Reuters and AP are not equivalent to court filings, official statistics, peer-reviewed studies, direct transcripts, or primary documents.

There is no integration with existing fact-check databases. Google Fact Check Tools, ClaimReview markup, or a local cache of known fact checks could prevent redundant work and add provenance.

Breaking news is dangerous. Web search can retrieve early, conflicting, or low-quality reports. Yentl needs time sensitivity and `developing story` logic.

The system does not yet track source independence. Two articles may both derive from the same wire, press release, or study.

## Recommendations

Create an evidence ladder:

1. Primary record: law, court filing, official transcript/video, original dataset.
2. Authoritative institution: government agency, public health body, official statistics, university/research institution.
3. Peer-reviewed or expert consensus source.
4. High-quality independent journalism/wire.
5. Secondary analysis.
6. Social/platform source.
7. Low-reputation or unknown source.

Add source roles: proves, contradicts, contextualizes, repeats, quotes, alleges, or background only. Show these roles in source cards.

Add ClaimReview/Fact Check lookup. Google FactCheck Claim Search can be used to discover existing fact checks; it should not replace primary evidence, but it can seed the evidence set.

Add time-policy labels: stable fact, changing/developing story, contested expert question, historical claim, legal allegation/proceeding, personal/private allegation.

Add source independence detection: same wire copy, syndicated content, same press release, same underlying dataset, same institutional source.

Add domain reputation as a data file with provenance, not hard-coded in one small module. Include user-visible limitations.

## Launch Blockers

Do not claim `scores every claim against the open web` until source quality, independence, and developing-story safeguards exist. Do not show `TRUE/FALSE` for legal, medical, identity, or breaking-news claims without careful evidence gating.

## Tests

Golden tests for source tiering, duplicated syndicated sources, primary-vs-secondary priority, current/developing story handling, fact-check database lookup, legal allegation caution, and source-card explanations.
