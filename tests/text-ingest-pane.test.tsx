import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TranscriptSegment } from "@/lib/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Use vi.hoisted() so mock fns are available inside vi.mock() factories.

const { mockSetPrerecordStage, mockParsePlainText, mockBulkIngest, mockParseDocx, mockPush } =
  vi.hoisted(() => {
    const mockSetPrerecordStage = vi.fn();
    const mockParsePlainText = vi.fn((): TranscriptSegment[] => [
      { text: "Hello.", start: 0, end: 400, is_final: true, speaker_id: 0 },
    ]);
    const mockBulkIngest = vi.fn().mockResolvedValue(undefined);
    const mockParseDocx = vi.fn().mockResolvedValue("Extracted docx text");
    const mockPush = vi.fn();
    return { mockSetPrerecordStage, mockParsePlainText, mockBulkIngest, mockParseDocx, mockPush };
  });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = { setPrerecordStage: mockSetPrerecordStage };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/client/text-ingest", () => ({
  parsePlainText: mockParsePlainText,
  parseDocx: mockParseDocx,
}));

vi.mock("@/lib/client/ingest-orchestrator", () => ({
  bulkIngest: mockBulkIngest,
}));

import { TextIngestPane } from "@/components/session/ingest-panes/text-ingest-pane";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default implementations after clearAllMocks
  mockParsePlainText.mockReturnValue([
    { text: "Hello.", start: 0, end: 400, is_final: true, speaker_id: 0 },
  ]);
  mockBulkIngest.mockResolvedValue(undefined);
  mockParseDocx.mockResolvedValue("Extracted docx text");
  mockPush.mockReset();
});

// ─── 1. Renders ───────────────────────────────────────────────────────────────

describe("TextIngestPane — rendering", () => {
  it("renders the headline", () => {
    render(<TextIngestPane />);
    expect(screen.getByText(/Paste or drop a transcript/i)).toBeTruthy();
  });

  it("renders a textarea with placeholder", () => {
    render(<TextIngestPane />);
    const ta = screen.getByPlaceholderText(/Paste your transcript here/i);
    expect(ta.tagName.toLowerCase()).toBe("textarea");
  });

  it("renders char count row", () => {
    render(<TextIngestPane />);
    expect(screen.getByText(/0 chars/i)).toBeTruthy();
  });

  it("renders speaker label toggle", () => {
    render(<TextIngestPane />);
    expect(screen.getByText(/Detect speaker labels/i)).toBeTruthy();
  });

  it("renders the Process transcript button", () => {
    render(<TextIngestPane />);
    expect(screen.getByRole("button", { name: /Process transcript/i })).toBeTruthy();
  });

  it("renders the Back to sources button", () => {
    render(<TextIngestPane />);
    expect(screen.getByRole("button", { name: /Back to sources/i })).toBeTruthy();
  });

  it("Back button calls setPrerecordStage('picker')", () => {
    render(<TextIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: /Back to sources/i }));
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
  });
});

// ─── 2. Button disabled state ─────────────────────────────────────────────────

describe("TextIngestPane — Process button disabled state", () => {
  it("Process button is disabled when textarea is empty", () => {
    render(<TextIngestPane />);
    const btn = screen.getByRole("button", { name: /Process transcript/i });
    expect(btn).toBeDisabled();
  });

  it("typing in textarea enables the Process button", async () => {
    const user = userEvent.setup();
    render(<TextIngestPane />);
    const ta = screen.getByPlaceholderText(/Paste your transcript here/i);
    await user.type(ta, "Hello world.");
    const btn = screen.getByRole("button", { name: /Process transcript/i });
    expect(btn).not.toBeDisabled();
  });
});

// ─── 3. Process flow ─────────────────────────────────────────────────────────

describe("TextIngestPane — Process flow", () => {
  it("click Process: calls bulkIngest with parsed segments", async () => {
    const user = userEvent.setup();
    render(<TextIngestPane />);
    const ta = screen.getByPlaceholderText(/Paste your transcript here/i);
    await user.type(ta, "Hello world.");
    const btn = screen.getByRole("button", { name: /Process transcript/i });
    await user.click(btn);
    await waitFor(() => {
      expect(mockParsePlainText).toHaveBeenCalledWith("Hello world.", expect.any(Object));
      expect(mockBulkIngest).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ text: "Hello." })]),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});

// ─── 4. File drop ─────────────────────────────────────────────────────────────

describe("TextIngestPane — file drop", () => {
  it("file drop with .txt: reads as text and populates textarea", async () => {
    render(<TextIngestPane />);
    const content = "This is a plain text transcript.";
    const file = new File([content], "transcript.txt", { type: "text/plain" });

    const dropTarget = screen.getByTestId("drop-zone");

    await act(async () => {
      fireEvent.dragOver(dropTarget, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
      fireEvent.drop(dropTarget, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
    });

    await waitFor(() => {
      const updatedTa = screen.getByPlaceholderText(
        /Paste your transcript here/i,
      ) as HTMLTextAreaElement;
      expect(updatedTa.value).toBe(content);
    });
  });

  it("file drop with .docx: calls parseDocx and populates textarea", async () => {
    render(<TextIngestPane />);
    const file = new File(["fake docx bytes"], "transcript.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const dropTarget = screen.getByTestId("drop-zone");

    await act(async () => {
      fireEvent.drop(dropTarget, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
    });

    await waitFor(() => {
      expect(mockParseDocx).toHaveBeenCalledWith(file);
      const updatedTa = screen.getByPlaceholderText(
        /Paste your transcript here/i,
      ) as HTMLTextAreaElement;
      expect(updatedTa.value).toBe("Extracted docx text");
    });
  });

  it("file drop with unsupported type: shows inline error", async () => {
    render(<TextIngestPane />);
    const file = new File(["data"], "video.mp4", { type: "video/mp4" });

    const dropTarget = screen.getByTestId("drop-zone");

    await act(async () => {
      fireEvent.drop(dropTarget, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Only .txt, .md, and .docx files are supported/i),
      ).toBeTruthy();
    });
  });
});

// ─── 5. Size cap ─────────────────────────────────────────────────────────────

describe("TextIngestPane — size cap", () => {
  it("over-size text (>1MB) typed into textarea shows error", async () => {
    render(<TextIngestPane />);
    const ta = screen.getByPlaceholderText(/Paste your transcript here/i);

    const bigText = "a".repeat(1_100_000); // >1MB
    fireEvent.change(ta, { target: { value: bigText } });

    await waitFor(() => {
      expect(screen.getByText(/transcript is too large/i)).toBeTruthy();
    });
  });

  it("over-size file drop shows error", async () => {
    render(<TextIngestPane />);
    const bigContent = "x".repeat(1_100_000);
    const file = new File([bigContent], "big.txt", { type: "text/plain" });

    const dropTarget = screen.getByTestId("drop-zone");

    await act(async () => {
      fireEvent.drop(dropTarget, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/transcript is too large/i)).toBeTruthy();
    });
  });
});
