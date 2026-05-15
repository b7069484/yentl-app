import { describe, it, expect } from "vitest";
import type { ClaimCard, RhetoricMarker, Speaker, TranscriptSegment } from "@/lib/types";
import {
  countClaimsByBucket,
  claimsSegments,
  countMarkersByType,
  markersSegments,
  computeSpeakerShares,
  speakerSegments,
  formatDuration,
  topicSegments,
  recentActivityEvents,
} from "@/lib/client/overview-selectors";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeClaim(
  overrides: Partial<ClaimCard> & Pick<ClaimCard, "primary_label" | "status">,
): ClaimCard {
  return {
    id: "c-" + Math.random(),
    claim_text: "Some claim text",
    utterance_start: 10,
    utterance_end: 20,
    speaker_id: 0,
    topic: "politics",
    topic_secondary: null,
    score: 50,
    annotations: [],
    explanation: "",
    sources: [],
    ...overrides,
  };
}

function makeMarker(overrides: Partial<RhetoricMarker>): RhetoricMarker {
  return {
    id: "m-" + Math.random(),
    type: "fallacy",
    name: "slippery-slope",
    display: "Slippery Slope",
    excerpt: "If we allow X then everything falls apart",
    speaker_id: 0,
    start_time: 15,
    end_time: 20,
    severity: "clear",
    explanation: "",
    ...overrides,
  };
}

// ─── countClaimsByBucket ──────────────────────────────────────────────────────

describe("countClaimsByBucket – empty", () => {
  it("returns all zeroes for empty input", () => {
    const c = countClaimsByBucket([]);
    expect(c).toEqual({ trueCount: 0, partialCount: 0, falseCount: 0, otherCount: 0 });
  });
});

describe("countClaimsByBucket – TRUE bucket", () => {
  it("counts TRUE as trueCount", () => {
    const c = countClaimsByBucket([makeClaim({ primary_label: "TRUE", status: "confirmed" })]);
    expect(c.trueCount).toBe(1);
  });

  it("counts MOSTLY_TRUE as trueCount", () => {
    const c = countClaimsByBucket([makeClaim({ primary_label: "MOSTLY_TRUE", status: "provisional" })]);
    expect(c.trueCount).toBe(1);
  });
});

describe("countClaimsByBucket – PARTIAL bucket", () => {
  it("counts PARTIAL as partialCount", () => {
    const c = countClaimsByBucket([makeClaim({ primary_label: "PARTIAL", status: "confirmed" })]);
    expect(c.partialCount).toBe(1);
  });

  it("counts MISLEADING as partialCount", () => {
    const c = countClaimsByBucket([makeClaim({ primary_label: "MISLEADING", status: "confirmed" })]);
    expect(c.partialCount).toBe(1);
  });

  it("counts OMISSION as partialCount", () => {
    const c = countClaimsByBucket([makeClaim({ primary_label: "OMISSION", status: "confirmed" })]);
    expect(c.partialCount).toBe(1);
  });
});

describe("countClaimsByBucket – FALSE bucket", () => {
  it("counts FALSE as falseCount", () => {
    const c = countClaimsByBucket([makeClaim({ primary_label: "FALSE", status: "confirmed" })]);
    expect(c.falseCount).toBe(1);
  });
});

describe("countClaimsByBucket – OTHER bucket", () => {
  it("counts UNVERIFIABLE as otherCount", () => {
    const c = countClaimsByBucket([makeClaim({ primary_label: "UNVERIFIABLE", status: "confirmed" })]);
    expect(c.otherCount).toBe(1);
  });

  it("counts OPINION as otherCount", () => {
    const c = countClaimsByBucket([makeClaim({ primary_label: "OPINION", status: "confirmed" })]);
    expect(c.otherCount).toBe(1);
  });
});

describe("countClaimsByBucket – checking excluded", () => {
  it("excludes claims with status=checking from all counts", () => {
    const c = countClaimsByBucket([
      makeClaim({ primary_label: "TRUE", status: "checking" }),
      makeClaim({ primary_label: "FALSE", status: "checking" }),
    ]);
    expect(c).toEqual({ trueCount: 0, partialCount: 0, falseCount: 0, otherCount: 0 });
  });

  it("counts only terminal claims when mixed with checking", () => {
    const c = countClaimsByBucket([
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
      makeClaim({ primary_label: "FALSE", status: "checking" }),
    ]);
    expect(c.trueCount).toBe(1);
    expect(c.falseCount).toBe(0);
  });
});

// ─── claimsSegments ───────────────────────────────────────────────────────────

describe("claimsSegments", () => {
  it("returns 4 segments in the correct order (true/partial/false/other)", () => {
    const segs = claimsSegments({ trueCount: 3, partialCount: 1, falseCount: 2, otherCount: 1 });
    expect(segs).toHaveLength(4);
    expect(segs[0].colorClass).toBe("bg-green");
    expect(segs[1].colorClass).toBe("bg-orange");
    expect(segs[2].colorClass).toBe("bg-red");
  });

  it("sets flex values matching counts", () => {
    const segs = claimsSegments({ trueCount: 5, partialCount: 2, falseCount: 1, otherCount: 0 });
    expect(segs[0].flex).toBe(5);
    expect(segs[1].flex).toBe(2);
    expect(segs[2].flex).toBe(1);
    expect(segs[3].flex).toBe(0);
  });

  it("returns zero-flex segments (MetricTile filters them)", () => {
    const segs = claimsSegments({ trueCount: 3, partialCount: 0, falseCount: 0, otherCount: 0 });
    const zeroFlex = segs.filter((s) => s.flex === 0);
    expect(zeroFlex).toHaveLength(3);
  });
});

// ─── countMarkersByType ───────────────────────────────────────────────────────

describe("countMarkersByType – empty", () => {
  it("returns all zeroes for empty input", () => {
    const c = countMarkersByType([]);
    expect(c).toEqual({ fallacyCount: 0, biasCount: 0, rhetoricCount: 0 });
  });
});

describe("countMarkersByType", () => {
  it("counts fallacy markers", () => {
    const c = countMarkersByType([makeMarker({ type: "fallacy" }), makeMarker({ type: "fallacy" })]);
    expect(c.fallacyCount).toBe(2);
  });

  it("counts bias markers", () => {
    const c = countMarkersByType([makeMarker({ type: "bias" })]);
    expect(c.biasCount).toBe(1);
  });

  it("counts rhetoric markers", () => {
    const c = countMarkersByType([makeMarker({ type: "rhetoric" })]);
    expect(c.rhetoricCount).toBe(1);
  });
});

// ─── markersSegments ──────────────────────────────────────────────────────────

describe("markersSegments", () => {
  it("returns 3 segments: fallacy/bias/rhetoric in that order", () => {
    const segs = markersSegments({ fallacyCount: 3, biasCount: 2, rhetoricCount: 1 });
    expect(segs).toHaveLength(3);
    expect(segs[0].colorClass).toBe("bg-purple");
    expect(segs[0].flex).toBe(3);
    expect(segs[1].flex).toBe(2);
    expect(segs[2].flex).toBe(1);
  });
});

// ─── computeSpeakerShares ─────────────────────────────────────────────────────

describe("computeSpeakerShares – empty", () => {
  it("returns [] when speakers array is empty", () => {
    expect(computeSpeakerShares([], [])).toEqual([]);
  });

  it("returns [] when there are speakers but no transcript segments", () => {
    const speakers: Speaker[] = [{ id: 0, label: "Speaker 1" }];
    expect(computeSpeakerShares([], speakers)).toEqual([]);
  });

  it("returns [] when all segments have null speaker_id", () => {
    const speakers: Speaker[] = [{ id: 0, label: "Speaker 1" }];
    const transcript: TranscriptSegment[] = [
      { text: "hello world", start: 0, end: 1, is_final: true, speaker_id: null },
    ];
    expect(computeSpeakerShares(transcript, speakers)).toEqual([]);
  });
});

describe("computeSpeakerShares – single speaker", () => {
  it("returns 100% for a single speaker with all utterances", () => {
    const speakers: Speaker[] = [{ id: 0, label: "Alice" }];
    const transcript: TranscriptSegment[] = [
      { text: "hello", start: 0, end: 1, is_final: true, speaker_id: 0 },
    ];
    const shares = computeSpeakerShares(transcript, speakers);
    expect(shares).toHaveLength(1);
    expect(shares[0].pct).toBe(100);
    expect(shares[0].label).toBe("Alice");
  });
});

describe("computeSpeakerShares – two speakers", () => {
  it("computes proportional shares for two speakers", () => {
    const speakers: Speaker[] = [
      { id: 0, label: "Alice" },
      { id: 1, label: "Bob" },
    ];
    // Alice: "aaaa" (4 chars), Bob: "bbbbbbbb" (8 chars) → 12 total, 33% / 67%
    const transcript: TranscriptSegment[] = [
      { text: "aaaa", start: 0, end: 1, is_final: true, speaker_id: 0 },
      { text: "bbbbbbbb", start: 1, end: 2, is_final: true, speaker_id: 1 },
    ];
    const shares = computeSpeakerShares(transcript, speakers);
    expect(shares).toHaveLength(2);
    expect(shares[0].id).toBe(0);
    expect(shares[0].pct).toBe(33);
    expect(shares[1].id).toBe(1);
    expect(shares[1].pct).toBe(67);
  });

  it("a speaker with no utterances gets 0 charCount", () => {
    const speakers: Speaker[] = [
      { id: 0, label: "Alice" },
      { id: 1, label: "Bob" },
    ];
    const transcript: TranscriptSegment[] = [
      { text: "hello world", start: 0, end: 1, is_final: true, speaker_id: 0 },
    ];
    const shares = computeSpeakerShares(transcript, speakers);
    expect(shares).toHaveLength(2);
    const bobShare = shares.find((s) => s.id === 1);
    expect(bobShare?.charCount).toBe(0);
    expect(bobShare?.pct).toBe(0);
  });
});

// ─── speakerSegments ──────────────────────────────────────────────────────────

describe("speakerSegments", () => {
  it("returns one segment per share with correct colorClass", () => {
    const shares = [
      { id: 0, label: "Alice", charCount: 100, pct: 60 },
      { id: 1, label: "Bob", charCount: 66, pct: 40 },
    ];
    const segs = speakerSegments(shares);
    expect(segs).toHaveLength(2);
    expect(segs[0].colorClass).toBe("bg-spk-1"); // (0 % 6) + 1 = 1
    expect(segs[1].colorClass).toBe("bg-spk-2"); // (1 % 6) + 1 = 2
    expect(segs[0].flex).toBe(60);
  });

  it("wraps speaker id color correctly at id=5 → bg-spk-6", () => {
    const shares = [{ id: 5, label: "Eve", charCount: 10, pct: 100 }];
    const segs = speakerSegments(shares);
    expect(segs[0].colorClass).toBe("bg-spk-6");
  });

  it("wraps speaker id color correctly at id=6 → bg-spk-1", () => {
    const shares = [{ id: 6, label: "Frank", charCount: 10, pct: 100 }];
    const segs = speakerSegments(shares);
    expect(segs[0].colorClass).toBe("bg-spk-1");
  });
});

// ─── formatDuration ───────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("0ms → '00:00'", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("negative → '00:00'", () => {
    expect(formatDuration(-5000)).toBe("00:00");
  });

  it("65000ms → '01:05'", () => {
    expect(formatDuration(65000)).toBe("01:05");
  });

  it("3600000ms (1h) → '1:00:00'", () => {
    expect(formatDuration(3600000)).toBe("1:00:00");
  });

  it("3661000ms (1h 1m 1s) → '1:01:01'", () => {
    expect(formatDuration(3661000)).toBe("1:01:01");
  });

  it("59999ms → '00:59'", () => {
    expect(formatDuration(59999)).toBe("00:59");
  });
});

// ─── topicSegments ────────────────────────────────────────────────────────────

describe("topicSegments – empty", () => {
  it("returns [] for empty claims", () => {
    expect(topicSegments([])).toEqual([]);
  });
});

describe("topicSegments – grouping", () => {
  it("groups by topic case-insensitively", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Climate" }),
      makeClaim({ primary_label: "FALSE", status: "confirmed", topic: "climate" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "CLIMATE" }),
    ];
    const segs = topicSegments(claims);
    expect(segs).toHaveLength(1);
    expect(segs[0].count).toBe(3);
  });

  it("sorts descending by count", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Economy" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Climate" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Climate" }),
    ];
    const segs = topicSegments(claims);
    expect(segs[0].count).toBeGreaterThanOrEqual(segs[1].count);
  });

  it("displays topic in UPPERCASE", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "climate" }),
    ];
    const segs = topicSegments(claims);
    expect(segs[0].topic).toBe("CLIMATE");
  });
});

describe("topicSegments – colors", () => {
  it("assigns teal color to the first topic", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Climate" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Climate" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Economy" }),
    ];
    const segs = topicSegments(claims);
    // Climate should be first (2 claims); Economy second (1 claim)
    expect(segs[0].colorClass).toBe("bg-teal-soft");
    expect(segs[0].textColorClass).toBe("text-teal-2");
  });

  it("assigns purple color to the second topic", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Climate" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Climate" }),
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Economy" }),
    ];
    const segs = topicSegments(claims);
    expect(segs[1].colorClass).toBe("bg-purple-soft");
  });

  it("assigns fallback cream color to the 4th+ topic", () => {
    const topics = ["A", "B", "C", "D"];
    const claims = topics.map((t) =>
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: t }),
    );
    const segs = topicSegments(claims);
    expect(segs[3].colorClass).toBe("bg-cream-2");
    expect(segs[3].textColorClass).toBe("text-ink-3");
  });
});

describe("topicSegments – excludes null/empty topics", () => {
  it("skips claims with empty string topic", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "" }),
    ];
    const segs = topicSegments(claims);
    expect(segs).toHaveLength(0);
  });
});

// ─── recentActivityEvents ─────────────────────────────────────────────────────

describe("recentActivityEvents – empty", () => {
  it("returns [] for all-empty inputs", () => {
    expect(recentActivityEvents([], [], [], 6)).toEqual([]);
  });
});

describe("recentActivityEvents – checking claims excluded", () => {
  it("excludes claims with status=checking", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "checking", utterance_start: 10 }),
    ];
    const events = recentActivityEvents(claims, [], [], 6);
    expect(events).toHaveLength(0);
  });
});

describe("recentActivityEvents – terminal claims included", () => {
  it("includes provisional claims", () => {
    const claims = [
      makeClaim({ primary_label: "FALSE", status: "provisional", utterance_start: 5 }),
    ];
    const events = recentActivityEvents(claims, [], [], 6);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("claim");
  });

  it("includes confirmed claims", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", utterance_start: 5 }),
    ];
    const events = recentActivityEvents(claims, [], [], 6);
    expect(events).toHaveLength(1);
  });
});

describe("recentActivityEvents – markers always included", () => {
  it("includes all markers regardless of state", () => {
    const markers = [makeMarker({ start_time: 10 }), makeMarker({ start_time: 20 })];
    const events = recentActivityEvents([], markers, [], 6);
    expect(events).toHaveLength(2);
    expect(events[0].kind).toBe("marker");
  });
});

describe("recentActivityEvents – sort order", () => {
  it("sorts events descending by ts (most recent first)", () => {
    const claims = [
      makeClaim({ id: "c1", primary_label: "TRUE", status: "confirmed", utterance_start: 5 }),
      makeClaim({ id: "c2", primary_label: "FALSE", status: "confirmed", utterance_start: 30 }),
    ];
    const events = recentActivityEvents(claims, [], [], 6);
    expect(events[0].ts).toBeGreaterThan(events[1].ts);
  });

  it("interleaves claims and markers sorted desc by ts", () => {
    const claims = [
      makeClaim({ id: "c1", primary_label: "TRUE", status: "confirmed", utterance_start: 10 }),
    ];
    const markers = [makeMarker({ id: "m1", start_time: 25 })];
    const events = recentActivityEvents(claims, markers, [], 6);
    // marker at ts=25 comes before claim at ts=10
    expect(events[0].id).toBe("m1");
    expect(events[1].id).toBe("c1");
  });
});

describe("recentActivityEvents – limit", () => {
  it("respects the limit parameter", () => {
    const claims = Array.from({ length: 10 }, (_, i) =>
      makeClaim({
        id: `c${i}`,
        primary_label: "TRUE",
        status: "confirmed",
        utterance_start: i,
      }),
    );
    const events = recentActivityEvents(claims, [], [], 3);
    expect(events).toHaveLength(3);
  });
});

describe("recentActivityEvents – speaker label resolution", () => {
  it("resolves speaker label from speakers array", () => {
    const speakers: Speaker[] = [{ id: 0, label: "Alice" }];
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", speaker_id: 0 }),
    ];
    const events = recentActivityEvents(claims, [], speakers, 6);
    const claimEvent = events[0];
    expect(claimEvent.kind).toBe("claim");
    if (claimEvent.kind === "claim") {
      expect(claimEvent.speakerLabel).toBe("Alice");
    }
  });

  it("falls back to 'Unknown' for null speaker_id", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", speaker_id: null }),
    ];
    const events = recentActivityEvents(claims, [], [], 6);
    expect(events[0].speakerLabel).toBe("Unknown");
  });

  it("falls back to 'Unknown' for speaker_id not in speakers list", () => {
    const speakers: Speaker[] = [{ id: 0, label: "Alice" }];
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", speaker_id: 99 }),
    ];
    const events = recentActivityEvents(claims, [], speakers, 6);
    expect(events[0].speakerLabel).toBe("Unknown");
  });
});

describe("recentActivityEvents – quote truncation", () => {
  it("truncates claim_text longer than 140 chars with '…'", () => {
    const longText = "A".repeat(141);
    const claims = [
      makeClaim({
        primary_label: "TRUE",
        status: "confirmed",
        claim_text: longText,
        utterance_start: 5,
      }),
    ];
    const events = recentActivityEvents(claims, [], [], 6);
    expect(events[0].quote.endsWith("…")).toBe(true);
    expect(events[0].quote.length).toBe(141); // 140 chars + "…"
  });

  it("does not truncate claim_text of exactly 140 chars", () => {
    const exactText = "B".repeat(140);
    const claims = [
      makeClaim({
        primary_label: "TRUE",
        status: "confirmed",
        claim_text: exactText,
        utterance_start: 5,
      }),
    ];
    const events = recentActivityEvents(claims, [], [], 6);
    expect(events[0].quote).toBe(exactText);
    expect(events[0].quote.endsWith("…")).toBe(false);
  });

  it("truncates marker excerpt longer than 140 chars with '…'", () => {
    const longExcerpt = "C".repeat(141);
    const markers = [makeMarker({ excerpt: longExcerpt, start_time: 5 })];
    const events = recentActivityEvents([], markers, [], 6);
    expect(events[0].quote.endsWith("…")).toBe(true);
  });
});

describe("recentActivityEvents – score rounding", () => {
  it("rounds claim score to integer", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", score: 73.7 }),
    ];
    const events = recentActivityEvents(claims, [], [], 6);
    const ev = events[0];
    if (ev.kind === "claim") {
      expect(Number.isInteger(ev.score)).toBe(true);
      expect(ev.score).toBe(74);
    }
  });
});
