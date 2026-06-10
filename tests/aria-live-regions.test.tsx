import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker, SessionSource, Speaker, TranscriptSegment } from "@/lib/types";
import { ClaimsLiveRegion } from "@/components/session/ClaimsLiveRegion";
import { TranscriptView } from "@/components/session/TranscriptView";

const mockSession = vi.hoisted(() => ({
  searchParams: new URLSearchParams("demo=validation&sample=media_playback_sync&view=transcript"),
  state: {
    source: {
      kind: "audio_file",
      blob_url: "/validation/yentl-synthetic-panel.wav",
      duration_sec: 31.953,
      filename: "yentl-synthetic-panel.wav",
      mime: "audio/wav",
    } as SessionSource,
    transcript: [] as TranscriptSegment[],
    interim: "",
    claims: [] as ClaimCard[],
    markers: [] as RhetoricMarker[],
    speakers: [] as Speaker[],
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSession.searchParams,
}));

vi.mock("@/lib/client/session-store", () => {
  return {
    useSession: (selector?: (s: typeof mockSession.state) => unknown) =>
      selector ? selector(mockSession.state) : mockSession.state,
  };
});

describe("aria-live regions", () => {
  beforeEach(() => {
    mockSession.state.transcript = [];
    mockSession.state.interim = "";
    mockSession.state.claims = [];
    mockSession.state.markers = [];
    mockSession.state.speakers = [];
    mockSession.state.source = {
      kind: "audio_file",
      blob_url: "/validation/yentl-synthetic-panel.wav",
      duration_sec: 31.953,
      filename: "yentl-synthetic-panel.wav",
      mime: "audio/wav",
    };
    mockSession.searchParams = new URLSearchParams("demo=validation&sample=media_playback_sync&view=transcript");
  });

  it("ClaimsLiveRegion has aria-live=polite, aria-atomic=false, role=status", () => {
    const { container } = render(<ClaimsLiveRegion />);
    const region = container.firstElementChild;
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "false");
    expect(region).toHaveAttribute("role", "status");
  });

  it("TranscriptView container has aria-live=polite", () => {
    const { container } = render(<TranscriptView />);
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("TranscriptView uses a constrained reading measure", () => {
    const { container } = render(<TranscriptView />);
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion?.className).toContain("max-w-3xl");
    expect(liveRegion?.className).toContain("px-5");
  });

  it("TranscriptView shows document anchors for imported text segments", () => {
    mockSession.state.transcript = [
      {
        text: "Opening claim.",
        start: 0,
        end: 1,
        is_final: true,
        speaker_id: null,
        source_audio_kind: "text_import",
        document_anchor: {
          kind: "speaker_turn",
          block_index: 0,
          line_start: 1,
          line_end: 1,
          speaker_label: "David",
        },
      },
    ];

    const { getByText } = render(<TranscriptView />);

    expect(getByText("Turn 1 (David)")).toBeTruthy();
  });

  it("filters transcript lines by search and highlights the match", () => {
    mockSession.state.transcript = [
      {
        text: "The city library budget increased this year.",
        start: 0,
        end: 4,
        is_final: true,
        speaker_id: null,
      },
      {
        text: "The technology grant expired.",
        start: 4,
        end: 8,
        is_final: true,
        speaker_id: null,
      },
    ];

    render(<TranscriptView />);

    fireEvent.change(screen.getByLabelText("Search transcript"), {
      target: { value: "budget" },
    });

    expect(screen.getByTestId("transcript-filter-summary").textContent).toContain("1 of 2 lines shown");
    expect(screen.getByText("budget").tagName).toBe("MARK");
    expect(screen.queryByText("The technology grant expired.")).toBeNull();
  });

  it("adds media jump links that preserve the current session context", () => {
    mockSession.state.transcript = [
      {
        text: "The budget increased.",
        start: 4,
        end: 8,
        is_final: true,
        speaker_id: null,
      },
    ];

    render(<TranscriptView />);

    expect(screen.getByTestId("transcript-jump-4").getAttribute("href")).toBe(
      "/session?demo=validation&sample=media_playback_sync&view=watch&t=4",
    );
  });

  it("findings filter keeps claim and marker transcript lines", () => {
    mockSession.state.transcript = [
      {
        text: "Opening context.",
        start: 0,
        end: 4,
        is_final: true,
        speaker_id: null,
      },
      {
        text: "The budget increased.",
        start: 4,
        end: 8,
        is_final: true,
        speaker_id: null,
      },
      {
        text: "That is a slippery slope.",
        start: 8,
        end: 12,
        is_final: true,
        speaker_id: null,
      },
    ];
    mockSession.state.claims = [
      {
        id: "claim-1",
        claim_text: "The budget increased.",
        utterance_start: 4,
        utterance_end: 8,
        speaker_id: null,
        topic: "budget",
        topic_secondary: null,
        primary_label: "PARTIAL",
        score: 64,
        annotations: [],
        explanation: "",
        status: "confirmed",
        sources: [],
      },
    ];
    mockSession.state.markers = [
      {
        id: "marker-1",
        type: "fallacy",
        name: "slippery-slope",
        display: "Slippery slope",
        excerpt: "That is a slippery slope.",
        speaker_id: null,
        start_time: 8.5,
        end_time: 11,
        severity: "clear",
        explanation: "",
      },
    ];

    render(<TranscriptView />);

    fireEvent.click(screen.getByTestId("transcript-findings-filter"));

    expect(screen.queryByText("Opening context.")).toBeNull();
    expect(screen.getByText("The budget increased.")).toBeTruthy();
    expect(screen.getByText("That is a slippery slope.")).toBeTruthy();
    expect(screen.getByTestId("transcript-filter-summary").textContent).toContain("2 of 3 lines shown");
  });

  it("speaker filtering preserves original transcript indexes for correction", () => {
    mockSession.state.speakers = [
      { id: 0, label: "Moderator" },
      { id: 1, label: "Analyst" },
    ];
    mockSession.state.transcript = [
      {
        text: "Moderator opening.",
        start: 0,
        end: 4,
        is_final: true,
        speaker_id: 0,
      },
      {
        text: "Analyst response.",
        start: 4,
        end: 8,
        is_final: true,
        speaker_id: 1,
      },
    ];

    render(<TranscriptView />);

    fireEvent.click(screen.getByTestId("transcript-speaker-filter-1"));

    expect(screen.queryByText("Moderator opening.")).toBeNull();
    expect(screen.getByText("Analyst response.")).toBeTruthy();
    expect(screen.getByTestId("reassign-trigger-1")).toBeTruthy();
    expect(screen.queryByTestId("reassign-trigger-0")).toBeNull();
  });
});
