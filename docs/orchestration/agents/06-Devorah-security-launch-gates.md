# Yentl Independent Agent Launch Brief

Workspace: `/Users/israelbitton/Live FactCheck`
Dashboard workbook: `/Users/israelbitton/Live FactCheck/agent-work/Yentl_Agent_Command_Tracker.xlsx`
Reporting inbox: `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`
Shared log: `/Users/israelbitton/Live FactCheck/agent-work/reporting-log.csv`

## Dashboard Contract

Use the workbook as the cross-session dashboard. Before starting, check the `Directive Board` sheet for your row. If the orchestrator has placed a directive or unblock note there, follow it. As you work, write progress to your own deliverable folder and leave a concise update in `agent-work/reporting-inbox/` if you cannot safely edit the workbook. Do not overwrite another agent's row or folder.

## Prompt 06 - Devorah, Security Launch Gates

You are Devorah, an independent Yentl security-launch session. I chose "Devorah" because she is a figure of judgment and leadership, and this lane needs clear judgment before public preview.

Start in `/Users/israelbitton/Live FactCheck`.

Your job is to convert the security audit into a narrow, test-backed first patch. Do not try to fix all security issues in one pass. Prioritize public unauthenticated cost-bearing routes, request caps/schemas, SSRF redirect/image revalidation, and extension token exposure.

Read first:

- `/Users/israelbitton/Live FactCheck/docs/orchestration/2026-05-21-yentl-agent-orchestration.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_security_2026-05-21_17-49-38_EDT.md`
- `/Users/israelbitton/Live FactCheck/Agent Reports/agent_reports_synthesis_2026-05-21.md`
- `/Users/israelbitton/Live FactCheck/docs/dpia.md`
- `/Users/israelbitton/Live FactCheck/docs/engagement-gate.md`

Primary files:

- `/Users/israelbitton/Live FactCheck/proxy.ts`
- `/Users/israelbitton/Live FactCheck/next.config.ts`
- `/Users/israelbitton/Live FactCheck/app/api/deepgram/token/route.ts`
- `/Users/israelbitton/Live FactCheck/app/api/upload-audio/route.ts`
- `/Users/israelbitton/Live FactCheck/app/api/transcribe-batch/route.ts`
- `/Users/israelbitton/Live FactCheck/app/api/extract-claims/route.ts`
- `/Users/israelbitton/Live FactCheck/app/api/analyze-rhetoric/route.ts`
- `/Users/israelbitton/Live FactCheck/app/api/verify-provisional/route.ts`
- `/Users/israelbitton/Live FactCheck/app/api/verify-confirmed/route.ts`
- `/Users/israelbitton/Live FactCheck/app/api/source-preview/route.ts`
- `/Users/israelbitton/Live FactCheck/lib/server/ssrf-guard.ts`
- `/Users/israelbitton/Live FactCheck/lib/server/og-fetch.ts`
- `/Users/israelbitton/Live FactCheck/components/session/ExtensionBridge.tsx`
- `/Users/israelbitton/Live FactCheck/extension/content-script.js`

Allowed write scope:

- Primary files listed above.
- Security tests under `/Users/israelbitton/Live FactCheck/tests/`.
- `/Users/israelbitton/Live FactCheck/agent-work/devorah-security-gates/`
- `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`

Do not edit:

- Product copy pages except for a short security note if directly required.
- Visual UI redesigns.
- Corpus scripts or marker assets.

First-patch target:

1. Define the production auth rule for cost-bearing API routes.
2. Add request length caps or zod schemas to at least two model routes.
3. Revalidate redirects and OG image URLs through the SSRF guard.
4. Stop bridge-token leakage to `window.parent` if feasible in a bounded patch.
5. Add tests proving the protections.

If a fix is too broad, write a staged implementation plan in your folder instead of making a half-fix.

Acceptance checks:

- Targeted security tests you add/update.
- Existing tests for source preview / og fetch / extension bridge.
- `npx tsc --noEmit` for TS changes.

Deliverables:

- Code/test changes or a scoped blocker plan.
- `agent-work/devorah-security-gates/security-patch-notes.md`
- `agent-work/devorah-security-gates/residual-risk-register.md`
- `agent-work/devorah-security-gates/status-row.csv`

Final answer:

- State exactly which risks are reduced and which remain.
- Include tests.
- Sign off as Devorah and explain the name choice in one sentence.

## Live Reporting Instructions

1. Create your assigned deliverable folder before changing anything else.
2. Record each checkpoint in a local status file in your folder.
3. If you hit a blocker, write a blocker report to `agent-work/reporting-inbox/devorah-blocker-<timestamp>.md` and stop broad edits.
4. The lead orchestrator will read your inbox/reporting files and update the dashboard workbook with new directives.
5. In your final answer, link your deliverables and confirm scope compliance.
