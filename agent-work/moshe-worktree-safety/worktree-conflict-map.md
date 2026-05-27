# Yentl Worktree Conflict Map

Generated: 2026-05-21T18:59:42-04:00  
Workspace: `/Users/israelbitton/Live FactCheck`  
Agent: Moshe, Worktree Safety Quartermaster

## Scope Confirmation

This is a read-mostly map of the dirty local worktree. I did not fix code, delete files, clean generated outputs, stage files, commit files, switch branches, or edit outside the allowed Moshe reporting scope:

- `/Users/israelbitton/Live FactCheck/agent-work/moshe-worktree-safety/`
- `/Users/israelbitton/Live FactCheck/agent-work/reporting-inbox/`

The only writes made by Moshe are reporting deliverables and checkpoint/status files.

## Dashboard Directive

The workbook `Directive Board` row for Moshe says:

- Status: `ready`
- Directive: `Start from your launch brief, create only your deliverable folder, and report via reporting-inbox/status-row.`
- Roadblock/dependency: `No`

The CSV mirror at `agent-work/directives.csv` matches the workbook directive.

## Starting State Evidence

Required commands were run from `/Users/israelbitton/Live FactCheck`.

- Branch: `codex/yentl-functional-samples-extension-handoff...origin/codex/yentl-functional-samples-extension-handoff`
- Unstaged tracked modifications: 31 files
- Staged changes: 1 new handoff doc
- Untracked entries from `git ls-files --others --exclude-standard` at survey time: 713
- `git diff --stat`: 31 files, 1130 insertions, 138 deletions
- `git diff --cached --stat`: 1 file, 409 insertions
- Agent/system dirs found by required `find`: `./.claire`, `./agent-work`, `./node_modules/resolve/.claude`, `./node_modules/nanoid/.claude`, `./.claude`, `./Agent Reports`

## Top Conflict Risks

1. `package.json` is modified to add corpus scripts, while corpus harness files and large generated corpus outputs are also dirty. Any package/test-harness agent must coordinate before editing scripts or running broad corpus commands.
2. `components/session/ux-flow-dashboard.tsx` imports new untracked dashboards, while visual-evidence assets and `.project/review-comments` are untracked. Flow/dashboard agents can easily overwrite each other's review surface.
3. `app/api/source-preview/route.ts`, `lib/server/og-fetch.ts`, `lib/client/source-preview.ts`, and `tests/og-fetch.test.ts` are split across tracked and untracked SSRF/thumbnail work. Security and visual-source agents must coordinate.
4. `.claude/`, `.claire/`, `Agent Reports/`, and `agent-work/` are untracked local coordination roots, not disposable debris. Treat them as read-only unless the owner or orchestrator says otherwise.
5. Generated assets are very large and mixed: 232 untracked `test-corpus/` entries, 241 untracked `test-corpus-2/` entries, and 161 visual-evidence-related untracked entries. Do not run cleanup or broad asset regeneration.

## Bucket Map

### Source Code Changes

Observed paths:

- Modified app routes: `app/api/corpus-sample/route.ts`, `app/api/source-preview/route.ts`
- Untracked app route: `app/api/project-flow-comments/route.ts`
- Modified session components: `components/session/ClaimCard.tsx`, `MarkerChip.tsx`, `SourceListItem.tsx`, `chips.tsx`, `claim-detail.tsx`, `claim-row.tsx`, `filtered-list.tsx`, `marker-row.tsx`, `source-card.tsx`, `ux-flow-dashboard.tsx`, `watch-view.tsx`
- Untracked session components: `components/session/az-flow-dashboard.tsx`, `marker-asset-icon.tsx`, `visual-evidence-dashboard.tsx`
- Modified lib files: `lib/client/verdict-theme.ts`, `lib/export/report.ts`, `lib/prompts/verify-confirmed.ts`, `lib/prompts/verify-provisional.ts`, `lib/server/og-fetch.ts`, `lib/types.ts`
- Untracked lib files: `lib/client/source-preview.ts`, `lib/visual-evidence/marker-assets.ts`
- Modified `package.json`

Fresh-session policy: ask first. These are active implementation files spanning security, source previews, verdict vocabulary, visual evidence, export behavior, flow dashboards, and watch UI. A fresh session should only edit a named subset from its launch brief, and should read current diffs before patching.

### Tests

Observed paths:

- Modified: `tests/api/corpus-sample.test.ts`, `tests/hero-selection.test.ts`, `tests/og-fetch.test.ts`, `tests/ux-flow-dashboard.test.tsx`
- Untracked: `tests/marker-assets.test.ts`
- Untracked tests inside `.claire/worktrees/wonderful-bhabha-796897/`

Fresh-session policy: ask first for shared repo tests; read-only for `.claire` worktree tests. Test files are evidence of concurrent implementation lanes, not just disposable failures.

### Docs And Handoffs

Observed paths:

- Staged: `docs/superpowers/handoff/2026-05-21-yentl-extension-panel-workspace-export-handoff.md`
- Untracked orchestration packet: `docs/orchestration/**`
- Untracked handoff/spec/plan docs: `docs/superpowers/handoff/2026-05-21-yentl-next-session-flow-implementation-handoff.md`, `docs/superpowers/plans/2026-05-21-yentl-complete-flow-screen-state-plan.md`, `docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`
- Untracked existing report set: `Agent Reports/*.md`

Fresh-session policy: read-only unless you own the exact handoff/report. The staged extension handoff is already in the index; do not amend or unstage it casually.

### Generated Corpus Artifacts

Observed paths:

- Modified: `test-corpus/scores/solo_005.json`
- Untracked count: 232 under `test-corpus/`
- Untracked count: 241 under `test-corpus-2/`
- Untracked report output: `public/corpus-2-report/`
- Modified harness scripts: `scripts/test-corpus/_shared.ts`, `fetch-ground-truth.ts`, `ingest-all.ts`, `replay.ts`, `resolve-urls.ts`, `score-wer.ts`
- Untracked harness scripts: `scripts/test-corpus/report.ts`, `scripts/test-corpus-2/report.ts`

Fresh-session policy: read-only by default; Yonah or a corpus-lane owner may write only to explicitly assigned corpus deliverables. Do not overwrite transcripts, audio, scores, logs, reports, or run broad ingest/replay without approval.

### Visual Evidence Artifacts

Observed paths:

- Untracked source/docs/scripts: `docs/superpowers/visual-evidence/`, `lib/visual-evidence/`, `scripts/visual-evidence/`
- Untracked public assets: `public/visual-evidence/**` including flow screenshots, marker SVGs, Higgsfield prompts, and marker masters
- Untracked component surfaces: `components/session/marker-asset-icon.tsx`, `components/session/visual-evidence-dashboard.tsx`
- Untracked art/source files: `download.jpg`, `download-1.jpg`, `yentl-mark.ai`, `yentl-mark.svg`

Fresh-session policy: ask first. Noam/Eli/Ariel-style lanes may inspect, but asset writes and regeneration need explicit ownership because generated and hand-authored assets are mixed.

### Extension Files

Observed paths:

- Tracked `extension/` app files are present and clean in current Git status.
- Staged extension handoff doc: `docs/superpowers/handoff/2026-05-21-yentl-extension-panel-workspace-export-handoff.md`
- Untracked Ezra report: `agent-work/ezra-extension-proof/status.md`

Fresh-session policy: tracked `extension/` files are currently available only to the Ezra extension-proof lane or an explicitly assigned extension worker. Everyone else should treat them as read-only. The staged extension handoff and Ezra status are read-only coordination evidence.

### Local Agent/System Debris

Observed paths:

- `.claude/worktrees/**` with many named worktrees
- `.claire/worktrees/wonderful-bhabha-796897/**`
- `agent-work/**`
- `Agent Reports/**`
- `.project/review-comments/**`
- `.gitignore` currently ignores `.superpowers/`, `.env*.local`, `/bin/yt-dlp`, and `/.clerk/`, but does not ignore `.claude/`, `.claire/`, `agent-work/`, `Agent Reports/`, `.project/review-comments/`, corpus outputs, or visual-evidence outputs.

Fresh-session policy: read-only unless it is your assigned `agent-work/<slug>/` folder or the orchestrator asks for a specific update. Do not delete, move, clean, or add ignore rules for these roots without a lead decision.

### Unknown/Risky

Observed paths:

- `3701551.3704128.pdf`
- `download.jpg`
- `download-1.jpg`
- `yentl-mark.ai`
- `yentl-mark.svg`

Fresh-session policy: must ask first. These may be source references or art deliverables; the filenames do not explain ownership well enough to modify or clean them.

## Suggested Global Rules For Fresh Sessions

- Start with `git status --porcelain=v1 -b`.
- Read your launch file and the `Directive Board` row before edits.
- Touch only your named write scope.
- Read diffs for any file before changing it.
- Do not edit `.claude/`, `.claire/`, `Agent Reports/`, generated corpus artifacts, visual-evidence assets, or another agent's folder.
- Do not run broad cleanup, `git add .`, branch switches, rebases, resets, or corpus regeneration.
- If a needed file is already dirty and outside your lane, write a blocker note to `agent-work/reporting-inbox/`.

## Decisions Needed

- Whether `.claude/`, `.claire/`, `agent-work/`, `Agent Reports/`, `.project/review-comments/`, corpus outputs, and visual-evidence outputs should be ignored, tracked, or selectively promoted.
- Who owns `package.json` corpus script additions while multiple corpus scripts and outputs are dirty.
- Whether visual-evidence marker assets are source assets, generated outputs, or review-only artifacts.
- Whether the staged extension handoff should remain staged before any future commit split.
