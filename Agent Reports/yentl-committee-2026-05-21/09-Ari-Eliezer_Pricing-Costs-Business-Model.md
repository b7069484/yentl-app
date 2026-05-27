# Yentl Committee Report - Pricing, Operating Costs, and Business Model

    **Committee member:** Ari Eliezer  
    **Remit:** Pricing strategy, cost-to-operate, usage metering, business model, packaging, unit economics.  
    **Why this name:** Ari means lion; Eliezer means help. This seat is firm about cost realities while helping the product become sustainable.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `package.json`, `app/api/deepgram/token/route.ts`, `app/api/transcribe-batch/route.ts`, `app/api/upload-audio/route.ts`, `app/api/verify-confirmed/route.ts`, `app/api/devil-advocate/route.ts`, `lib/db/schema.ts`, `docs/superpowers/handoff/2026-05-17-v1.5-complete.md`, `docs/superpowers/handoff/2026-05-15-multi-source-ingestion-pickup.md`.
- External pricing references: Deepgram pricing, Anthropic Claude pricing, Vercel AI Gateway pricing, Vercel Blob pricing.

## Cost Model Reality

Yentl has three major variable-cost drivers:

1. Speech-to-text minutes: Deepgram Nova-3 and diarization/add-ons.
2. Model tokens: extraction, provisional verification, confirmed verification with web search, rhetoric, synthesis, Devil's Advocate.
3. Storage/network: Blob uploads, transfer, operations, and hosting.

Deepgram lists Nova-3 Monolingual at $0.0048/min streaming and $0.0077/min pre-recorded on Pay As You Go, with speaker diarization as an add-on at $0.0020/min. Anthropic's current pricing page lists Opus 4.7 at $5/MTok input and $25/MTok output, Sonnet 4.6 at $3/$15, and Haiku 4.5 at $1/$5. Vercel AI Gateway says no markup but still charges provider rates. Vercel Blob pricing charges storage, operations, and data transfer.

A naive always-verify-every-utterance design will be expensive and abusable. Yentl must meter before it markets.

## Strengths

The local rubric already includes cost targets: API cost per video <= $0.50 v1 and <= $0.20 stretch. That is the right instinct.

The app has a DB schema with users, sessions, subscription status, plan, monthly audio seconds, monthly AI requests, and reset date. This is a good skeleton for quotas, though not yet wired as active metering.

The architecture can route work by cost: cheap engagement gate, medium extraction/rhetoric, expensive web-search verification only when warranted.

## Severe Gaps

No runtime usage metering is enforced. Public APIs can spend Deepgram, Vercel Blob, and model budget anonymously.

The product lacks pricing pages, plan names, usage caps, overage behavior, beta access rules, quota UI, and cost warnings.

Cost estimates in prior handoffs are anecdotal. There is no session-level cost ledger that records audio minutes, model route calls, tokens, web searches, Blob bytes, or failed request cost.

The privacy story and cost story conflict. If the app avoids server persistence, it cannot easily meter per account unless it stores usage counters server-side. That is fine, but it must be explicitly designed.

## Recommendations

Define beta plans before launch:

- Private Research Preview: invite-only, low quota, no public promises.
- Educator/Nonprofit Pilot: capped monthly audio hours, exports, classroom-safe demos.
- Journalist/Researcher Pro: higher audio limits, saved sessions, export/report tools.
- Team/Institution: admin dashboard, audit logs, source policy, custom limits.

Add a usage ledger table and middleware that records: user/session, source kind, audio seconds, upload bytes, transcript segments, model route, model, tokens, web search count, status, cost estimate, and failure reason.

Add route-level budgets: per-session max audio minutes, max claims verified, max confirmed searches, max source previews, max upload size, max concurrent captures.

Use a tiered model strategy: Haiku-class engagement/checkability gate; Sonnet-class extraction/rhetoric/synthesis; Opus/web search only for high-value confirmed verification or contested claims.

Add UI cost transparency: `This session used 18 minutes of audio and 12 source-backed checks` for account users; simple quota indicator in settings/library.

## Pricing Recommendation

Do not publish final paid pricing yet. Publish `request access` with pilot tiers and internal cost caps. Once metering exists, test packages around monthly audio hours and confirmed checks, not unlimited usage.

## Launch Blockers

No public preview with production keys until metering, auth, quotas, and cost dashboards exist. No paid launch until pricing pages, terms, refund/cancellation handling, support, and usage reporting exist.
