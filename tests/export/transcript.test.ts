import { describe, expect, it } from "vitest";
import { toTranscriptText } from "@/lib/export/transcript";
import type { Session } from "@/lib/types";

describe("toTranscriptText", () => {
  const session: Session = {
    title: "Council clip",
    started_at: "2026-05-11T10:00:00.000Z",
    ended_at: "2026-05-11T10:05:00.000Z",
    speakers: [
      { id: 0, label: "Moderator" },
      { id: 1, label: "Guest" },
    ],
    source: {
      kind: "youtube",
      video_id: "abc123",
      url: "https://youtu.be/abc123",
      title: "Budget hearing",
    },
    transcript: [
      {
        text: "The audit was never released.",
        start: 0,
        end: 4.25,
        is_final: true,
        speaker_id: 1,
        document_anchor: {
          kind: "paragraph",
          block_index: 0,
          paragraph_index: 2,
          line_start: 6,
          line_end: 6,
        },
      },
      {
        text: "We are still checking that.",
        start: 5,
        end: 7,
        is_final: false,
        speaker_id: null,
      },
    ],
    claims: [],
    markers: [],
  };

  it("renders a timed plain-text transcript with source and speaker context", () => {
    const text = toTranscriptText(session);

    expect(text).toContain("Council clip transcript");
    expect(text).toContain("Started: 2026-05-11T10:00:00.000Z");
    expect(text).toContain("Ended: 2026-05-11T10:05:00.000Z");
    expect(text).toContain("Source: Budget hearing");
    expect(text).toContain("Speakers: Moderator, Guest");
    expect(text).toContain("[0s-4.3s] Guest: The audit was never released.");
    expect(text).toContain("[source: Paragraph 3 · line 6]");
    expect(text).toContain("[5s-7s] Unknown speaker (draft): We are still checking that.");
  });

  it("keeps empty transcripts explicit", () => {
    expect(toTranscriptText({ ...session, transcript: [] })).toContain("(none)");
  });
});
