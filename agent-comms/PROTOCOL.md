# Dual-Track Agent Collaboration Protocol
### *"Two lamps, one wick"* — Operator + Readiness, with a human who turns the irreversible key

> A reusable operating system for two AI agents (default: **Codex** + **Claude**) working the same project/codebase, so they coordinate **directly through shared files** — no human relaying messages — while **checking each other** (neither rubber-stamps the other), and the human stays the final authority on anything irreversible.
>
> First forged on the Hamodia launch (2026-06-19). Project-agnostic. Copy this kit into any project, or reference it globally from `~/.claude/agent-collab/`.

---

## 0. When to use this

Use it whenever **two agents share one repo/project** and you want:
- **velocity + safety** — one agent builds fast, the other independently verifies before anything ships;
- **no human switchboard** — the agents message each other through files and poll on a timer;
- **no false "done"** — "implemented," "verified," and "accepted" are three different words owned by three different parties.

If only one agent is working, you don't need this — use it the moment a second agent touches the same surfaces.

---

## 1. The three roles (by function — swappable)

| Role | Default | Owns |
|------|---------|------|
| **Operator** | Codex | Execution sequencing, integration across sessions/worktrees, deploy mechanics, day-to-day protected-surface enforcement, keeping work moving. |
| **Readiness / Gate** | Claude | The acceptance bar (criteria), the risk register, **independent verification**, the go/no-go recommendation, and a **binding no-go** on irreversible actions when a *written* criterion is unmet. |
| **Owner** | the human | Product/design/business/editorial decisions, approval of every **irreversible** turn, accepting explicit deferrals, final release. **Only the Owner turns the irreversible key.** |

Lead is split by **domain**, not fused into whoever holds the keyboard: *Operator drives the operation, Readiness owns the word "ready," Owner authorizes release.* Either agent may propose a better idea in the other's lane — adopted on merit, in writing.

---

## 2. The shared files (the surfaces)

Place these in the project (paths adjustable; keep them together):

| File | Owner/writer | Purpose |
|------|--------------|---------|
| `agent-comms/mailbox.json` | both (append-only via script) | The message channel between agents. |
| `agent-comms/notify.mjs` | shared tool | Send a message (one command, lock-safe). |
| `agent-comms/inbox.mjs` | shared tool | Read your unread mail (one command). |
| `<status>/board.json` | **Operator** sole-writes | The single canonical board of record: rows + status + operational proof. One board, never two. |
| `<status>/criteria.<readiness>.json` | **Readiness** sole-writes | Row-keyed acceptance_criteria + readiness verdicts + independent-reproduction artifacts. Referenced/imported by the board. (Companion pattern avoids a two-writer race on one file.) |
| `PROTOCOL.md` (this file) | reference | The constitution, copied into the project. |
| `BOARD_SCHEMA.md` | reference | The board row schema. |

**Rule of the road:** *chat relays; the files rule.* Every decision lands in a file (board or mailbox), never only in conversation.

---

## 3. How the agents talk (and stay in touch on a loop)

**Send / receive — one command each:**
```bash
node agent-comms/notify.mjs --from claude --to codex --thread <t> --body "..." [--reply-to <id>] [--token X]
node agent-comms/inbox.mjs  --agent codex  --mark-read     # exit code 10 = "you have mail"
```
Append-only, lock-safe, `read_by` tracking, optional handshake `token`. Never hand-edit or overwrite prior messages.

**The check-in loop (each agent runs its own):**
Each agent arms a recurring poll — every 5 minutes is the default cadence — that reads its inbox and acts, and **stays completely silent when there's nothing.**
- *Claude (Claude Code):* `/loop 5m <poll prompt>` → a `CronCreate` job `*/5 * * * *`.
- *Codex:* its own 5-minute heartbeat poll of the same mailbox.
- The poll prompt: *"read inbox; if messages from the other agent, act/reply/reconcile and surface to the Owner only if it needs a decision; if none, stay silent."* (Template in README.)

**The one human bootstrap:** the agents can't reach into each other's process to *start* the other's loop. So the Owner gives **one** nudge — *"set up your 5-minute mailbox poll; there's a message waiting"* — to each agent once. After that, they run autonomously: Operator writes → the other's loop catches it within the interval → it acts/replies → and so on. The Owner only hears from them when something genuinely needs the key.

**Discipline:** read inbox at the start of every turn; reply via `notify`; decisions land on the board, not only in chat.

---

## 4. The board — one canonical row schema (see `BOARD_SCHEMA.md`)

Every launch/release-critical item is a board row carrying, at minimum:
`id` · `title` · `severity (P0..P3)` · `owner` (Operator) · `verifier` (Readiness) · `files_surfaces` · flags (`reversible`, `live_mutation`, `protected_surface_touch`) · `acceptance_criteria` (the written bar) · `proof_required` · `readiness (not-started | implemented | verified | accepted | deferred)` · **the proof triad** (`operator_proof_artifacts`, `readiness_reproduction_artifacts`, `owner_acceptance_status`) · `independently_reproduced` (bool) · `blocker` · `next_single_action`.

**Invariant:** a row may read `readiness: "verified"` **only if** `independently_reproduced === true` with non-empty reproduction artifacts. A row may read `"accepted"` **only if** the Owner accepted it.

---

## 5. Check-and-balance — the teeth (anti-collusion)

A check-and-balance dies the instant it becomes courtesy. These keep it real:

1. **Independent reproduction.** Readiness never marks a critical item `verified` on the Operator's word or artifact alone — it **re-derives** the proof itself (re-runs the test, re-pulls the URL, re-queries as the wrong user, re-counts the rows). Can't reproduce → not verified.
2. **Proof is an artifact, not an assertion.** Every proof links to a reproducible artifact in the repo (screenshot path, curl output, test log, query count). "Looks good" is not a state.
3. **Proof triad, never laundered.** Operator proof ("did it build/deploy and behave?") ≠ Readiness reproduction ("re-derived against the criterion?") ≠ Owner acceptance ("product decision"). Three separate fields; none substitutes for another.
4. **Three-state truth.** `configured` ≠ `proven` ≠ `deferred`. Distinct cells; never collapsed into "done."
5. **No silent completion.** Operator may say *implemented*. Readiness may say *verified* (only after reproduction). **Only the Owner** may say *accepted / deferred / release-approved.*
6. **Written blocks both ways.** A Readiness block is criterion-bound: *exact risk · exact failing criterion · exact evidence still needed · exact unblock action.* An Operator challenge ("this block is stale / overly broad / sequencing-hostile") is equally written: *operational reason · alternate proof · rollback path.* Evidence, not impatience, in both directions.

---

## 6. The irreversible-action gate

**Irreversible-action list** (adapt per project): database migrations · production data writes · deploy/cutover · payment-provider mutation · live sends (email/SMS/push/WhatsApp) to real recipients · protected-surface changes (e.g. homepage/approved content) · branch merge/push/consolidation.

**Never perform any of these from inside a heartbeat poll** — only as a deliberate, coordinated action, through the gate sequence:

1. **Operator posts** to the board/mailbox: proposed action · surfaces touched · rollback · proof already collected · *why now*.
2. **Readiness checks** against the written criterion → **clears**, or **blocks** with the four written parts (§5.6).
3. **Owner approves** the irreversible turn (or accepts an explicit deferral).
4. **Operator executes** and produces proof.
5. **Readiness independently reproduces** the proof before the row may read `verified`.

---

## 7. Tie-breakers

- **Readiness / risk classification:** Readiness (Claude) wins.
- **Operational sequencing / worktree collision:** Operator (Codex) wins — *unless* it weakens a written gate, in which case the gate holds.
- **Product / design / editorial / business preference:** Owner wins.
- **Any irreversible production action:** Owner must approve.

When a block and an operational call deadlock, the Owner gets **one decision card** — *the action · Readiness' failing criterion + evidence · Operator's reason + rollback · the single question* — not a thread.

---

## 8. Worktree isolation (because two agents will collide otherwise)

Each agent works in its own worktree/branch. No force-add, no cross-lane overwrite. Any edit to an **overlapping surface** (or anything on the irreversible list) is **posted to the board before the first keystroke.** The board is the mutex.

**Multi-project isolation (one level up).** One project = **one mailbox + one board + one criteria companion + one loop**, each **named by project** (e.g. `hamodia-comms.json`, `krm-comms.json`). **Never share a mailbox — or a bare `claude`/`codex` identity — across two projects.** A shared mailbox means one project's poll loop *consumes* (`--mark-read`) the other project's mail, silently stealing it. If two efforts run at once, give each its own scoped mailbox + a loop **fenced to its own threads** (ignore, never consume, foreign-project messages). Scope by file name (simplest) or by project-suffixed identities (`claude-<proj>`).

---

## 9. Bootstrap — invoking this for a new project

1. **Copy the kit** into the project: `agent-comms/{notify,inbox}.mjs`, `PROTOCOL.md`, `BOARD_SCHEMA.md`. Pick the board + criteria paths.
2. **Scaffold** the mailbox (auto-created on first `notify`) and an empty `board.json` (Operator) + `criteria.<readiness>.json` (Readiness).
3. **Each agent arms its 5-minute loop** (Claude: `/loop 5m …`; Codex: its heartbeat).
4. **Owner gives the one bootstrap nudge** to each agent ("poll the mailbox; message waiting").
5. **Seed the board** with the initial rows; Readiness authors the acceptance criteria in the companion; Operator imports.
6. Work flows: build → independent reproduce → Owner accepts irreversible turns. Surface to the Owner **only** when a decision/approval is genuinely needed.

---

## 10. Glossary (shared language)

- **Operator / Readiness / Owner** — the three roles (§1).
- **Board** — the single canonical status file of record.
- **Criteria companion** — the Readiness-owned acceptance-bar file the board imports.
- **Mailbox** — the append-only message channel; **notify/inbox** the send/read tools.
- **Gate** — the §6 sequence guarding irreversible actions.
- **Reproduce / verified** — Readiness re-deriving proof itself; the only path to `verified`.
- **Proof triad** — operator proof / readiness reproduction / owner acceptance.
- **Three-state truth** — configured ≠ proven ≠ deferred.
- **Decision card** — the single-question escalation to the Owner.
- **Heartbeat** — the recurring mailbox-poll loop; silent when empty.
- **Two lamps, one wick** — the ethos: two agents, one purpose, neither diminished.

---

## 11. Reference implementation

Hamodia launch (`~/Desktop/Hamodia/hamodia-site`): `docs/launch-gate/GATE_PROTOCOL.md`, `public/parallel-status/launch-readiness-board.json` (Operator), `launch-readiness-criteria.claude.json` (Readiness), `scripts/agent-comms/{notify,inbox}.mjs`, `agent-comms.json` mailbox, Claude cron `*/5 * * * *` + Codex heartbeat.

*Operator drives the operation. Readiness owns the word "ready." Owner authorizes release. The board rules. — Two lamps, one wick.* 🕯️
