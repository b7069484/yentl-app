Created the supervisor canary report: [2026-06-07T18-35-47-0400-automation-supervisor-canary.md](/Users/israelbitton/Live%20FactCheck/agent-work/loops/automation-supervisor/evidence/2026-06-07T18-35-47-0400-automation-supervisor-canary.md)

Updated [STATE.md](/Users/israelbitton/Live%20FactCheck/agent-work/loops/automation-supervisor/STATE.md) to `warn_no_stop_active`.

Summary: all eight expected Yentl automations PASS config checks: present, `ACTIVE`, `gpt-5.5`, local runtime, correct cwd, expected off-hours schedule. Overall supervisor result is WARN/no STOP because watchdog is WARN, build rows are blocked/too broad, stale manual handoff notes exist, and the branch is behind with untracked loop/plan surfaces.

Next overnight ladder is safe to proceed in guarded mode. Build lanes should no-op unless exact slices are promoted; `ui-mobile-fix` can use current ledger candidate `YENTL-TRUTH-0002`; `YENTL-TRUTH-0001` remains privacy/legal gated.