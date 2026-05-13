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

  it("startSession resets speakers and source to defaults", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().setSource({ kind: "audio_file", blob_url: "x", duration_sec: 1, filename: "a.mp3", mime: "audio/mp3" });
    useSession.getState().startSession();
    expect(useSession.getState().speakers).toEqual([]);
    expect(useSession.getState().source).toEqual({ kind: "mic" });
  });
});
