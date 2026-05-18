# Goal: `yentl-this-week-actions` — operator manual

Instantiated 2026-05-17. Implements the **three "this week" actions** identified in the expansion research §10 Founder Summary, expanded to the minimum coherent ship-set (5 verifiable clauses + 1 git-hygiene clause).

See `ACTIVATION.md` for the project-specific activation runbook.

## Why this goal exists

Per the research, BIPA exposure is **per-recording-per-day** in Illinois (statutory damages $1k–$5k *per recording* under the 2025–2026 voiceprint case wave). Every recording Yentl makes with Deepgram diarization enabled accrues potential damages. **Diarization should be OFF today, not next week.**

The other "this week" items (DPAs, EU endpoint, launch consent modal, recording beacon) are the smallest set that lets Yentl recordings happen lawfully in the EU and US two-party-consent states. Without them, the v1 web app cannot be publicly launched without immediate regulatory + civil exposure.

## Scope vs. other goals

| Concern | Goal |
|---|---|
| Diarization off, EU endpoint, DPAs, consent modal, recording beacon | **this goal** |
| Code-quality + middleware + CI + CHANGELOG | `yentl-hardening-pass` |
| Other compliance components (28 clauses) + trust pages + WCAG audit | `yentl-compliance-foundation` |
| Fact-check pipeline (Tasks 12–26) | NOT a /goal — human + AI builder track |
| Engagement gate (refuses private-individual claims) | Lives with fact-check pipeline (depends on verify-* endpoints) |

## Requirements (verify before activating)

- Claude Code **v2.1.139+** (for `/goal`). `claude --version`.
- `/schedule` mechanism available.
- **Trusted workspace** — run `claude` once in project root and accept trust dialog.

## File layout

```
.goals/yentl-this-week-actions/
├── README.md            # this file
├── ACTIVATION.md        # step-by-step activation runbook
├── GOAL.md              # locked 5+1 clause end condition
├── STATE.md             # worker rewrites each run
├── worker-prompt.md     # cron fires hourly
├── watchdog-prompt.md   # cron fires every 8h (more aggressive than other goals — short wall-clock)
├── decisions.log        # append-only audit
├── guardrails.md        # tight scope: only specific paths
└── alerts.md            # watchdog creates on first issue; kill-switch
```

## Default cadence (more aggressive than hardening — short wall-clock)

- **Worker**: `0 * * * *` — hourly
- **Watchdog**: `0 */8 * * *` — every 8 hours (3× per day; this goal has a 3-day budget)

## Quick reference

| Action | How |
|---|---|
| Check progress | `cat STATE.md` |
| Audit decisions | `tail -50 decisions.log` |
| Check alerts | `cat alerts.md` |
| Pause | Disable both routines |
| Kill switch | `echo STOP > alerts.md` |
| Change cadence | Update cron and re-register |

## Known considerations specific to this goal

- **The worker is allowed to `git commit`** with messages prefixed `this-week:`. Must NOT push to `main`. Push to working branch is fine for CI.
- **Clause 3 (DPA-status doc) is approval-gated** — the worker writes/maintains the doc; humans actually sign the DPAs. Worker MUST NOT attempt to sign or submit any portal form.
- **The worker MUST NOT touch `app/api/deepgram/**`** beyond reading. The JWT mint path is stable.
- **No new top-level dependencies** other than `ulid` (already installed for consent_id generation).
- **Path scope is tight**: worker may only write to the files enumerated in `guardrails.md` "Allowed write targets". Anything else is an approval gate.

## If this goal stalls

The watchdog will flag stalls fast (8h interval). If any single clause won't converge after 3 attempted runs:

- Clauses 1, 2 (diarization + EU endpoint) should be ~30 minutes of work each. If stalling, something is wrong with the codebase assumptions in GOAL.md.
- Clauses 4, 5 (ConsentGate + RecordingBeacon) are larger; if stalling, the right move is usually to split them into their own micro-goals rather than weaken the end condition.
- Clause 3 (DPA-status doc) cannot complete without a human signing the DPAs — but the *doc* can be complete. Watchdog should treat clause 3 as "complete when the doc exists with full structure"; human signing is tracked separately.
