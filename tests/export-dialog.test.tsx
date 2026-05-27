import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mockExportSession = vi.fn();
const mockOnClose = vi.fn();

vi.mock("@/lib/client/export-actions", () => ({
  exportSession: (...args: unknown[]) => mockExportSession(...args),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      title: "Exportable",
      transcript: [{ text: "Line" }],
      claims: [
        {
          id: "claim-1",
          claim_text: "The city doubled its transit budget in one year.",
          utterance_start: 0,
          utterance_end: 1,
          speaker_id: null,
          topic: "budget",
          topic_secondary: null,
          primary_label: "MISLEADING",
          score: 58,
          annotations: [],
          explanation: "The year-over-year change was smaller after grants.",
          status: "confirmed",
          sources: [
            {
              url: "https://example.com/budget",
              domain: "example.com",
              title: "Budget table",
              reputation_tier: "high",
              stance: "contradicts",
            },
          ],
        },
      ],
      markers: [
        {
          id: "marker-1",
          type: "rhetoric",
          name: "loaded_language",
          display: "Loaded language",
          excerpt: "They are destroying the whole system overnight.",
          speaker_id: null,
          start_time: 0,
          end_time: 1,
          severity: "clear",
          explanation: "Emotionally loaded phrasing compresses the claim.",
        },
      ],
      synthesis: {
        state: "fresh",
        text: "Yentl's read is that the exchange hinges on budget baselines and missing context.",
        headlines: ["Budget baseline is contested"],
        at: 0,
      },
      devilAdvocate: {
        state: "fresh",
        brief: {
          stance: "The strongest counter-read is that the speaker meant operational funds only.",
          strongest_counterarguments: ["A", "B", "C"],
          weakest_assumption: "The baseline is stable.",
          questions: ["Which budget line?", "Which year?"],
          confidence: "medium",
        },
        at: 0,
      },
      source: { kind: "youtube", video_id: "abc123", url: "https://youtu.be/abc123", title: "Council clip" },
      toSession: () => ({
        title: "Exportable",
        started_at: "2026-05-25T10:00:00.000Z",
        transcript: [{ text: "Line", start: 0, end: 1, is_final: true, speaker_id: null }],
        claims: [],
        markers: [],
        speakers: [],
        source: { kind: "mic" },
      }),
    };
    return selector ? selector(state) : state;
  }),
}));

import { useSession } from "@/lib/client/session-store";
import { ExportDialog } from "@/components/session/ExportDialog";

beforeEach(() => {
  vi.clearAllMocks();
  (useSession as unknown as { getState: () => unknown }).getState = () => ({
    toSession: () => ({
      title: "Exportable",
      started_at: "2026-05-25T10:00:00.000Z",
      transcript: [{ text: "Line", start: 0, end: 1, is_final: true, speaker_id: null }],
      claims: [],
      markers: [],
      speakers: [],
      source: { kind: "mic" },
    }),
  });
});

describe("ExportDialog", () => {
  it("shows an in-dialog report preview before export", () => {
    render(<ExportDialog open onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Preview report/i }));

    expect(screen.getByTestId("report-preview-panel")).toBeInTheDocument();
    expect(screen.getByText(/Yentl's read is that/i)).toBeInTheDocument();
    expect(screen.getByText(/The city doubled its transit budget/i)).toBeInTheDocument();
    expect(screen.getByText(/1 source/i)).toBeInTheDocument();
    expect(mockExportSession).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("exports and closes when a format succeeds", () => {
    render(<ExportDialog open onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Markdown file/i }));

    expect(mockExportSession).toHaveBeenCalledWith(expect.any(Object), "markdown");
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("shows a visible error and keeps the dialog open when export fails", () => {
    mockExportSession.mockImplementationOnce(() => {
      throw new Error("Popup blocked");
    });
    render(<ExportDialog open onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Open as report/i }));

    expect(screen.getByRole("alert").textContent).toContain("Popup blocked");
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
