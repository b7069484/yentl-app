# Yentl Reset-To-Finish Orchestration Work Area

This folder supports the June 14 multi-agent reset-to-finish plan.

Authoritative files:

- `docs/orchestration/2026-06-14-yentl-reset-to-finish-agent-orchestration.md`
- `docs/orchestration/agent-starter-prompts-2026-06-14.md`
- `docs/orchestration/yentl-reset-to-finish-dashboard.html`

Agent reporting:

- Each lane writes its working notes under `agent-work/<lane-slug>/`.
- Each lane writes final or blocker reports to `agent-work/reporting-inbox/`.
- The orchestrator updates the dashboard shell and cross-lane dependency status.

Concurrency rule:

- Editing agents should use separate worktrees under `/Users/israelbitton/Live-FactCheck-worktrees/`.
- Agents may update only their own dashboard block in the HTML dashboard.
- If a dashboard conflict occurs, the agent writes a report and lets the orchestrator merge it.
