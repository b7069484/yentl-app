import { describe, it, expect } from "vitest";
import type { ClaimCard, RhetoricMarker } from "@/lib/types";
import { claimSiblings, markerSiblings } from "@/lib/client/sibling-nav";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "c-" + Math.random(),
    claim_text: "Some claim",
    utterance_start: 10,
    utterance_end: 20,
    speaker_id: 0,
    topic: "politics",
    topic_secondary: null,
    primary_label: "TRUE",
    score: 50,
    annotations: [],
    explanation: "",
    status: "confirmed",
    sources: [],
    ...overrides,
  };
}

function makeMarker(overrides: Partial<RhetoricMarker> = {}): RhetoricMarker {
  return {
    id: "m-" + Math.random(),
    type: "fallacy",
    name: "slippery-slope",
    display: "Slippery Slope",
    excerpt: "If we allow X...",
    speaker_id: 0,
    start_time: 15,
    end_time: 20,
    severity: "clear",
    explanation: "",
    ...overrides,
  };
}

// ─── claimSiblings ────────────────────────────────────────────────────────────

describe("claimSiblings", () => {
  it("empty claims → prev null, next null, index -1, total 0", () => {
    const result = claimSiblings([], "nonexistent", null);
    expect(result).toEqual({ prev: null, next: null, index: -1, total: 0 });
  });

  it("single claim, current is it → prev null, next null, index 0, total 1", () => {
    const c = makeClaim({ id: "c-only" });
    const result = claimSiblings([c], "c-only", null);
    expect(result).toEqual({ prev: null, next: null, index: 0, total: 1 });
  });

  it("3 claims, current is middle → correct prev and next", () => {
    // utterance_start descending so "recent" sort produces: c3 > c2 > c1
    const c1 = makeClaim({ id: "c1", utterance_start: 10 });
    const c2 = makeClaim({ id: "c2", utterance_start: 20 });
    const c3 = makeClaim({ id: "c3", utterance_start: 30 });
    // pool after "recent" sort: [c3, c2, c1]
    const result = claimSiblings([c1, c2, c3], "c2", null);
    expect(result.prev).toBe("c3");
    expect(result.next).toBe("c1");
    expect(result.index).toBe(1);
    expect(result.total).toBe(3);
  });

  it("current is first in pool → prev null", () => {
    const c1 = makeClaim({ id: "c1", utterance_start: 10 });
    const c2 = makeClaim({ id: "c2", utterance_start: 20 });
    // "recent" sort: [c2, c1]; c2 is first
    const result = claimSiblings([c1, c2], "c2", null);
    expect(result.prev).toBeNull();
    expect(result.next).toBe("c1");
  });

  it("current is last in pool → next null", () => {
    const c1 = makeClaim({ id: "c1", utterance_start: 10 });
    const c2 = makeClaim({ id: "c2", utterance_start: 20 });
    // "recent" sort: [c2, c1]; c1 is last
    const result = claimSiblings([c1, c2], "c1", null);
    expect(result.prev).toBe("c2");
    expect(result.next).toBeNull();
  });

  it("unknown id → index -1, total reflects full pool", () => {
    const c1 = makeClaim({ id: "c1" });
    const c2 = makeClaim({ id: "c2" });
    const result = claimSiblings([c1, c2], "not-there", null);
    expect(result.index).toBe(-1);
    expect(result.total).toBe(2);
    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
  });

  it("fromQuery with verdict:false filters pool to only FALSE claims", () => {
    const cTrue = makeClaim({ id: "c-true", primary_label: "TRUE", utterance_start: 30 });
    const cFalse1 = makeClaim({ id: "c-false-1", primary_label: "FALSE", utterance_start: 20 });
    const cFalse2 = makeClaim({ id: "c-false-2", primary_label: "FALSE", utterance_start: 10 });
    const fromQuery = new URLSearchParams("verdict=false");
    // applyClaimFilters keeps only FALSE; "checking" is also filtered but these are "confirmed"
    const result = claimSiblings(
      [cTrue, cFalse1, cFalse2],
      "c-false-1",
      fromQuery,
    );
    // pool should be [c-false-1, c-false-2] after "recent" sort (start 20 > 10)
    expect(result.total).toBe(2);
    expect(result.prev).toBeNull(); // first in pool
    expect(result.next).toBe("c-false-2");
  });

  it("fromQuery with verdict:false excludes checking claims (applyClaimFilters contract)", () => {
    const cFalseChecking = makeClaim({
      id: "c-checking",
      primary_label: "FALSE",
      status: "checking",
    });
    const cFalseConfirmed = makeClaim({
      id: "c-confirmed",
      primary_label: "FALSE",
      status: "confirmed",
    });
    const fromQuery = new URLSearchParams("verdict=false");
    const result = claimSiblings(
      [cFalseChecking, cFalseConfirmed],
      "c-confirmed",
      fromQuery,
    );
    expect(result.total).toBe(1); // checking is excluded
    expect(result.index).toBe(0);
  });
});

// ─── markerSiblings ───────────────────────────────────────────────────────────

describe("markerSiblings", () => {
  it("empty markers → prev null, next null, index -1, total 0", () => {
    const result = markerSiblings([], "nonexistent", null);
    expect(result).toEqual({ prev: null, next: null, index: -1, total: 0 });
  });

  it("single marker, current is it → prev null, next null, index 0, total 1", () => {
    const m = makeMarker({ id: "m-only" });
    const result = markerSiblings([m], "m-only", null);
    expect(result).toEqual({ prev: null, next: null, index: 0, total: 1 });
  });

  it("3 markers, current is middle → correct prev and next", () => {
    // start_time descending so "recent" sort: m3 > m2 > m1
    const m1 = makeMarker({ id: "m1", start_time: 10 });
    const m2 = makeMarker({ id: "m2", start_time: 20 });
    const m3 = makeMarker({ id: "m3", start_time: 30 });
    const result = markerSiblings([m1, m2, m3], "m2", null);
    expect(result.prev).toBe("m3");
    expect(result.next).toBe("m1");
    expect(result.index).toBe(1);
    expect(result.total).toBe(3);
  });

  it("current is first → prev null", () => {
    const m1 = makeMarker({ id: "m1", start_time: 10 });
    const m2 = makeMarker({ id: "m2", start_time: 20 });
    // "recent" sort: [m2, m1]; m2 is first
    const result = markerSiblings([m1, m2], "m2", null);
    expect(result.prev).toBeNull();
    expect(result.next).toBe("m1");
  });

  it("current is last → next null", () => {
    const m1 = makeMarker({ id: "m1", start_time: 10 });
    const m2 = makeMarker({ id: "m2", start_time: 20 });
    // "recent" sort: [m2, m1]; m1 is last
    const result = markerSiblings([m1, m2], "m1", null);
    expect(result.prev).toBe("m2");
    expect(result.next).toBeNull();
  });

  it("fromQuery with type:fallacy filters pool to fallacy markers only", () => {
    const mFallacy = makeMarker({ id: "m-fallacy", type: "fallacy", start_time: 20 });
    const mBias = makeMarker({ id: "m-bias", type: "bias", start_time: 30 });
    const fromQuery = new URLSearchParams("type=fallacy");
    const result = markerSiblings([mFallacy, mBias], "m-fallacy", fromQuery);
    expect(result.total).toBe(1);
    expect(result.index).toBe(0);
    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
  });

  it("fromQuery with type:bias filters so fallacy marker is outside pool", () => {
    const mFallacy = makeMarker({ id: "m-fallacy", type: "fallacy", start_time: 20 });
    const mBias1 = makeMarker({ id: "m-bias-1", type: "bias", start_time: 30 });
    const mBias2 = makeMarker({ id: "m-bias-2", type: "bias", start_time: 10 });
    const fromQuery = new URLSearchParams("type=bias");
    const result = markerSiblings(
      [mFallacy, mBias1, mBias2],
      "m-bias-1",
      fromQuery,
    );
    // pool: [m-bias-1, m-bias-2] after "recent" sort
    expect(result.total).toBe(2);
    expect(result.prev).toBeNull();
    expect(result.next).toBe("m-bias-2");
  });
});
