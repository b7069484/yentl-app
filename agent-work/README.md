# Yentl agent work area

This folder is for independent agent/session deliverables coordinated by the lead orchestrator.

Rules:

- Each agent creates and owns one folder: `agent-work/<agent-slug>/`.
- Agents must not edit another agent's folder.
- Agents should write status rows to their own folder and mirror a concise row to `agent-work/reporting-log.csv` only if they can do so without clobbering other work.
- The lead orchestrator owns the master tracker workbook: `agent-work/Yentl_Agent_Command_Tracker.xlsx`.
- The workbook `Directive Board` sheet is the coordination surface: the orchestrator writes directives/unblock notes there, and agents report status or blockers through their folders plus `reporting-inbox/`.
- `agent-work/directives.csv` mirrors the initial directive board for lightweight review or import.

See:

- `/Users/israelbitton/Live FactCheck/docs/orchestration/2026-05-21-yentl-agent-orchestration.md`
- `/Users/israelbitton/Live FactCheck/docs/orchestration/agents/`
