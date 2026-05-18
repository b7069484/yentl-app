# Goal: `yentl-compliance-foundation` — operator manual

Instantiated 2026-05-17. Implements the **launch-grade compliance + trust layer** identified in the expansion research §8 (Requirement → Component) and §10 (Top Risks #2, #6-9), beyond what `yentl-this-week-actions` covers.

See `ACTIVATION.md` for the project-specific activation runbook.

## Why this goal exists

The research identifies 40 v1 UI/UX compliance components. `yentl-this-week-actions` ships **5 of them** (the most urgent — consent modal + recording beacon + Deepgram config). This goal ships the **other 35 v1 items plus the supporting documentation** (trust pages, DPIA, accessibility statement, engagement-gate policy spec).

**Hard deadlines this goal feeds:**

- **2026-06-28** — European Accessibility Act / WCAG 2.2 AA (Group C handles this)
- **2026-08-02** — EU AI Act Article 50 transparency binding for deployers (Groups B + D handle this)
- Continuous — Defamation exposure on AI verdicts (Top Risk #1 — Group F documents the engagement-gate *policy*; runtime implementation is in the fact-check pipeline goal)

## Scope vs. other goals

| Concern | Goal |
|---|---|
| Diarization off, EU endpoint, DPAs, launch consent modal, recording beacon | `yentl-this-week-actions` (urgent) |
| Code-quality + middleware + CI + CHANGELOG (engineering baseline) | `yentl-hardening-pass` |
| **Other 35 v1 compliance components + 6 trust pages + DPIA + accessibility statement + engagement-gate policy** | **this goal** |
| Fact-check pipeline (Tasks 12–26) including engagement-gate runtime | NOT a /goal — human + AI builder track |
| Pre-submission accuracy audit (50T/50F) | Future autonomous /goal (`yentl-accuracy-audit`) |

## Goal structure: 7 groups, 28 clauses

Each group is **split-friendly** — if the watchdog flags that any one group is stalling, the recommended remediation is to spin it out as its own micro-goal rather than weaken the end condition.

| Group | Clauses | Theme | Approx. effort |
|---|---|---|---|
| A | 1–4 | Consent extensions (Pause>End, SessionTimer, TwoPartyDisclosure, AudioRouteDisclosure) | 2-3 days |
| B | 5–6 | AI transparency (AIGeneratedBadge, AIDisclosureFooter) | 1 day |
| C | 7–12 | WCAG 2.2 AA accessibility baseline (skip-to-content, focus rings, touch targets, reduced-motion, aria-live, axe/Lighthouse gate) | 3-5 days |
| D | 13–19 | Trust pages (/about, /methodology, /changelog, /privacy, /terms, /subprocessors, /taxonomy.json) | 3-4 days |
| E | 20–21 | Verdict + report infrastructure scaffold (ReportFlow, VerdictCard triple-encoding) | 2 days |
| F | 22–24 | Documentation (accessibility statement, DPIA, engagement-gate policy) | 2-3 days |
| G | 25–28 | Integration + git hygiene (all tests pass, CHANGELOG updated, README compliance section, clean tree) | 1 day |

**Total estimated effort: ~14-20 dev days.** Budget reflects this: $150, 50 runs, 14 days wall-clock.

## Requirements (verify before activating)

- Claude Code **v2.1.139+** (for `/goal`).
- `/schedule` mechanism available.
- **Trusted workspace** (run `claude` once in project root and accept trust dialog).
- **`yentl-this-week-actions` should be active or complete** — this goal builds on the consent modal + recording beacon it produces. If activated in parallel, work on Groups B-G first; Group A presumes Pause>End refactor is safe (which means SessionHeader changes — coordinate with this-week-actions worker not to step on each other; in practice not a conflict because this-week-actions only touches deepgram + ConsentGate + RecordingBeacon).

## File layout

```
.goals/yentl-compliance-foundation/
├── README.md            # this file
├── ACTIVATION.md        # step-by-step activation runbook
├── GOAL.md              # locked 28-clause end condition
├── STATE.md             # worker rewrites each run
├── worker-prompt.md     # cron fires every 2 hours (slower than this-week-actions)
├── watchdog-prompt.md   # cron fires 9am daily
├── decisions.log        # append-only audit
├── guardrails.md        # allow/deny lists scoped to compliance surface
└── alerts.md            # watchdog creates on first issue; kill-switch
```

## Default cadence

- **Worker**: `0 */2 * * *` — every 2 hours (slower than this-week-actions; this is a marathon, not a sprint)
- **Watchdog**: `0 9 * * *` — 9am daily

## Quick reference

| Action | How |
|---|---|
| Check progress | `cat STATE.md` (look at the per-group checkbox section) |
| Audit decisions | `tail -100 decisions.log` |
| Check alerts | `cat alerts.md` |
| Pause | Disable both routines |
| Kill switch | `echo STOP > alerts.md` |
| Split a stuck group | Stop this goal; instantiate new sub-goals from the template using groups as scope |

## Known considerations

- **The worker is allowed to `git commit`** with messages prefixed `compliance:`. Must NOT push to `main`. Push to working branch is fine for CI.
- **The worker MAY install testing-related dev dependencies** (e.g., `@axe-core/cli` for clause 12) — this is a documented exception in guardrails.md.
- **The worker MUST NOT touch `app/api/deepgram/**`** beyond reading.
- **The worker MUST NOT implement the engagement-gate runtime** (refuses private-individual claims) — that lives with the fact-check pipeline. This goal documents the *policy* in `docs/engagement-gate.md`.
- **The worker MUST NOT build actual VerdictCard data wiring** — Clause 21 is the *triple-encoding component* with all 4 verdict states as static examples. The data layer is in fact-check pipeline goal.
- **Trust page content** (privacy, terms, methodology, etc.) is **substantive** — the worker should pull from the research §7 (regulatory specifics) and §8 (brand voice copy) for accuracy. These pages are public-facing legal surface; copy quality matters.
- **WCAG 2.2 AA gate (clause 12)** is an absolute pass/fail — axe-core exits 0 and Lighthouse a11y ≥95 on home + session pages. The worker should fix accessibility issues until both pass; if a real blocker emerges, escalate via alerts.md.

## If this goal stalls

Per-group split recipes (each becomes a new instantiation of the goal template):

- Group A stalls → `yentl-consent-ux` (4 clauses, $30 budget)
- Group B stalls → already 2 clauses, won't stall
- Group C stalls → `yentl-wcag-baseline` (6 clauses, $40 budget)
- Group D stalls → `yentl-trust-pages` (7 clauses, $50 budget — content-heavy)
- Group E stalls → already 2 clauses, won't stall
- Group F stalls → `yentl-compliance-docs` (3 clauses, $20 budget)

The watchdog will recommend a specific split if it sees a group stalling.
