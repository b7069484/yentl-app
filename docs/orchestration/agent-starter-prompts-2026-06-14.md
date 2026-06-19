# Yentl Reset-To-Finish Starter Prompts

Date: 2026-06-14
Workspace: `/Users/israelbitton/Live FactCheck`

Use one prompt per independent Codex/AI session. Each session should treat its lane as a focused goal, coordinate through its branch/worktree, and update its own dashboard block in:

- `docs/orchestration/yentl-reset-to-finish-dashboard.html`

Common rules for every prompt:

- Start by reading `docs/orchestration/2026-06-14-yentl-reset-to-finish-agent-orchestration.md`.
- Run `git status --porcelain=v1 -b`.
- Use a unique worktree and `codex/yentl-<lane-slug>-2026-06-14` branch before editing.
- Do not stage, commit, push, deploy, reset, rebase, clean, or overwrite another agent's work.
- Touch only your lane's allowed files. If you need more, stop and write a blocker.
- Update only your lane block in the HTML dashboard.
- Write a final report under `agent-work/reporting-inbox/`.

## L0 - Quartermaster / Orchestrator Safety

You are the Yentl Quartermaster session. Your goal is to protect the codebase while many agents work concurrently.

Read:

- `docs/orchestration/2026-06-14-yentl-reset-to-finish-agent-orchestration.md`
- `docs/orchestration/yentl-reset-to-finish-dashboard.html`
- `git status --porcelain=v1 -b`
- `docs/superpowers/validation/release-readiness-proof.json`

Allowed writes:

- `agent-work/quartermaster/`
- `agent-work/reporting-inbox/`
- Your `L0` dashboard block only.

Deliver:

- Dirty-tree conflict map.
- File ownership map.
- Worktree/branch assignment table.
- Integration order recommendation.

Do not edit product code.

## L1 - Ingestion Backend

You are the Yentl Ingestion Backend session. Your goal is to make every media/text/source ingestion path production-hard.

Read:

- `scripts/validation/prove-ingestion-local.mjs`
- `scripts/validation/prove-large-real-media-canary.mjs`
- `app/api/media-ingest/route.ts`
- `app/api/transcribe-batch/route.ts`
- `app/api/document-ingest/route.ts`
- `app/api/article-ingest/route.ts`
- `app/api/youtube-ingest/route.ts`
- `lib/server/validation-media-fixtures.ts`

Allowed writes:

- Ingestion API routes.
- Ingestion server helper files.
- Ingestion proof scripts/tests.
- `agent-work/ingestion-backend/`
- Your `L1` dashboard block only.

Proof gates:

- `npm run ingestion:proof:local`
- `npm run ingestion:proof:large-real-media` when real media manifest exists
- Focused API tests
- `npx tsc --noEmit`

Coordinate with L2 before changing client-facing response shapes.

## L2 - Source Intake UI

You are the Yentl Source Intake UI session. Your goal is to make all source entry and recovery screens polished across desktop and mobile.

Read:

- `components/session/ingest-panes/`
- `components/session/home-overview.tsx`
- `app/session/page.tsx`
- `scripts/validation/prove-ingestion-ui-local.mjs`
- `docs/superpowers/validation/ingestion-ui-local-proof.json`

Allowed writes:

- Source picker and ingest pane components.
- Source intake tests.
- Ingestion UI proof script if needed.
- `agent-work/source-intake-ui/`
- Your `L2` dashboard block only.

Proof gates:

- `npm run ingestion:proof:ui`
- Relevant pane tests.
- Desktop and 390px browser proof with zero overflow and zero console errors.

Coordinate with L1 for backend contracts and L6 for mobile share/install flows.

## L3 - Analysis Intelligence

You are the Yentl Analysis Intelligence session. Your goal is to perfect multi-speaker attribution, claim ownership, cautious synthesis, and full-session meta-view.

Read:

- `scripts/validation/prove-speaker-attribution.ts`
- `scripts/validation/prove-synthesis-metaread.ts`
- `scripts/test-corpus/score-speaker-attribution.ts`
- `lib/prompts/synthesize.ts`
- `lib/synthesis-meta-read.ts`
- `docs/superpowers/validation/speaker-attribution-proof.json`
- `docs/superpowers/validation/synthesis-metaread-proof.json`

Allowed writes:

- Analysis prompts/helpers.
- Speaker attribution scoring/proof files.
- Analysis tests.
- Test corpus sidecars/windows where assigned.
- `agent-work/analysis-intelligence/`
- Your `L3` dashboard block only.

Proof gates:

- `npm run analysis:proof:speaker-attribution`
- `npm run analysis:proof:metaread`
- Sensitive review gate remains blocked until human approval.

Do not self-approve sensitive public-claims windows.

## L4 - Evidence And Source Review

You are the Yentl Evidence and Source Review session. Your goal is to make citations, source cards, quote anchors, evidence ranking, and exports trustworthy.

Read:

- `components/session/source-review-view.tsx` if present
- `components/session/claim-detail.tsx`
- `lib/export/markdown.ts`
- `lib/export/report.ts`
- Source evidence helpers/tests
- Source review and export evidence notes under `agent-work/product-build-evidence/`

Allowed writes:

- Source/evidence UI components.
- Export helpers.
- Source evidence tests.
- `agent-work/evidence-source-review/`
- Your `L4` dashboard block only.

Proof gates:

- Source review tests.
- Export tests.
- Browser proof for source review and claim detail on desktop/mobile.

Coordinate with L3 before changing claim or speaker semantics.

## L5 - Cloud Sync

You are the Yentl Cloud Sync session. Your goal is to prove account-backed saved sessions across devices.

Read:

- `scripts/validation/prove-cloud-sync-local.mjs`
- `app/api/sessions/route.ts`
- `app/api/sessions/[id]/route.ts`
- `lib/server/cloud-session-store.ts`
- `lib/client/session-sync.ts`
- `docs/superpowers/validation/cloud-sync-local-proof.json`
- `docs/superpowers/validation/cloud-sync-deploy-proof.json`

Allowed writes:

- Cloud sync API/client/store files.
- Cloud sync proof scripts/tests.
- `agent-work/cloud-sync/`
- Your `L5` dashboard block only.

Proof gates:

- `npm run cloud-sync:proof:local`
- `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER='Bearer ...' npm run cloud-sync:proof:local`
- `YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER='Bearer ...' npm run cloud-sync:proof:deploy`

Stop if Clerk, database, or auth header are unavailable. Record the exact missing input.

## L6 - Mobile/PWA/Devices

You are the Yentl Mobile/PWA/Devices session. Your goal is to prove iOS/Android share, file, mic, PWA install/open, and saved-session restore.

Read:

- `app/mobile/page.tsx`
- `app/manifest.webmanifest` or manifest route
- `scripts/validation/prove-mobile-pwa-local.mjs`
- `scripts/validation/prove-mobile-device-canary.mjs`
- `agent-work/validation/mobile-device-canaries.template.json`

Allowed writes:

- Mobile/PWA pages and manifest-related files.
- Mobile proof scripts/tests.
- `agent-work/mobile-pwa-devices/`
- Your `L6` dashboard block only.

Proof gates:

- `npm run mobile:proof:local`
- `npm run pwa:proof:native`
- `npm run mobile:proof:devices` when real iOS/Android evidence exists.

Coordinate with L1/L2 for source flows and L5 for restore proof.

## L7 - Chrome Extension

You are the Yentl Chrome Extension session. Your goal is to finish current-tab capture, extension panel polish, packaging, and real-page proof.

Read:

- `extension/`
- `components/session/ExtensionBridge.tsx` if present
- `docs/browser-tab-capture.md`
- `scripts/validation/prove-installed-extension-local.mjs`
- `scripts/validation/verify-real-webpage-targets.mjs`
- `docs/superpowers/validation/installed-extension-local-proof.json`
- `docs/superpowers/validation/installed-extension-external-proof.json`

Allowed writes:

- Extension files.
- Extension bridge/panel files.
- Extension proof scripts/tests.
- `agent-work/chrome-extension/`
- Your `L7` dashboard block only.

Proof gates:

- `npm run extension:check`
- `npm run extension:proof:local`
- `npm run extension:proof:external`
- `npm run extension:proof:real-pages`

Coordinate with L1/L3 for transcript and analysis contracts.

## L8 - TV Room Mode

You are the Yentl TV Room Mode session. Your goal is to make TV display reliable for live and restored sessions.

Read:

- `app/tv/page.tsx`
- `components/session/tv-dashboard.tsx`
- `tests/tv-dashboard.test.tsx`
- TV evidence notes in `agent-work/product-build-evidence/`

Allowed writes:

- TV page/components/tests.
- `agent-work/tv-room-mode/`
- Your `L8` dashboard block only.

Proof gates:

- `npx vitest run tests/tv-dashboard.test.tsx`
- Browser proof for `/tv` and `/tv?restore=<id>` when restore data exists.

Coordinate with L5 for cloud restore and L3 for meta-read display.

## L9 - Security/Privacy/Trust

You are the Yentl Security/Privacy/Trust session. Your goal is to close SSRF, upload, auth, privacy, legal-copy, and trust gates.

Read:

- `app/api/*`
- `docs/superpowers/validation/trust-copy-deploy-proof.json`
- `tests/api/model-route-security.test.ts`
- `tests/launch-smoke-script.test.ts`
- Privacy/trust/legal public pages.

Allowed writes:

- Security-sensitive API tests and narrow fixes.
- Trust/legal page copy fixes.
- Security proof scripts.
- `agent-work/security-privacy-trust/`
- Your `L9` dashboard block only.

Proof gates:

- Security/API focused tests.
- `npm run trust:proof:deploy` after deploy where applicable.
- `npm run smoke:launch`

Stop and write a blocker for legal/product decisions.

## L10 - Design System/Public UX

You are the Yentl Design System/Public UX session. Your goal is to polish landing, public pages, app shell consistency, and visual affordances without overclaiming capabilities.

Read:

- `app/page.tsx`
- `app/about/page.tsx`
- `app/demo/page.tsx`
- `app/pricing/page.tsx`
- `app/faq/page.tsx`
- `app/privacy/page.tsx`
- `app/accessibility/page.tsx`
- `app/globals.css`
- Current visual screenshots under `docs/superpowers/validation/screenshots/`

Allowed writes:

- Public page UI/copy within product-truth constraints.
- Shared visual styles only when narrowly needed.
- `agent-work/design-public-ux/`
- Your `L10` dashboard block only.

Proof gates:

- Browser proof desktop/mobile.
- `npm run a11y:proof:local`
- Relevant public page tests.

Coordinate with L9 before changing privacy, accessibility, legal, or pricing claims.

## L11 - Launch QA/Release

You are the Yentl Launch QA/Release session. Your goal is to integrate completed lanes, run full regression, and prove release readiness.

Start only when the orchestrator says upstream lanes are ready.

Read:

- `docs/superpowers/validation/release-readiness-proof.json`
- All lane reports in `agent-work/reporting-inbox/`
- `package.json`
- `.github/workflows/ci.yml`

Allowed writes:

- Release proof scripts/tests.
- Release checklist artifacts.
- `agent-work/launch-qa-release/`
- Your `L11` dashboard block only.

Proof gates:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:run`
- `npm run build:automation`
- `npm run release:readiness`
- CI green.
- Production deploy.
- Production smoke.

Do not stage, commit, push, deploy, or mark launch-ready unless explicitly approved.
