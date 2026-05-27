# Yentl Committee Report - AI Architecture, Verification Pipeline, Data Science, and Evals

    **Committee member:** Rivka Batya Halevi  
    **Remit:** AI architecture, LLM prompts, verification pipeline, corpus evaluation, analytics, data science, and big-data readiness.  
    **Why this name:** Rivka means discernment, Batya evokes pulling signal from noisy water, and Halevi suggests service between systems and judgment.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `lib/client/orchestrator.ts`, `lib/client/ingest-orchestrator.ts`, `lib/prompts/extract-claims.ts`, `lib/prompts/analyze-rhetoric.ts`, `app/api/verify-confirmed/route.ts`, `app/api/verify-confirmed/citations.ts`, `lib/server/deepgram-batch.ts`, `lib/db/schema.ts`.
- `test-corpus/report/corpus-report.json`, `test-corpus-2/report/corpus-2-plan.json`, `test-corpus/rubric.md`.
- Prior study, codebase, security, and synthesis reports.
- Current pricing context: Anthropic lists Claude Opus 4.7 at $5/MTok input and $25/MTok output, Sonnet 4.6 at $3/$15, and Haiku 4.5 at $1/$5; web search adds additional usage-based charges: https://platform.claude.com/docs/en/about-claude/pricing.

## Strengths

Yentl has a real AI product spine: Deepgram transcription, structured claim extraction, provisional verification, web-search-backed confirmed verification, rhetoric marking, synthesis, Devil's Advocate, corpus reports, and replay scaffolding.

The prompt layer is schema-driven. The extractor includes entity anchoring and reported-speech handling. The verifier uses web search and merges citations from tool/source blocks, reducing hallucinated source risk. The rhetoric prompt is constrained to a taxonomy and quotes transcript excerpts.

The ASR corpus foundation is credible. Corpus 1 has 100 transcripts, 98 audio caches, 20.8 transcript hours, 17 WER-scored rows, median WER around 8.94%, and three replay slices. Corpus 2 has 100 resolved/downloaded/transcribed rows organized by failure modes instead of topics.

## Severe Gaps

Public cost-bearing APIs are not protected. Middleware protects `/session` and `/account`, not model/transcription APIs. Deepgram token minting is a bare POST. Several model routes accept raw JSON with no request schema, size cap, quota, or auth.

Bulk ingest can leak future context into early claim extraction. The ingest orchestrator appends all segments before analysis; `onFinalUtterance` builds context from transcript segments after a cutoff but without bounding the context at the current segment. Imported sessions may therefore look smarter than true live sessions.

Session reset does not reset module-scoped AI pacing/dedupe state. Recent claim hashes, marker hashes, counters, and abort controllers live at module scope, not inside the resettable session store.

Analytics and big-data readiness are mostly aspirational. Drizzle/Neon schema exists for users, sessions, and subscriptions, but active usage is local IndexedDB with no event pipeline, warehouse model, privacy budget, telemetry schema, or evaluation logging.

## Recommendations

Create a `Yentl Intelligence Run` artifact for every replay/session: ASR WER, speaker confidence, speaker purity, claim precision/recall, stance accuracy, quote-boundary accuracy, verdict agreement, source quality, marker precision, latency, cost, and failure reason.

Add claim fields: stance, time anchor, span type, source layer, speaker confidence band, and cluster ID. Add meta-review fields: verdict history, reopened, merged, superseded, repaired, context changed.

Separate live mode from offline review mode. Live mode must never use future transcript context. Offline review can use full transcript but must label itself as full-context review.

Add model routing: cheap gate/classifier first, medium model for extraction/rhetoric, expensive model/web search only for claims that pass engagement and checkability gates. Add caching, source reuse, and per-session budgets.

Add request schemas and payload caps for every route; log token counts, web searches, audio seconds, and failures. Add cost-based tests that fail when a route can call expensive services unauthenticated.

## Launch Gates

Minimum: protected APIs, hard consent, engagement gate, no future-context leakage in live/replay eval, human Phase B sidecars, speaker-attribution evals, and per-session cost logging.

Evaluation targets from the local rubric should be treated as launch commitments: median WER <= 15%, claim recall >= 85%, claim precision >= 90%, truth-grade agreement >= 85%, high-tier source rate >= 60%, rhetoric precision >= 80%, replay failure <= 2%, and cost <= $0.50/video. My stricter view: no public claim of robust live understanding until Corpus 2 has at least 10 Phase B replay outputs with human sidecars.
