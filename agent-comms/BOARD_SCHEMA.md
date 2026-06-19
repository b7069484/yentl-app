# Status / Readiness Board — Row Schema

> The single canonical board (`board.json`) is **Operator**-written; the acceptance bar lives in a **Readiness**-owned companion (`criteria.<readiness>.json`) that the board imports. This keeps two writers off one file. See `PROTOCOL.md`.

## Top-level

| Field | Meaning |
|-------|---------|
| `board` | identifier, e.g. `"<project>-readiness"` |
| `version` | schema version |
| `roles` | `{ operator, readiness, owner }` |
| `updatedAt` | last update |
| `items` | the rows (below) |

## Row

| Field | Type / enum | Meaning |
|-------|-------------|---------|
| `id` | string | stable id, e.g. `P0-001` |
| `title` | string | short description |
| `severity` | `P0 \| P1 \| P2 \| P3` | P0 = release blocker |
| `owner` | `operator \| readiness \| owner \| shared` | proposed implementer; **sequencing is the Operator's call** |
| `verifier` | string | the Readiness agent (independent reproduction) |
| `files_surfaces` | string[] | files/surfaces touched |
| `protected_surface_touch` | boolean | touches a protected surface (e.g. homepage/approved content)? |
| `live_mutation` | `none \| db \| migration \| payment \| live-send \| deploy \| deploy-config` | kind of irreversible exposure |
| `reversible` | `yes \| partial \| no` | can it be cleanly undone? |
| `rollback_note` | string | how to revert |
| `acceptance_criteria` | string | **the written bar** (Readiness-authored, from the companion) |
| `proof_required` | string[] | evidence needed (test/browser/curl/query) |
| `readiness` | `not-started \| implemented \| verified \| accepted \| deferred` | `implemented`=Operator; `verified`=Readiness (post-reproduction); `accepted/deferred`=Owner only |
| `operator_proof_artifacts` | string[] | operator's proof — "did it build/deploy and behave?" |
| `readiness_reproduction_artifacts` | string[] | Readiness' independent proof — "re-derived against the criterion?" |
| `independently_reproduced` | boolean | **anti-collusion lock** — true only when Readiness personally reproduced |
| `owner_acceptance_status` | `pending \| accepted \| deferred` | product/business decision |
| `deferred_by_owner` | boolean / `deferral_reason` | explicit deferral + why |
| `blocker` | `{ by, failing_criterion, evidence_missing, unblock_action }` \| null | criterion-bound block |
| `next_single_action` | string | the one next step |
| `signoff` | `{ operator, readiness, owner }` | timestamps or null |

**Invariants:**
- `readiness === "verified"` ⇒ `independently_reproduced === true` AND `readiness_reproduction_artifacts` non-empty.
- `readiness === "accepted"` ⇒ `owner_acceptance_status === "accepted"`.

## Blank row

```json
{
  "id": "P0-000", "title": "", "severity": "P1",
  "owner": "shared", "verifier": "<readiness-agent>",
  "files_surfaces": [], "protected_surface_touch": false,
  "live_mutation": "none", "reversible": "yes", "rollback_note": "",
  "acceptance_criteria": "", "proof_required": [],
  "readiness": "not-started",
  "operator_proof_artifacts": [], "readiness_reproduction_artifacts": [],
  "independently_reproduced": false,
  "owner_acceptance_status": "pending", "deferred_by_owner": false, "deferral_reason": "",
  "blocker": null, "next_single_action": "",
  "signoff": { "operator": null, "readiness": null, "owner": null }
}
```
