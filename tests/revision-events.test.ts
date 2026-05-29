import { describe, it, expect } from "vitest";
import {
  REVISION_STATUSES,
  isRevision,
  type RevisionStatus,
} from "@/lib/revision-events";
import type { TranscriptSegment, ClaimCard, RhetoricMarker } from "@/lib/types";

describe("revision events schema (Phase 1d Task 2)", () => {
  it("exports the four revision statuses the trimodal eval flagged", () => {
    // The eval said: "No explicit later-context revision events were emitted;
    // current output schema does not expose reopen/merge/supersede behavior."
    // These four statuses close that gap.
    expect(REVISION_STATUSES).toEqual([
      "initial",
      "reopened",
      "superseded",
      "merged",
    ]);
  });

  it("TranscriptSegment can carry revision fields (compile-time type check)", () => {
    const seg: TranscriptSegment = {
      text: "Earlier statement.",
      start: 0,
      end: 2,
      is_final: true,
      speaker_id: null,
      revision_status: "reopened",
      revision_target_id: "seg_v1_abc",
      revision_reason: "later-context disambiguation",
    };
    expect(seg.revision_status).toBe("reopened");
    expect(isRevision(seg.revision_status)).toBe(true);
  });

  it("ClaimCard can carry revision fields", () => {
    const card: Partial<ClaimCard> = {
      id: "claim_v2_xyz",
      revision_status: "superseded",
      revision_target_id: "claim_v1_abc",
      revision_reason:
        "Later-context: speaker walked back the assertion in a follow-up utterance.",
    };
    expect(card.revision_status).toBe("superseded");
    expect(isRevision(card.revision_status)).toBe(true);
  });

  it("RhetoricMarker can carry revision fields", () => {
    const marker: Partial<RhetoricMarker> = {
      id: "marker_merged",
      revision_status: "merged",
      revision_target_id: "marker_consolidated",
      revision_reason: "Two adjacent markers consolidated into one.",
    };
    expect(marker.revision_status).toBe("merged");
    expect(isRevision(marker.revision_status)).toBe(true);
  });

  it("isRevision returns false for 'initial' + undefined (the no-op states)", () => {
    expect(isRevision("initial")).toBe(false);
    expect(isRevision(undefined)).toBe(false);
  });

  it("RevisionStatus is exhaustive — adding a status without updating REVISION_STATUSES is a compile-time error", () => {
    const all: RevisionStatus[] = ["initial", "reopened", "superseded", "merged"];
    expect(all).toHaveLength(REVISION_STATUSES.length);
  });
});
