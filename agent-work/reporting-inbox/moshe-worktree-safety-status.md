# Moshe Worktree Safety Status

Status: completed  
Time: 2026-05-21T18:59:42-04:00  
Deliverable folder: `/Users/israelbitton/Live FactCheck/agent-work/moshe-worktree-safety/`

Moshe completed the read-mostly worktree safety map. Key risk: the dirty tree mixes 31 unstaged tracked code/test/script edits, 1 staged extension handoff, and hundreds of untracked corpus, visual-evidence, orchestration, and local-agent files. Fresh sessions should only write inside their assigned scope and should treat `.claude/`, `.claire/`, `Agent Reports/`, generated corpus outputs, visual-evidence assets, and other agents' folders as read-only.

Deliverables:

- `/Users/israelbitton/Live FactCheck/agent-work/moshe-worktree-safety/worktree-conflict-map.md`
- `/Users/israelbitton/Live FactCheck/agent-work/moshe-worktree-safety/agent-file-ownership-suggestions.csv`
- `/Users/israelbitton/Live FactCheck/agent-work/moshe-worktree-safety/status-row.csv`
