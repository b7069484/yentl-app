# Yentl Committee Report - Analytics, Big Data, Telemetry, and Growth Intelligence

    **Committee member:** Hadassah Keren  
    **Remit:** Privacy-aware analytics, data science, product metrics, evaluation telemetry, growth instrumentation, experiment design.  
    **Why this name:** Hadassah is Esther's Hebrew name and suggests careful presentation under pressure; Keren means ray or fund. This seat turns evidence into responsible decision-making.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `lib/db/schema.ts`, `lib/client/session-storage.ts`, `lib/client/orchestrator.ts`, `scripts/test-corpus/report.ts`, `scripts/test-corpus-2/report.ts`, `test-corpus/report/corpus-report.json`, `test-corpus-2/report/corpus-2-plan.json`, `package.json`.
- Search for telemetry/analytics terms found no active PostHog/Segment/Plausible/Sentry-style product telemetry.

## Current State

Yentl has evaluation data, not product analytics. The corpora generate useful static reports; the app stores sessions locally; DB schema exists but does not yet appear to power event capture or usage analytics.

This is an advantage if handled well: Yentl can be privacy-first. But it also means the team lacks core launch instrumentation.

## Strengths

The corpus reporting mindset is strong. Corpus 1 and Corpus 2 already count transcripts, audio, WER, confidence, categories, review-required rows, and failure-mode dimensions. This can become an evaluation warehouse.

The DB schema includes usage counters for audio seconds and AI requests. That can become the metering layer for pricing/cost controls.

## Severe Gaps

No product event schema: source selected, consent granted, ingest started, ingest failed, transcript produced, claim detected, verification completed, marker produced, export/save, report, correction, delete, user feedback.

No cost ledger: model route, tokens, web searches, Deepgram minutes, Blob bytes, failures, retries, quotas.

No evaluation event chain: claim-level trace, source set, model version, prompt version, taxonomy version, verdict history, human judgment, correction outcome.

No privacy model for analytics: what is stored, hashed, redacted, sampled, retained, deleted, and exportable.

No growth funnel: landing view, source-start, successful session, save/export, return, extension install, weekly use.

## Recommendations

Create four data layers:

1. Operational ledger: cost, latency, route status, quotas, failure reasons.
2. Product events: funnel and UX behavior without sensitive content by default.
3. Evaluation warehouse: corpus/session claim traces with opt-in or fixture data.
4. Feedback/human review: corrections, disputes, source quality labels, sidecars.

Instrument privacy-preserving events first. Store source kind, status, counts, durations, and hashed session IDs; avoid storing raw transcript/claims unless explicit user opt-in or corpus fixture.

Add model/prompt/version metadata to every claim and marker. Yentl cannot improve safely if it cannot answer which prompt/model produced a bad output.

Add dashboards:

- Launch safety: error rate, API spend, quota denials, upload deletion failures.
- Product funnel: source choice to successful session to save/export.
- Evaluation: WER, claim recall/precision, verdict agreement, marker precision, sensitive-topic failures.
- Growth: retention, activated users, extension install success, support issues.

## Metrics

Activation: user completes a session with transcript + at least one meaningful insight or export.  
Reliability: ingestion success by source type; p50/p95 latency; first final transcript latency.  
Trust: report/correction rate, evidence-open rate, source-card inspection, `Yentl was wrong` feedback.  
Learning: practice accuracy, calibration, follow-up source inspection.  
Cost: cost/session, cost/audio hour, cost/confirmed claim, quota exhaustion.

## Launch Blockers

No public beta without operational cost/error telemetry. No paid plan without usage ledger. No public accuracy claims without versioned eval traces.
