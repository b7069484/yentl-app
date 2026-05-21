import { describe, expect, it } from "vitest";
import { useSession } from "@/lib/client/session-store";

describe("session store — speakers", () => {
  it("ensureSpeaker is idempotent", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().ensureSpeaker(0);
    expect(useSession.getState().speakers).toHaveLength(1);
    expect(useSession.getState().speakers[0]).toEqual({ id: 0, label: "Speaker 1" });
  });

  it("ensureSpeaker registers multiple distinct ids", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().ensureSpeaker(2);
    expect(useSession.getState().speakers).toEqual([
      { id: 0, label: "Speaker 1" },
      { id: 2, label: "Speaker 3" },
    ]);
  });

  it("renameSpeaker updates the label", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().renameSpeaker(0, "Israel");
    expect(useSession.getState().speakers[0].label).toBe("Israel");
  });

  it("renameSpeaker trims and clamps to 24 chars", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().renameSpeaker(0, "   Israel B. Bitton — Author  ");
    expect(useSession.getState().speakers[0].label.length).toBeLessThanOrEqual(24);
    expect(useSession.getState().speakers[0].label).not.toMatch(/^\s/);
  });

  it("renameSpeaker reverts to default on empty input", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().renameSpeaker(0, "Israel");
    useSession.getState().renameSpeaker(0, "");
    expect(useSession.getState().speakers[0].label).toBe("Speaker 1");
  });

  it("appendFinal idempotently registers segment's speaker", () => {
    useSession.getState().reset();
    useSession.getState().startSession();
    useSession.getState().appendFinal({
      text: "Hi.",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: 0,
    });
    useSession.getState().appendFinal({
      text: "Hello.",
      start: 1,
      end: 2,
      is_final: true,
      speaker_id: 0,
    });
    expect(useSession.getState().speakers).toHaveLength(1);
  });

  it("appendFinal does not register null speaker_id", () => {
    useSession.getState().reset();
    useSession.getState().startSession();
    useSession.getState().appendFinal({
      text: "Hi.",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: null,
    });
    expect(useSession.getState().speakers).toHaveLength(0);
  });

  it("startSession resets speakers but preserves the chosen source", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    const ytSource = { kind: "youtube", video_id: "abc", url: "https://youtu.be/abc" } as const;
    useSession.getState().setSource(ytSource);
    useSession.getState().startSession();
    expect(useSession.getState().speakers).toEqual([]);
    // Source must survive startSession — multi-source ingest depends on it
    expect(useSession.getState().source).toEqual(ytSource);
    // Stage advances to "selected" so the picker doesn't reappear
    expect(useSession.getState().prerecordStage).toBe("selected");
  });

  it("startSession sets truthful recording state by source", () => {
    useSession.getState().reset();
    // mic: should record
    useSession.getState().setSource({ kind: "mic" });
    useSession.getState().startSession();
    expect(useSession.getState().isRecording).toBe(true);

    // browser tab: waiting until the extension confirms capture-start
    useSession.getState().reset();
    useSession.getState().setSource({ kind: "browser_tab" });
    useSession.getState().startSession();
    expect(useSession.getState().isRecording).toBe(false);
    expect(useSession.getState().browserTabStatus.phase).toBe("waiting_for_extension");

    // bulk-loaded source: not "recording"
    useSession.getState().reset();
    useSession.getState().setSource({ kind: "youtube", video_id: "abc", url: "https://youtu.be/abc" });
    useSession.getState().startSession();
    expect(useSession.getState().isRecording).toBe(false);
  });
});

// ── reassignUtterance ─────────────────────────────────────────────────────────

describe("session store — reassignUtterance", () => {
  function seed() {
    useSession.getState().reset();
    useSession.getState().startSession();
    // Two speakers, three segments
    useSession.getState().appendFinal({ text: "Hello.", start: 0,  end: 2,  is_final: true, speaker_id: 0 });
    useSession.getState().appendFinal({ text: "World.", start: 2,  end: 4,  is_final: true, speaker_id: 1 });
    useSession.getState().appendFinal({ text: "Bye.",   start: 4,  end: 6,  is_final: true, speaker_id: 0 });
  }

  it("updates the transcript segment's speaker_id", () => {
    seed();
    useSession.getState().reassignUtterance(1, 0);
    expect(useSession.getState().transcript[1].speaker_id).toBe(0);
  });

  it("is a no-op when the same speaker_id is already assigned", () => {
    seed();
    const before = useSession.getState().transcript.slice();
    useSession.getState().reassignUtterance(0, 0); // already speaker 0
    expect(useSession.getState().transcript).toEqual(before);
  });

  it("is a no-op for out-of-bounds index (negative)", () => {
    seed();
    const before = useSession.getState().transcript.slice();
    useSession.getState().reassignUtterance(-1, 1);
    expect(useSession.getState().transcript).toEqual(before);
  });

  it("is a no-op for out-of-bounds index (too large)", () => {
    seed();
    const before = useSession.getState().transcript.slice();
    useSession.getState().reassignUtterance(99, 1);
    expect(useSession.getState().transcript).toEqual(before);
  });

  it("cascades to claims whose utterance_start matches the segment start", () => {
    seed();
    // Add a claim anchored to segment index 1 (start=2)
    useSession.getState().addClaim({
      id: "c1",
      claim_text: "World claim",
      utterance_start: 2,
      utterance_end: 4,
      speaker_id: 1,
      topic: "test",
      topic_secondary: null,
      primary_label: "TRUE",
      score: 80,
      annotations: [],
      explanation: "",
      status: "confirmed",
      sources: [],
    });
    useSession.getState().reassignUtterance(1, 0);
    expect(useSession.getState().claims[0].speaker_id).toBe(0);
  });

  it("does not cascade to claims with a different utterance_start", () => {
    seed();
    useSession.getState().addClaim({
      id: "c2",
      claim_text: "Other claim",
      utterance_start: 0, // different start
      utterance_end: 2,
      speaker_id: 0,
      topic: "test",
      topic_secondary: null,
      primary_label: "TRUE",
      score: 80,
      annotations: [],
      explanation: "",
      status: "confirmed",
      sources: [],
    });
    useSession.getState().reassignUtterance(1, 0); // reassign segment at start=2
    // claim at start=0 should be untouched
    expect(useSession.getState().claims[0].speaker_id).toBe(0);
  });

  it("cascades to markers whose time range falls within the segment", () => {
    seed();
    useSession.getState().addMarker({
      id: "m1",
      type: "fallacy",
      name: "straw-man",
      display: "Straw Man",
      excerpt: "World.",
      speaker_id: 1,
      start_time: 2.5,
      end_time: 3.8,
      severity: "clear",
      explanation: "",
    });
    useSession.getState().reassignUtterance(1, 0); // segment start=2 end=4
    expect(useSession.getState().markers[0].speaker_id).toBe(0);
  });

  it("does not cascade to markers outside the segment range", () => {
    seed();
    useSession.getState().addMarker({
      id: "m2",
      type: "fallacy",
      name: "straw-man",
      display: "Straw Man",
      excerpt: "Hello.",
      speaker_id: 0,
      start_time: 0.5,
      end_time: 1.5,
      severity: "clear",
      explanation: "",
    });
    useSession.getState().reassignUtterance(1, 1); // segment at start=2 end=4 — marker is in [0,1.5]
    expect(useSession.getState().markers[0].speaker_id).toBe(0); // unchanged
  });

  it("registers the new speaker if not already in the speakers list", () => {
    seed();
    expect(useSession.getState().speakers.some((sp) => sp.id === 5)).toBe(false);
    useSession.getState().reassignUtterance(0, 5);
    expect(useSession.getState().speakers.some((sp) => sp.id === 5)).toBe(true);
  });
});

// ── addNewSpeaker ─────────────────────────────────────────────────────────────

describe("session store — addNewSpeaker", () => {
  it("returns max existing id + 1 and registers the speaker", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().ensureSpeaker(2);
    const newId = useSession.getState().addNewSpeaker();
    expect(newId).toBe(3); // max is 2, so 2+1=3
    expect(useSession.getState().speakers.some((sp) => sp.id === 3)).toBe(true);
  });

  it("returns 0 when there are no speakers yet", () => {
    useSession.getState().reset();
    const newId = useSession.getState().addNewSpeaker();
    expect(newId).toBe(0);
    expect(useSession.getState().speakers.some((sp) => sp.id === 0)).toBe(true);
  });

  it("is idempotent if called twice — second call returns max+1 again", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    const id1 = useSession.getState().addNewSpeaker();
    const id2 = useSession.getState().addNewSpeaker();
    expect(id2).toBe(id1 + 1);
  });
});
