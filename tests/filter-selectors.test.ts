import { describe, it, expect } from "vitest";
import type { ClaimCard, RhetoricMarker } from "@/lib/types";
import {
  parseClaimFilters,
  parseMarkerFilters,
  parseSort,
  applyClaimFilters,
  applyMarkerFilters,
  sortClaims,
  sortMarkers,
  describeClaimFilters,
  describeMarkerFilters,
} from "@/lib/client/filter-selectors";
import type { ClaimSort, MarkerSort } from "@/lib/client/filter-selectors";

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

// ─── parseClaimFilters ────────────────────────────────────────────────────────

describe("parseClaimFilters", () => {
  it("parses verdict=false,partial → { verdict: ['FALSE', 'PARTIAL'] }", () => {
    const params = new URLSearchParams("verdict=false,partial");
    const f = parseClaimFilters(params);
    expect(f.verdict).toEqual(["FALSE", "PARTIAL"]);
  });

  it("parses speaker=0,1 → { speaker: [0, 1] }", () => {
    const params = new URLSearchParams("speaker=0,1");
    const f = parseClaimFilters(params);
    expect(f.speaker).toEqual([0, 1]);
  });

  it("parses topic=climate → { topic: 'climate' }", () => {
    const params = new URLSearchParams("topic=climate");
    const f = parseClaimFilters(params);
    expect(f.topic).toBe("climate");
  });

  it("parses status=checking,provisional", () => {
    const params = new URLSearchParams("status=checking,provisional");
    const f = parseClaimFilters(params);
    expect(f.status).toEqual(["checking", "provisional"]);
  });

  it("returns empty object when no params present", () => {
    const params = new URLSearchParams();
    const f = parseClaimFilters(params);
    expect(f.verdict).toBeUndefined();
    expect(f.status).toBeUndefined();
    expect(f.speaker).toBeUndefined();
    expect(f.topic).toBeUndefined();
  });

  it("ignores unknown verdict values", () => {
    const params = new URLSearchParams("verdict=false,nonsense");
    const f = parseClaimFilters(params);
    expect(f.verdict).toEqual(["FALSE"]);
  });

  it("parses verdict with uppercase (url value case-insensitive)", () => {
    const params = new URLSearchParams("verdict=FALSE");
    const f = parseClaimFilters(params);
    expect(f.verdict).toEqual(["FALSE"]);
  });

  it("ignores unknown status values", () => {
    const params = new URLSearchParams("status=checking,done");
    const f = parseClaimFilters(params);
    expect(f.status).toEqual(["checking"]);
  });
});

// ─── parseMarkerFilters ───────────────────────────────────────────────────────

describe("parseMarkerFilters", () => {
  it("parses type=fallacy&severity=blatant,clear", () => {
    const params = new URLSearchParams("type=fallacy&severity=blatant,clear");
    const f = parseMarkerFilters(params);
    expect(f.type).toEqual(["fallacy"]);
    expect(f.severity).toEqual(["blatant", "clear"]);
  });

  it("parses speaker=0,1 → { speaker: [0, 1] }", () => {
    const params = new URLSearchParams("speaker=0,1");
    const f = parseMarkerFilters(params);
    expect(f.speaker).toEqual([0, 1]);
  });

  it("ignores unknown type values", () => {
    const params = new URLSearchParams("type=fallacy,nonsense");
    const f = parseMarkerFilters(params);
    expect(f.type).toEqual(["fallacy"]);
  });

  it("ignores unknown severity values", () => {
    const params = new URLSearchParams("severity=blatant,extreme");
    const f = parseMarkerFilters(params);
    expect(f.severity).toEqual(["blatant"]);
  });
});

// ─── parseSort ────────────────────────────────────────────────────────────────

describe("parseSort", () => {
  const CLAIM_SORTS = ["recent", "score", "speaker", "sources"] as const;
  const MARKER_SORTS = ["recent", "severity", "speaker"] as const;

  it("returns known sort value", () => {
    const params = new URLSearchParams("sort=score");
    expect(parseSort(params, CLAIM_SORTS, "recent")).toBe("score");
  });

  it("returns fallback for unknown sort value", () => {
    const params = new URLSearchParams("sort=nonsense");
    expect(parseSort(params, CLAIM_SORTS, "recent")).toBe("recent");
  });

  it("returns fallback when sort param is absent", () => {
    const params = new URLSearchParams();
    expect(parseSort(params, CLAIM_SORTS, "recent")).toBe("recent");
  });

  it("respects marker sort allowlist", () => {
    const params = new URLSearchParams("sort=severity");
    expect(parseSort(params, MARKER_SORTS, "recent")).toBe("severity");
  });

  it("rejects claim-only sort value for marker context", () => {
    const params = new URLSearchParams("sort=sources");
    // "sources" is not in MARKER_SORTS
    expect(parseSort(params, MARKER_SORTS, "recent")).toBe("recent");
  });
});

// ─── applyClaimFilters ────────────────────────────────────────────────────────

describe("applyClaimFilters", () => {
  it("returns all non-checking claims when filters are empty", () => {
    const claims = [
      makeClaim({ primary_label: "FALSE", status: "confirmed" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
    ];
    const result = applyClaimFilters(claims, {});
    expect(result).toHaveLength(2);
  });

  it("skips claims with status=checking", () => {
    const claims = [
      makeClaim({ primary_label: "FALSE", status: "checking" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
    ];
    const result = applyClaimFilters(claims, {});
    expect(result).toHaveLength(1);
    expect(result[0].primary_label).toBe("TRUE");
  });

  it("includes checking claims when status=checking is explicit", () => {
    const claims = [
      makeClaim({ primary_label: "FALSE", status: "checking" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
    ];
    const result = applyClaimFilters(claims, { status: ["checking"] });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("checking");
  });

  it("filters by status=provisional", () => {
    const claims = [
      makeClaim({ primary_label: "FALSE", status: "provisional" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
    ];
    const result = applyClaimFilters(claims, { status: ["provisional"] });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("provisional");
  });

  it("filters by verdict=FALSE", () => {
    const claims = [
      makeClaim({ primary_label: "FALSE", status: "confirmed" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
    ];
    const result = applyClaimFilters(claims, { verdict: ["FALSE"] });
    expect(result).toHaveLength(1);
    expect(result[0].primary_label).toBe("FALSE");
  });

  it("verdict filter uses OR within array", () => {
    const claims = [
      makeClaim({ primary_label: "FALSE", status: "confirmed" }),
      makeClaim({ primary_label: "PARTIAL", status: "confirmed" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
    ];
    const result = applyClaimFilters(claims, { verdict: ["FALSE", "PARTIAL"] });
    expect(result).toHaveLength(2);
  });

  it("filters by speaker (AND with verdict)", () => {
    const claims = [
      makeClaim({ primary_label: "FALSE", status: "confirmed", speaker_id: 0 }),
      makeClaim({ primary_label: "FALSE", status: "confirmed", speaker_id: 1 }),
    ];
    const result = applyClaimFilters(claims, {
      verdict: ["FALSE"],
      speaker: [0],
    });
    expect(result).toHaveLength(1);
    expect(result[0].speaker_id).toBe(0);
  });

  it("topic filter is case-insensitive", () => {
    const claims = [
      makeClaim({ topic: "Climate", status: "confirmed" }),
      makeClaim({ topic: "politics", status: "confirmed" }),
    ];
    const result = applyClaimFilters(claims, { topic: "climate" });
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("Climate");
  });

  it("excludes claims with null speaker_id when speaker filter active", () => {
    const claims = [
      makeClaim({ speaker_id: null, status: "confirmed" }),
      makeClaim({ speaker_id: 0, status: "confirmed" }),
    ];
    const result = applyClaimFilters(claims, { speaker: [0] });
    expect(result).toHaveLength(1);
    expect(result[0].speaker_id).toBe(0);
  });
});

// ─── applyMarkerFilters ───────────────────────────────────────────────────────

describe("applyMarkerFilters", () => {
  it("returns all markers when filters are empty", () => {
    const markers = [
      makeMarker({ type: "fallacy" }),
      makeMarker({ type: "bias" }),
    ];
    expect(applyMarkerFilters(markers, {})).toHaveLength(2);
  });

  it("filters by type=fallacy", () => {
    const markers = [
      makeMarker({ type: "fallacy" }),
      makeMarker({ type: "bias" }),
    ];
    const result = applyMarkerFilters(markers, { type: ["fallacy"] });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("fallacy");
  });

  it("type filter uses OR within array", () => {
    const markers = [
      makeMarker({ type: "fallacy" }),
      makeMarker({ type: "bias" }),
      makeMarker({ type: "rhetoric" }),
    ];
    const result = applyMarkerFilters(markers, {
      type: ["fallacy", "bias"],
    });
    expect(result).toHaveLength(2);
  });

  it("filters by severity=blatant", () => {
    const markers = [
      makeMarker({ severity: "blatant" }),
      makeMarker({ severity: "subtle" }),
    ];
    const result = applyMarkerFilters(markers, { severity: ["blatant"] });
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("blatant");
  });

  it("filters by speaker", () => {
    const markers = [
      makeMarker({ speaker_id: 0 }),
      makeMarker({ speaker_id: 1 }),
    ];
    const result = applyMarkerFilters(markers, { speaker: [1] });
    expect(result).toHaveLength(1);
    expect(result[0].speaker_id).toBe(1);
  });
});

// ─── sortClaims ───────────────────────────────────────────────────────────────

describe("sortClaims", () => {
  it("recent: sorts by utterance_start descending", () => {
    const claims = [
      makeClaim({ utterance_start: 10 }),
      makeClaim({ utterance_start: 30 }),
      makeClaim({ utterance_start: 5 }),
    ];
    const sorted = sortClaims(claims, "recent");
    expect(sorted[0].utterance_start).toBe(30);
    expect(sorted[2].utterance_start).toBe(5);
  });

  it("score: sorts by score ascending (lower = more false)", () => {
    const claims = [
      makeClaim({ score: 80 }),
      makeClaim({ score: 10 }),
      makeClaim({ score: 50 }),
    ];
    const sorted = sortClaims(claims, "score");
    expect(sorted[0].score).toBe(10);
    expect(sorted[2].score).toBe(80);
  });

  it("speaker: groups by speaker_id ascending", () => {
    const claims = [
      makeClaim({ speaker_id: 2 }),
      makeClaim({ speaker_id: 0 }),
      makeClaim({ speaker_id: 1 }),
    ];
    const sorted = sortClaims(claims, "speaker");
    expect(sorted[0].speaker_id).toBe(0);
    expect(sorted[1].speaker_id).toBe(1);
    expect(sorted[2].speaker_id).toBe(2);
  });

  it("sources: sorts by sources.length descending", () => {
    const mkSource = () => ({
      url: "x",
      domain: "d",
      title: "t",
      reputation_tier: "mid" as const,
      stance: "mixed" as const,
    });
    const claims = [
      makeClaim({ sources: [mkSource()] }),
      makeClaim({ sources: [mkSource(), mkSource(), mkSource()] }),
      makeClaim({ sources: [mkSource(), mkSource()] }),
    ];
    const sorted = sortClaims(claims, "sources");
    expect(sorted[0].sources.length).toBe(3);
    expect(sorted[2].sources.length).toBe(1);
  });

  it("does not mutate the input array", () => {
    const claims = [makeClaim({ utterance_start: 10 }), makeClaim({ utterance_start: 20 })];
    const original = [...claims];
    sortClaims(claims, "recent");
    expect(claims[0].utterance_start).toBe(original[0].utterance_start);
  });
});

// ─── sortMarkers ─────────────────────────────────────────────────────────────

describe("sortMarkers", () => {
  it("recent: sorts by start_time descending", () => {
    const markers = [
      makeMarker({ start_time: 5 }),
      makeMarker({ start_time: 30 }),
      makeMarker({ start_time: 15 }),
    ];
    const sorted = sortMarkers(markers, "recent");
    expect(sorted[0].start_time).toBe(30);
  });

  it("severity: blatant > clear > subtle", () => {
    const markers = [
      makeMarker({ severity: "subtle" }),
      makeMarker({ severity: "blatant" }),
      makeMarker({ severity: "clear" }),
    ];
    const sorted = sortMarkers(markers, "severity");
    expect(sorted[0].severity).toBe("blatant");
    expect(sorted[1].severity).toBe("clear");
    expect(sorted[2].severity).toBe("subtle");
  });

  it("speaker: groups by speaker_id ascending", () => {
    const markers = [
      makeMarker({ speaker_id: 2 }),
      makeMarker({ speaker_id: 0 }),
      makeMarker({ speaker_id: 1 }),
    ];
    const sorted = sortMarkers(markers, "speaker");
    expect(sorted[0].speaker_id).toBe(0);
    expect(sorted[2].speaker_id).toBe(2);
  });
});

// ─── describeClaimFilters ─────────────────────────────────────────────────────

describe("describeClaimFilters", () => {
  const labels: Record<number, string> = { 0: "Alice", 1: "Bob" };

  it("no filters → 'All claims'", () => {
    expect(describeClaimFilters({}, labels)).toBe("All claims");
  });

  it("verdict (single) → 'All FALSE claims'", () => {
    expect(describeClaimFilters({ verdict: ["FALSE"] }, labels)).toBe(
      "All FALSE claims",
    );
  });

  it("verdict (multiple) → 'Claims · FALSE, PARTIAL'", () => {
    expect(
      describeClaimFilters({ verdict: ["FALSE", "PARTIAL"] }, labels),
    ).toBe("Claims · FALSE, PARTIAL");
  });

  it("status only → 'Provisional claims'", () => {
    expect(describeClaimFilters({ status: ["provisional"] }, labels)).toBe(
      "Provisional claims",
    );
  });

  it("speaker only → 'All claims by Alice'", () => {
    expect(describeClaimFilters({ speaker: [0] }, labels)).toBe(
      "All claims by Alice",
    );
  });

  it("verdict + speaker → 'FALSE claims by Alice'", () => {
    expect(
      describeClaimFilters({ verdict: ["FALSE"], speaker: [0] }, labels),
    ).toBe("FALSE claims by Alice");
  });

  it("status + verdict → 'Confirmed FALSE claims'", () => {
    expect(
      describeClaimFilters({ status: ["confirmed"], verdict: ["FALSE"] }, labels),
    ).toBe("Confirmed FALSE claims");
  });

  it("topic only → 'All claims about Climate'", () => {
    expect(describeClaimFilters({ topic: "climate" }, labels)).toBe(
      "All claims about Climate",
    );
  });
});

// ─── describeMarkerFilters ────────────────────────────────────────────────────

describe("describeMarkerFilters", () => {
  const labels: Record<number, string> = { 0: "Alice" };

  it("no filters → 'All markers'", () => {
    expect(describeMarkerFilters({}, labels)).toBe("All markers");
  });

  it("type only → 'All Fallacy markers'", () => {
    expect(describeMarkerFilters({ type: ["fallacy"] }, labels)).toBe(
      "All Fallacy markers",
    );
  });

  it("type + speaker → 'Fallacy markers by Alice'", () => {
    expect(
      describeMarkerFilters({ type: ["fallacy"], speaker: [0] }, labels),
    ).toBe("Fallacy markers by Alice");
  });

  it("severity only → 'All Blatant markers'", () => {
    expect(describeMarkerFilters({ severity: ["blatant"] }, labels)).toBe(
      "All Blatant markers",
    );
  });
});
