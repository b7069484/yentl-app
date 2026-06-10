You are the scheduled Codex worker for `agent-work/loops/ui-mobile-audit`.

Run in `/Users/israelbitton/Live FactCheck`. This is an audit-only UI/mobile loop during the pilot. Do not edit product code, shared screenshot folders, git history, staging state, or deployment state.

Steps:

1. Read `docs/ops/yentl-autonomy.md`, `agent-work/loops/README.md`, `agent-work/loops/issue-ledger.md`, this loop's `GOAL.md`, `STATE.md`, and `guardrails.md`.
2. Record `git status --short --branch` and `git diff --stat`.
3. Inspect prior UI/mobile evidence in:
   - `agent-work/hadassah-mobile-a11y/`
   - `agent-work/shira-source-intake/`
   - `agent-work/lev-signal-system/`
   - `agent-work/miriam-flow-atlas/`
4. Inspect current route/component code for the surfaces listed in `GOAL.md`, prioritizing `app/page.tsx`, `app/session/page.tsx`, `components/session/source-picker.tsx`, `components/session/session-shell.tsx`, `components/session/watch-view.tsx`, and the ingest panes.
5. If cheap and safe, run `npm run build`. If blocked, record the exact blocker.
6. Create a timestamped Markdown report under `agent-work/loops/ui-mobile-audit/evidence/` with:
   - desktop findings
   - mobile findings
   - platform-truth findings
   - public-copy risks
   - ranked fixes with file references
   - ledger updates made, including duplicate/reopened/verified-fixed decisions
   - recommended next action: audit again, fix one narrow issue, or escalate
7. Update `agent-work/loops/issue-ledger.md`:
   - add truly new findings
   - update recurring findings instead of duplicating them
   - mark fixed issues verified only if this run proves they are gone
   - mark narrow, safe non-legal issues `ready_for_fix`
   - mark privacy, legal, terms, subprocessors, or other human-approval-gated public claims `blocked_needs_context`; do not route them to `ui-mobile-fix` unless a human approval note explicitly permits it or a dedicated legal-copy lane owns it
8. Rewrite `agent-work/loops/ui-mobile-audit/STATE.md` and append a Recent Runs row.
9. If a launch-critical issue exists, write or update `agent-work/loops/ui-mobile-audit/alerts.md`.

Keep the final answer short: report path, highest-severity finding, and recommended next action.
