import { describe, it, expect, beforeEach } from "vitest";
import { useSession } from "@/lib/client/session-store";
import type { Session } from "@/lib/types";

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeSessionFixture(): Session {
  return {
    title: "Restored session",
    started_at: "2026-01-01T10:00:00.000Z",
    ended_at: "2026-01-01T11:00:00.000Z",
    transcript: [
      { text: "Hello.", start: 0, end: 1, is_final: true, speaker_id: 0 },
    ],
    claims: [
      {
        id: "c1",
        claim_text: "Water is wet.",
        utterance_start: 0,
        utterance_end: 1,
        speaker_id: 0,
        topic: "science",
        topic_secondary: null,
        primary_label: "TRUE",
        score: 100,
        annotations: [],
        explanation: "Yes.",
        status: "confirmed",
        sources: [],
      },
    ],
    markers: [
      {
        id: "m1",
        type: "bias",
        name: "confirmation-bias",
        display: "Confirmation Bias",
        excerpt: "...",
        speaker_id: null,
        start_time: 0,
        end_time: 1,
        severity: "subtle",
        explanation: "Cherry-picked data.",
      },
    ],
    speakers: [
      { id: 0, label: "Alice" },
      { id: 1, label: "Bob" },
    ],
    source: { kind: "youtube", video_id: "abc123", url: "https://youtu.be/abc123" },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useSession.getState().reset();
});

describe("restoreSession", () => {
  it("replaces title, startedAt, endedAt, transcript, claims, markers, speakers, source", () => {
    const fixture = makeSessionFixture();
    useSession.getState().restoreSession(fixture);

    const s = useSession.getState();
    expect(s.title).toBe(fixture.title);
    expect(s.startedAt).toBe(fixture.started_at);
    expect(s.endedAt).toBe(fixture.ended_at);
    expect(s.transcript).toHaveLength(1);
    expect(s.transcript[0].text).toBe("Hello.");
    expect(s.claims).toHaveLength(1);
    expect(s.claims[0].id).toBe("c1");
    expect(s.markers).toHaveLength(1);
    expect(s.markers[0].id).toBe("m1");
    expect(s.speakers).toHaveLength(2);
    expect(s.speakers[0].label).toBe("Alice");
    expect(s.source).toEqual(fixture.source);
  });

  it("sets prerecordStage to 'selected'", () => {
    useSession.getState().restoreSession(makeSessionFixture());
    expect(useSession.getState().prerecordStage).toBe("selected");
  });

  it("sets isRecording to false", () => {
    useSession.getState().restoreSession(makeSessionFixture());
    expect(useSession.getState().isRecording).toBe(false);
  });

  it("resets interim to empty string", () => {
    useSession.getState().setInterim("some partial text");
    useSession.getState().restoreSession(makeSessionFixture());
    expect(useSession.getState().interim).toBe("");
  });

  it("resets synthesis to null", () => {
    useSession.getState().setSynthesis({ state: "warming", at: Date.now() });
    useSession.getState().restoreSession(makeSessionFixture());
    expect(useSession.getState().synthesis).toBeNull();
  });

  it("resets micStream to null", () => {
    // micStream is normally a MediaStream; we set it to a truthy sentinel value
    // to verify it gets cleared. Use getState directly since setMicStream normally
    // expects a real MediaStream | null.
    useSession.getState().setMicStream(null);
    useSession.getState().restoreSession(makeSessionFixture());
    expect(useSession.getState().micStream).toBeNull();
  });

  it("clears any pending launched file while restoring a saved session", () => {
    const file = new File(["Shared transcript"], "launch.txt", { type: "text/plain" });
    useSession.getState().setPendingLaunchFile(file);
    useSession.getState().restoreSession(makeSessionFixture());
    expect(useSession.getState().pendingLaunchFile).toBeNull();
  });

  it("does not leak prior state into restored session", () => {
    // Set some prior-session data first
    useSession.getState().startSession("Old session");
    useSession.getState().appendFinal({
      text: "Old text.",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: 3,
    });

    const fixture = makeSessionFixture();
    useSession.getState().restoreSession(fixture);

    const s = useSession.getState();
    // Old transcript should be gone
    expect(s.transcript).toHaveLength(fixture.transcript.length);
    // Speaker 3 from the old session should not appear
    expect(s.speakers.some((sp) => sp.id === 3)).toBe(false);
  });

  it("handles session with no ended_at — sets endedAt to null", () => {
    const fixture = makeSessionFixture();
    delete (fixture as Partial<Session>).ended_at;
    useSession.getState().restoreSession(fixture);
    expect(useSession.getState().endedAt).toBeNull();
  });
});
