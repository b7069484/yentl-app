# Yentl pipeline canary: 2026-06-07

Purpose: validate the full loop ladder manually with `codex exec` after the first control-tower loop succeeded.

Mode: canary/no-product-edits.

Why no product edits: `main` is currently behind `origin/main` by 11 and the loop/plan folders are untracked. Until branch/worktree ownership is confirmed, downstream build lanes should prove they can select, no-op, or block safely without touching app code.

## Canary Order

| Order | Loop | Expected Result |
|---:|---|---|
| 1 | `control-tower` | Completed manually; report exists. |
| 2 | `ui-system-build` | Select or reject one UI build row; no product edits in canary mode. |
| 3 | `mobile-ui-build` | Select or reject one mobile build row; no product edits in canary mode. |
| 4 | `product-roadmap-build` | No-op/block because product roadmap row is `blocked_needs_context`. |
| 5 | `ui-mobile-audit` | Audit/dedupe only; may update issue ledger. |
| 6 | `ui-mobile-fix` | No-op unless a row is `ready_for_fix`; no product edits in canary mode. |
| 7 | `watchdog` | PASS/WARN/STOP report over states, ledgers, and scope. |

## Results

| Loop | Status | Evidence |
|---|---|---|
| `control-tower` | done | `agent-work/loops/control-tower/evidence/control-tower-2026-06-07T17-44-22-0400.md` |
| `ui-system-build` | blocked_noop_canary | `agent-work/loops/ui-system-build/evidence/2026-06-07T17-59-07-0400-ui-system-build-canary.md` |
| `mobile-ui-build` | blocked_noop_canary | `agent-work/loops/mobile-ui-build/evidence/2026-06-07T18-03-14-0400-mobile-ui-build-canary.md` |
| `product-roadmap-build` | no_op_blocked_no_ready_row | `agent-work/loops/product-roadmap-build/evidence/2026-06-07-product-roadmap-build-manual-canary-noop.md` |
| `ui-mobile-audit` | done_deduped_recurring_findings | `agent-work/loops/ui-mobile-audit/evidence/2026-06-07T18-10-19-04-00-ui-mobile-audit.md` |
| `ui-mobile-fix` | non_consuming_canary_selected_YENTL-TRUTH-0002 | `agent-work/loops/ui-mobile-fix/evidence/2026-06-07-manual-canary-ui-mobile-fix.md` |

## Canary Corrections

- The `ui-mobile-fix` canary exposed an audit/fix contract mismatch: `YENTL-TRUTH-0001` is a privacy/legal public-copy claim, so it cannot be routed through the normal fix loop without human approval.
- Post-canary correction: `YENTL-TRUTH-0001` is now `blocked_needs_context`, and the audit goal/prompt now require gated public claims to stay out of the normal fix queue.
- `YENTL-TRUTH-0002` remains the next normal fix-loop candidate.
- Watchdog canary then correctly flagged those audit contract edits as out-of-scope for an unattended audit loop. Resolution: the edits are now recorded in `agent-work/loops/change-control.md` as interactive steward maintenance, and watchdog now reads that file before classifying contract edits.
- Watchdog rerun at `2026-06-07T18:27:05-04:00` downgraded the prior STOP to WARN. Current status: no STOP active; `YENTL-TRUTH-0001` gated, `YENTL-TRUTH-0002` ready for the normal fix lane.
- Automation runtime correction: all seven active Yentl cron jobs were updated through the app automation API from `gpt-5-codex` to `gpt-5.5`, matching the model that successfully executed the manual canaries.
- Added `automation-supervisor` as a postflight cron/evidence supervisor. It is scheduled for 6:17 AM so it can verify the ladder after watchdog without overlapping the 6:00, 6:35, or 6:55 Hamodia jobs.
