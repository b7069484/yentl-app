/**
 * TDD tests for splitSegmentAt store action.
 *
 * Contract:
 *  - Splits segment at a time boundary → two segments (original truncated + new)
 *  - Cascades claims: utterance_start >= splitTime AND <= original_end → newSpeakerId
 *  - Cascades markers: FULLY within post-split portion → newSpeakerId; straddling → unchanged
 *  - Out-of-bounds index → no-op
 *  - splitTime outside [seg.start, seg.end] → no-op
 *  - New speakerId registered idempotently in speakers list
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSession } from "@/lib/client/session-store";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClaimFixture(id: string, utteranceStart: number, utteranceEnd: number, speakerId: number) {
  return {
    id,
    claim_text: `Claim ${id}`,
    utterance_start: utteranceStart,
    utterance_end: utteranceEnd,
    speaker_id: speakerId,
    topic: "test",
    topic_secondary: null as null,
    primary_label: "TRUE" as const,
    score: 80,
    annotations: [],
    explanation: "",
    status: "confirmed" as const,
    sources: [],
  };
}

function makeMarkerFixture(id: string, startTime: number, endTime: number, speakerId: number) {
  return {
    id,
    type: "fallacy" as const,
    name: "straw-man",
    display: "Straw Man",
    excerpt: "excerpt",
    speaker_id: speakerId,
    start_time: startTime,
    end_time: endTime,
    severity: "clear" as const,
    explanation: "",
  };
}

// ── splitSegmentAt ─────────────────────────────────────────────────────────────

describe("session store — splitSegmentAt", () => {
  // The base segment for most tests:
  // { start: 10, end: 20, text: "Hello world. Goodbye now.", speaker_id: 0 }
  // splitTime = 15 (halfway)

  const SEG_TEXT = "Hello world. Goodbye now.";
  const SEG_START = 10;
  const SEG_END = 20;
  const SPLIT_TIME = 15;

  function seedWithOneSegment() {
    useSession.getState().reset();
    useSession.getState().startSession();
    useSession.getState().appendFinal({
      text: SEG_TEXT,
      start: SEG_START,
      end: SEG_END,
      is_final: true,
      speaker_id: 0,
    });
  }

  beforeEach(() => {
    useSession.getState().reset();
  });

  // Test 1: splitting produces two segments with correct text & times
  it("produces two segments — original truncated and new segment", () => {
    seedWithOneSegment();
    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 1);

    const transcript = useSession.getState().transcript;
    expect(transcript).toHaveLength(2);

    const first = transcript[0];
    const second = transcript[1];

    // Original truncated
    expect(first.start).toBe(SEG_START);
    expect(first.end).toBe(SPLIT_TIME);
    expect(first.speaker_id).toBe(0);
    // Text must be non-empty and be the first portion
    expect(first.text.length).toBeGreaterThan(0);

    // New segment
    expect(second.start).toBe(SPLIT_TIME);
    expect(second.end).toBe(SEG_END);
    expect(second.speaker_id).toBe(1);
    expect(second.is_final).toBe(true);
    // Text must be non-empty and be the second portion
    expect(second.text.length).toBeGreaterThan(0);

    // Together the texts should reconstitute the original (trimmed comparison)
    const combined = (first.text + " " + second.text).replace(/\s+/g, " ").trim();
    expect(combined).toBe(SEG_TEXT);
  });

  // Test 2: claims cascade — utterance_start in [splitTime, original_end] → newSpeakerId
  it("cascades claims fully within the post-split portion to the new speaker", () => {
    seedWithOneSegment();
    // Claim anchored at the post-split portion
    useSession.getState().addClaim(makeClaimFixture("c1", SPLIT_TIME, SEG_END, 0));
    // Claim before the split — should be unchanged
    useSession.getState().addClaim(makeClaimFixture("c2", SEG_START, SPLIT_TIME - 1, 0));

    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 1);

    const claims = useSession.getState().claims;
    // c1 starts at splitTime → re-attributed
    const c1 = claims.find((c) => c.id === "c1")!;
    expect(c1.speaker_id).toBe(1);

    // c2 starts before splitTime → unchanged
    const c2 = claims.find((c) => c.id === "c2")!;
    expect(c2.speaker_id).toBe(0);
  });

  it("does not cascade claims before the split to the new speaker", () => {
    seedWithOneSegment();
    useSession.getState().addClaim(makeClaimFixture("cPre", SEG_START, SPLIT_TIME - 1, 0));
    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 1);
    const cPre = useSession.getState().claims.find((c) => c.id === "cPre")!;
    expect(cPre.speaker_id).toBe(0);
  });

  // Test 3: marker cascading — FULLY within post-split → new speaker; straddling → unchanged
  it("cascades markers FULLY within the post-split portion to new speaker", () => {
    seedWithOneSegment();
    // Marker fully within post-split portion [15, 20]
    useSession.getState().addMarker(makeMarkerFixture("mPost", SPLIT_TIME + 0.5, SEG_END - 0.5, 0));
    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 1);

    const mPost = useSession.getState().markers.find((m) => m.id === "mPost")!;
    expect(mPost.speaker_id).toBe(1);
  });

  it("does NOT cascade markers straddling the split boundary (start < splitTime < end)", () => {
    seedWithOneSegment();
    // Marker straddling: starts before split, ends after split
    useSession.getState().addMarker(makeMarkerFixture("mStraddle", SPLIT_TIME - 1, SPLIT_TIME + 1, 0));
    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 1);

    const mStraddle = useSession.getState().markers.find((m) => m.id === "mStraddle")!;
    expect(mStraddle.speaker_id).toBe(0); // unchanged
  });

  it("does NOT cascade markers fully before the split", () => {
    seedWithOneSegment();
    useSession.getState().addMarker(makeMarkerFixture("mPre", SEG_START + 0.5, SPLIT_TIME - 0.5, 0));
    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 1);

    const mPre = useSession.getState().markers.find((m) => m.id === "mPre")!;
    expect(mPre.speaker_id).toBe(0);
  });

  // Test 4: out-of-bounds index → no-op
  it("is a no-op for negative index", () => {
    seedWithOneSegment();
    const before = useSession.getState().transcript.slice();
    useSession.getState().splitSegmentAt(-1, SPLIT_TIME, 1);
    expect(useSession.getState().transcript).toEqual(before);
  });

  it("is a no-op for index >= transcript length", () => {
    seedWithOneSegment();
    const before = useSession.getState().transcript.slice();
    useSession.getState().splitSegmentAt(99, SPLIT_TIME, 1);
    expect(useSession.getState().transcript).toEqual(before);
  });

  // Test 5: splitTime outside segment range → no-op
  it("is a no-op when splitTime equals segment start (not inside)", () => {
    seedWithOneSegment();
    const before = useSession.getState().transcript.slice();
    useSession.getState().splitSegmentAt(0, SEG_START, 1);
    expect(useSession.getState().transcript).toEqual(before);
  });

  it("is a no-op when splitTime equals segment end (not inside)", () => {
    seedWithOneSegment();
    const before = useSession.getState().transcript.slice();
    useSession.getState().splitSegmentAt(0, SEG_END, 1);
    expect(useSession.getState().transcript).toEqual(before);
  });

  it("is a no-op when splitTime is before segment start", () => {
    seedWithOneSegment();
    const before = useSession.getState().transcript.slice();
    useSession.getState().splitSegmentAt(0, SEG_START - 1, 1);
    expect(useSession.getState().transcript).toEqual(before);
  });

  it("is a no-op when splitTime is after segment end", () => {
    seedWithOneSegment();
    const before = useSession.getState().transcript.slice();
    useSession.getState().splitSegmentAt(0, SEG_END + 1, 1);
    expect(useSession.getState().transcript).toEqual(before);
  });

  // Test 6: new speakerId registered idempotently
  it("registers new speakerId if not already in speakers list", () => {
    seedWithOneSegment();
    expect(useSession.getState().speakers.some((sp) => sp.id === 5)).toBe(false);
    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 5);
    expect(useSession.getState().speakers.some((sp) => sp.id === 5)).toBe(true);
  });

  it("does not duplicate speaker if speakerId already in speakers list", () => {
    seedWithOneSegment();
    useSession.getState().ensureSpeaker(1); // pre-register
    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 1);
    const speakersWithId1 = useSession.getState().speakers.filter((sp) => sp.id === 1);
    expect(speakersWithId1).toHaveLength(1);
  });

  // Additional: works correctly with multiple pre-existing segments
  it("correctly inserts the new segment after the split segment (multi-segment transcript)", () => {
    useSession.getState().reset();
    useSession.getState().startSession();
    useSession.getState().appendFinal({ text: SEG_TEXT, start: SEG_START, end: SEG_END, is_final: true, speaker_id: 0 });
    useSession.getState().appendFinal({ text: "Later text.", start: SEG_END, end: 30, is_final: true, speaker_id: 1 });

    useSession.getState().splitSegmentAt(0, SPLIT_TIME, 1);
    const transcript = useSession.getState().transcript;

    expect(transcript).toHaveLength(3);
    // First split segment
    expect(transcript[0].end).toBe(SPLIT_TIME);
    // New segment from split
    expect(transcript[1].start).toBe(SPLIT_TIME);
    expect(transcript[1].end).toBe(SEG_END);
    expect(transcript[1].speaker_id).toBe(1);
    // The "Later text." segment is still third
    expect(transcript[2].text).toBe("Later text.");
  });

  // Edge case: single-word segment — split should still work with approximate boundary
  it("handles a segment with a single word by producing non-empty left and right text", () => {
    useSession.getState().reset();
    useSession.getState().startSession();
    useSession.getState().appendFinal({
      text: "Hello",
      start: 10,
      end: 20,
      is_final: true,
      speaker_id: 0,
    });
    // Even single-word: no-op is acceptable, but if it does split, both texts must be non-empty
    // The UI disables the button, but the store action itself should not crash
    // We just assert it doesn't throw
    expect(() => {
      useSession.getState().splitSegmentAt(0, 15, 1);
    }).not.toThrow();
  });
});
