/**
 * Phase 1d Task 2 — revision-event schema. The trimodal eval at
 * `agent-work/yentl-trimodal-evaluation/runs/2026-05-28T21-35-11-581Z/report.md`
 * flagged on every candidate: "No explicit later-context revision events
 * were emitted; current output schema does not expose reopen/merge/
 * supersede behavior."
 *
 * Without these events, when later context legitimately changes an earlier
 * verdict, marker, or transcript segment, the system silently overwrites the
 * prior version — losing the audit trail and the user-visible "we changed our
 * mind because…" surface. The four statuses below close that gap:
 *
 *   initial      — first-pass result; no prior version
 *   reopened     — a previously-finalized item is being re-evaluated; the
 *                  prior version's id is in `revision_target_id`
 *   superseded   — this item is being replaced by a newer one
 *                  (`revision_target_id` points to the replacement)
 *   merged       — this item was consolidated with one or more siblings into
 *                  a single canonical record (`revision_target_id` points
 *                  to the merged record)
 *
 * Producers populate these fields as they ship; consumers (UI, eval, audit
 * surfaces) can render revision history without re-deriving it from
 * timestamps.
 */
export const REVISION_STATUSES = [
  "initial",
  "reopened",
  "superseded",
  "merged",
] as const;

export type RevisionStatus = (typeof REVISION_STATUSES)[number];

/**
 * True when the status represents an actual revision event the UI should
 * surface (not the default-initial / no-revision case).
 */
export function isRevision(status: RevisionStatus | undefined): boolean {
  return status === "reopened" || status === "superseded" || status === "merged";
}
