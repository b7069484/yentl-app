import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TranscriptSegment } from "@/lib/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Use vi.hoisted() so mock fns are available inside vi.mock() factories.

const { mockSetPrerecordStage, mockSetSource, mockClearPendingLaunchFile, mockParsePlainText, mockBulkIngest, mockParseDocx, mockParsePdfWithMetadata, mockParseTimedText, mockBuildDocumentOutline, mockPush } =
  vi.hoisted(() => {
    const mockSetPrerecordStage = vi.fn();
    const mockSetSource = vi.fn();
    const mockClearPendingLaunchFile = vi.fn();
    const mockParsePlainText = vi.fn((): TranscriptSegment[] => [
      { text: "Hello.", start: 0, end: 0.4, is_final: true, speaker_id: 0 },
    ]);
    const mockBulkIngest = vi.fn().mockResolvedValue(undefined);
    const mockParseDocx = vi.fn().mockResolvedValue("Extracted docx text");
    const mockParsePdfWithMetadata = vi.fn().mockResolvedValue({
      text: "Extracted pdf text",
      filename: "paper.pdf",
      mime: "application/pdf",
      pageCount: 4,
      byteCount: 14,
      outline: [{ kind: "heading", label: "Findings", preview: "Extracted pdf text", line_start: 1 }],
    });
    const mockParseTimedText = vi.fn((): TranscriptSegment[] => [
      { text: "Caption line.", start: 1, end: 3, is_final: true, speaker_id: null },
    ]);
    const mockBuildDocumentOutline = vi.fn(() => [
      { kind: "paragraph", label: "Paragraph 1", preview: "Extracted text", paragraph_index: 0 },
    ]);
    const mockPush = vi.fn();
    return { mockSetPrerecordStage, mockSetSource, mockClearPendingLaunchFile, mockParsePlainText, mockBulkIngest, mockParseDocx, mockParsePdfWithMetadata, mockParseTimedText, mockBuildDocumentOutline, mockPush };
  });
let mockSource: {
  kind: string;
  filename: string;
  mime: string;
  byte_count: number;
  initial_text?: string;
} = { kind: "text_doc", filename: "", mime: "", byte_count: 0 };
let mockPendingLaunchFile: File | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setPrerecordStage: mockSetPrerecordStage,
      setSource: mockSetSource,
      clearPendingLaunchFile: mockClearPendingLaunchFile,
      pendingLaunchFile: mockPendingLaunchFile,
      source: mockSource,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/client/text-ingest", () => ({
  buildDocumentOutline: mockBuildDocumentOutline,
  parsePlainText: mockParsePlainText,
  parseDocx: mockParseDocx,
  parsePdfWithMetadata: mockParsePdfWithMetadata,
  parseTimedText: mockParseTimedText,
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
    { text: "Hello.", start: 0, end: 0.4, is_final: true, speaker_id: 0 },
  ]);
  mockBulkIngest.mockResolvedValue(undefined);
  mockParseDocx.mockResolvedValue("Extracted docx text");
  mockParsePdfWithMetadata.mockResolvedValue({
    text: "Extracted pdf text",
    filename: "paper.pdf",
    mime: "application/pdf",
    pageCount: 4,
    byteCount: 14,
    outline: [{ kind: "heading", label: "Findings", preview: "Extracted pdf text", line_start: 1 }],
  });
  mockParseTimedText.mockReturnValue([
    { text: "Caption line.", start: 1, end: 3, is_final: true, speaker_id: null },
  ]);
  mockBuildDocumentOutline.mockReturnValue([
    { kind: "paragraph", label: "Paragraph 1", preview: "Extracted text", paragraph_index: 0 },
  ]);
  mockPush.mockReset();
  mockSource = { kind: "text_doc", filename: "", mime: "", byte_count: 0 };
  mockPendingLaunchFile = null;
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

  it("prefills shared text from the selected source", () => {
    mockSource = {
      kind: "text_doc",
      filename: "Shared text",
      mime: "text/plain",
      byte_count: 12,
      initial_text: "Shared claim",
    };

    render(<TextIngestPane />);

    expect(screen.getByDisplayValue("Shared claim")).toBeTruthy();
  });

  it("renders char count row", () => {
    render(<TextIngestPane />);
    expect(screen.getByText(/0 chars/i)).toBeTruthy();
  });

  it("renders speaker label toggle", () => {
    render(<TextIngestPane />);
    expect(screen.getByText(/Detect speaker labels/i)).toBeTruthy();
  });

  it("previews line-by-line speaker labels before processing", () => {
    render(<TextIngestPane />);
    const ta = screen.getByPlaceholderText(/Paste your transcript here/i);

    fireEvent.change(ta, {
      target: {
        value: "Speaker 1: Opening claim.\nSpeaker 2: Response without a blank line.",
      },
    });

    expect(screen.getByText("Speaker labels").closest("div")?.textContent).toContain("2");
    expect(screen.getByText("Transcript lines").closest("div")?.textContent).toContain("2");
    expect(screen.getByText("Review anchors").closest("div")?.textContent).toContain("2");
  });

  it("renders the Process transcript button", () => {
    render(<TextIngestPane />);
    expect(screen.getByRole("button", { name: /Process transcript/i })).toBeTruthy();
  });

  it("renders local validation fixture loaders in development", () => {
    render(<TextIngestPane />);

    expect(screen.getByRole("button", { name: "Load validation TXT" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Load validation DOCX" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Load validation PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Load validation VTT" })).toBeTruthy();
  });

  it("makes the PDF text-layer boundary visible before import", () => {
    render(<TextIngestPane />);

    expect(screen.getByText(/PDFs need selectable text/i)).toBeTruthy();
    expect(screen.getByText(/Scanned PDFs need OCR elsewhere/i)).toBeTruthy();
    expect(screen.getByText(/PDF import boundary/i)).toBeTruthy();
    expect(screen.getByText(/Scanned image-only PDFs currently need OCR before import/i)).toBeTruthy();
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

  it("stages a pending PWA-launched text file and clears the handoff slot", async () => {
    const content = "This transcript came from the operating system.";
    mockPendingLaunchFile = new File([content], "launch.txt", { type: "text/plain" });

    render(<TextIngestPane />);

    await waitFor(() => {
      const updatedTa = screen.getByPlaceholderText(
        /Paste your transcript here/i,
      ) as HTMLTextAreaElement;
      expect(updatedTa.value).toBe(content);
      expect(mockClearPendingLaunchFile).toHaveBeenCalledOnce();
    });
  });

  it("loads the validation TXT fixture through the file reader path", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "Moderator: Opening claim.",
    } as Response);

    render(<TextIngestPane />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Load validation TXT" }));
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/validation/yentl-synthetic-transcript.txt");
      expect(screen.getByDisplayValue("Moderator: Opening claim.")).toBeTruthy();
      expect(screen.getByText("yentl-synthetic-transcript.txt")).toBeTruthy();
      expect(screen.getByRole("button", { name: /Process transcript/i })).not.toBeDisabled();
    });

    fetchSpy.mockRestore();
  });

  it("loads the validation VTT fixture as timed caption cues", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nCaption line.",
    } as Response);

    render(<TextIngestPane />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Load validation VTT" }));
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/validation/yentl-synthetic-captions.vtt");
      expect(mockParseTimedText).toHaveBeenCalledWith(expect.stringContaining("Caption line"), "vtt");
      expect(screen.getByDisplayValue(/0:01 Caption line/i)).toBeTruthy();
      expect(screen.getByText(/1 timed cues/i)).toBeTruthy();
    });

    fetchSpy.mockRestore();
  });

  it("loads the validation DOCX fixture through the binary file reader path", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([80, 75, 3, 4]).buffer,
    } as Response);

    render(<TextIngestPane />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Load validation DOCX" }));
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/validation/yentl-small-brief.docx");
      expect(mockParseDocx).toHaveBeenCalledOnce();
      const file = mockParseDocx.mock.calls[0][0] as File;
      expect(file.name).toBe("yentl-small-brief.docx");
      expect(file.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      expect(screen.getByDisplayValue("Extracted docx text")).toBeTruthy();
      expect(screen.getByText("yentl-small-brief.docx")).toBeTruthy();
    });

    fetchSpy.mockRestore();
  });

  it("loads the validation PDF fixture through the binary document-ingest path", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer,
    } as Response);

    render(<TextIngestPane />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Load validation PDF" }));
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/validation/yentl-small-text-layer.pdf");
      expect(mockParsePdfWithMetadata).toHaveBeenCalledOnce();
      const file = mockParsePdfWithMetadata.mock.calls[0][0] as File;
      expect(file.name).toBe("yentl-small-text-layer.pdf");
      expect(file.type).toBe("application/pdf");
      expect(screen.getByDisplayValue("Extracted pdf text")).toBeTruthy();
      expect(screen.getByText("yentl-small-text-layer.pdf")).toBeTruthy();
      expect(screen.getAllByText(/4 PDF pages/i).length).toBeGreaterThan(0);
    });

    fetchSpy.mockRestore();
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

  it("file drop with .pdf: preserves document metadata and shows the outline", async () => {
    render(<TextIngestPane />);
    const file = new File(["fake pdf bytes"], "paper.pdf", {
      type: "application/pdf",
    });

    const dropTarget = screen.getByTestId("drop-zone");

    await act(async () => {
      fireEvent.drop(dropTarget, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
    });

    await waitFor(() => {
      expect(mockParsePdfWithMetadata).toHaveBeenCalledWith(file);
      const updatedTa = screen.getByPlaceholderText(
        /Paste your transcript here/i,
      ) as HTMLTextAreaElement;
      expect(updatedTa.value).toBe("Extracted pdf text");
      expect(screen.getAllByText(/4 PDF pages/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Findings")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Process transcript/i }));
    });

    await waitFor(() => {
      expect(mockSetSource).toHaveBeenCalledWith(expect.objectContaining({
        kind: "text_doc",
        filename: "paper.pdf",
        mime: "application/pdf",
        document_meta: expect.objectContaining({
          extraction_kind: "pdf_text_layer",
          page_count: 4,
          outline: expect.arrayContaining([
            expect.objectContaining({ label: "Findings" }),
          ]),
        }),
      }));
    });
  });

  it("file drop with .srt: parses timed cues and uses them during ingest", async () => {
    render(<TextIngestPane />);
    const file = new File(["1\n00:00:01,000 --> 00:00:03,000\nCaption line."], "captions.srt", {
      type: "application/x-subrip",
    });

    const dropTarget = screen.getByTestId("drop-zone");

    await act(async () => {
      fireEvent.drop(dropTarget, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
    });

    await waitFor(() => {
      expect(mockParseTimedText).toHaveBeenCalledWith(expect.stringContaining("Caption line"), "srt");
      expect(screen.getByDisplayValue(/0:01 Caption line/i)).toBeTruthy();
      expect(screen.getByText(/1 timed cues/i)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Process transcript/i }));
    });

    await waitFor(() => {
      expect(mockBulkIngest).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ text: "Caption line." })]),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
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
        screen.getByText(/Only .txt, .md, .docx, .pdf, .srt, and .vtt files are supported/i),
      ).toBeTruthy();
    });
  });

  it("shows scanned-PDF recovery actions and can switch to browser-tab capture", async () => {
    mockParsePdfWithMetadata.mockRejectedValueOnce(
      new Error(
        "This PDF does not expose enough selectable text for direct import. OCR is not yet wired in this build.",
      ),
    );

    render(<TextIngestPane />);
    const file = new File(["fake scanned pdf"], "scan.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      fireEvent.drop(screen.getByTestId("drop-zone"), {
        dataTransfer: { files: [file], types: ["Files"] },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("selectable text");
      expect(screen.getByRole("button", { name: /Choose another file/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Paste extracted text/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Use browser tab/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Use browser tab/i }));

    expect(mockSetSource).toHaveBeenCalledWith({ kind: "browser_tab" });
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
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
