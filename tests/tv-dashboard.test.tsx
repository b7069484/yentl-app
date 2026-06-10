import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TVDashboard } from "@/components/session/tv-dashboard";
import { useSession } from "@/lib/client/session-store";
import type { Session } from "@/lib/types";

function makeRoomSession(): Session {
  return {
    title: "Council budget hearing",
    started_at: "2026-06-09T01:00:00.000Z",
    transcript: [
      { text: "The audit was hidden from the public.", start: 0, end: 4, is_final: true, speaker_id: 0 },
      { text: "The report was released on Friday.", start: 5, end: 9, is_final: true, speaker_id: 1 },
    ],
    claims: [
      {
        id: "claim-1",
        claim_text: "The audit was hidden from the public.",
        utterance_start: 0,
        utterance_end: 4,
        speaker_id: 0,
        topic: "accountability",
        topic_secondary: null,
        primary_label: "FALSE",
        score: 18,
        annotations: ["Public release log"],
        explanation: "The cited release log contradicts the claim.",
        status: "confirmed",
        sources: [
          {
            url: "https://city.example/audit",
            domain: "city.example",
            title: "Audit release log",
            reputation_tier: "high",
            stance: "contradicts",
            excerpt: "The report was released on Friday.",
          },
          {
            url: "https://local.example/story",
            domain: "local.example",
            title: "Local coverage",
            reputation_tier: "mid",
            stance: "mixed",
            excerpt: "Officials debated when the public received the report.",
          },
        ],
      },
    ],
    markers: [
      {
        id: "marker-1",
        type: "rhetoric",
        name: "loaded-language",
        display: "Loaded Language",
        excerpt: "hidden from the public",
        speaker_id: 0,
        start_time: 0,
        end_time: 4,
        severity: "clear",
        explanation: "Frames a timing dispute as concealment.",
      },
    ],
    speakers: [
      { id: 0, label: "Chair" },
      { id: 1, label: "Clerk" },
    ],
    source: { kind: "mic" },
    synthesis: {
      text: "The room dispute centers on whether an audit was concealed or merely released later than expected.",
      headlines: ["Audit timing drives the disagreement", "One high-reputation source is linked"],
      at: 1_717_900_000_000,
    },
    devil_advocate: {
      stance: "A skeptic would ask whether late visibility is being collapsed into deliberate concealment.",
      strongest_counterarguments: [
        "The audit may have been technically public but hard for ordinary residents to find.",
        "A release log does not prove that all council members received notice before the hearing.",
        "The accusation could be about political transparency rather than the archive timestamp.",
      ],
      weakest_assumption: "The weakest assumption is that public archive timing fully resolves public awareness.",
      questions: [
        "Who received notice when the report was archived?",
        "Was the archive discoverable through ordinary public channels?",
      ],
      confidence: "medium",
      model: "validation-fixture",
      at: 1_717_900_000_001,
    },
  };
}

beforeEach(() => {
  useSession.getState().reset();
});

describe("TVDashboard", () => {
  it("renders an empty room-mode entry state", () => {
    render(<TVDashboard />);

    expect(screen.getByRole("heading", { name: "Open a Yentl session on the big screen." })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Start a session/i })).toHaveAttribute("href", "/session");
    expect(screen.getByRole("link", { name: /Load sample/i })).toHaveAttribute(
      "href",
      "/tv?demo=validation&sample=solo_005",
    );
  });

  it("renders a room-readable current-session display", () => {
    useSession.getState().restoreSession(makeRoomSession());

    const { container } = render(<TVDashboard />);

    expect(screen.getByRole("heading", { name: "Council budget hearing" })).toBeTruthy();
    expect(screen.getByText("Microphone · Review")).toBeTruthy();
    expect(screen.getByText("Yentl's Read")).toBeTruthy();
    expect(screen.getByText(/The room dispute centers/)).toBeTruthy();
    expect(screen.getByText("Counter-read")).toBeTruthy();
    expect(screen.getByText(/late visibility is being collapsed/)).toBeTruthy();
    expect(screen.getByText("Challenge 1")).toBeTruthy();
    expect(screen.getByText(/technically public but hard/)).toBeTruthy();
    expect(screen.getByText("Weakest assumption")).toBeTruthy();
    expect(screen.getByText(/archive timing fully resolves/)).toBeTruthy();
    expect(screen.getByText(/ordinary public channels/)).toBeTruthy();
    expect(screen.getByText("Transcript")).toBeTruthy();
    expect(screen.getByText("Claims")).toBeTruthy();
    expect(screen.getByText("Markers")).toBeTruthy();
    expect(screen.getByText("Sources")).toBeTruthy();
    expect(screen.queryByText("2 high reputation")).toBeNull();
    expect(screen.getByText("1 high reputation")).toBeTruthy();
    expect(screen.getAllByText("The audit was hidden from the public.")).toHaveLength(2);
    expect(screen.getByText("Loaded Language")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Session/i })).toHaveAttribute("href", "/session");
    expect(screen.getByRole("link", { name: /Library/i })).toHaveAttribute("href", "/sessions");
    expect(container.querySelector('a[href="/session/detail/claim/claim-1"]')).not.toBeNull();
    expect(container.querySelector('a[href="/session/detail/marker/marker-1"]')).not.toBeNull();
  });
});
