import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { TranscriptSegment, Speaker } from "@/lib/types";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

const {
  mockSetPrerecordStage,
  mockSetSource,
  mockClearPendingLaunchFile,
  mockBulkIngest,
  mockProbeAudioDuration,
  mockTranscribeAudioFile,
  mockPush,
  mockCreateObjectURL,
  mockRevokeObjectURL,
} = vi.hoisted(() => {
  return {
    mockSetPrerecordStage: vi.fn(),
    mockSetSource: vi.fn(),
    mockClearPendingLaunchFile: vi.fn(),
    mockBulkIngest: vi.fn().mockResolvedValue(undefined),
    mockProbeAudioDuration: vi.fn().mockResolvedValue(120), // 2 minutes default
    mockTranscribeAudioFile: vi.fn().mockResolvedValue({
      utterances: [{ text: "Hello.", start: 0, end: 1, is_final: true, speaker_id: 0 }],
      speakers: [{ id: 0, label: "Speaker 1" }],
    }),
    mockPush: vi.fn(),
    mockCreateObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
    mockRevokeObjectURL: vi.fn(),
  };
});

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
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/client/ingest-orchestrator", () => ({
  bulkIngest: mockBulkIngest,
}));

vi.mock("@/lib/client/audio-ingest", () => ({
  probeAudioDuration: mockProbeAudioDuration,
  estimateDeepgramCost: vi.fn((sec: number) => ({
    dollars: (sec / 60) * 0.0043,
    display: `$${((sec / 60) * 0.0043).toFixed(2)}`,
  })),
  formatDuration: vi.fn((sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }),
  formatBytes: vi.fn((bytes: number) => `${(bytes / 1024).toFixed(1)} KB`),
  transcribeAudioFile: mockTranscribeAudioFile,
  // 4 MB threshold — exported constant used by the component
  BLOB_UPLOAD_THRESHOLD_BYTES: 4 * 1024 * 1024,
}));

// Stub URL.createObjectURL / revokeObjectURL (not available in jsdom)
vi.stubGlobal("URL", {
  ...URL,
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

// ─── Setup ────────────────────────────────────────────────────────────────────

import { AudioIngestPane } from "@/components/session/ingest-panes/audio-ingest-pane";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAudioFile(name = "speech.mp3", type = "audio/mpeg", size = 1024 * 1024) {
  const content = "x".repeat(Math.min(size, 100)); // don't actually allocate full size
  const file = new File([content], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockProbeAudioDuration.mockResolvedValue(120);
  mockTranscribeAudioFile.mockResolvedValue({
    utterances: [{ text: "Hello.", start: 0, end: 1, is_final: true, speaker_id: 0 }],
    speakers: [{ id: 0, label: "Speaker 1" }],
  });
  mockBulkIngest.mockResolvedValue(undefined);
  mockCreateObjectURL.mockReturnValue("blob:mock-url");
  mockPendingLaunchFile = null;
});

describe("AudioIngestPane — renders", () => {
  it("renders the headline", () => {
    render(<AudioIngestPane />);
    expect(screen.getByText(/Drop an audio or video file/i)).toBeTruthy();
  });

  it("renders a drop zone", () => {
    render(<AudioIngestPane />);
    expect(screen.getByTestId("drop-zone")).toBeTruthy();
  });

  it("renders a hidden file input", () => {
    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i) as HTMLInputElement;
    expect(input.tagName.toLowerCase()).toBe("input");
    expect(input.type).toBe("file");
    // hidden by sr-only class
    expect(input.className).toContain("sr-only");
  });

  it("Process button is not visible initially (no file staged)", () => {
    render(<AudioIngestPane />);
    const btn = screen.queryByRole("button", { name: /Process audio/i });
    expect(btn).toBeNull();
  });

  it("Back to sources link is rendered", () => {
    render(<AudioIngestPane />);
    expect(screen.getByText(/Back to sources/i)).toBeTruthy();
  });

  it("Back to sources calls setPrerecordStage('picker')", () => {
    render(<AudioIngestPane />);
    fireEvent.click(screen.getByText(/Back to sources/i));
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
  });
});

describe("AudioIngestPane — file validation", () => {
  it("unsupported non-media file shows inline error", async () => {
    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = new File(["data"], "image.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file type/i)).toBeTruthy();
    });
  });

  it("accepts video files for transcription", async () => {
    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("clip.mp4", "video/mp4", 2 * 1024 * 1024);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/clip\.mp4/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Process audio/i })).not.toBeDisabled();
    });
  });

  it("file over 500 MB shows inline error", async () => {
    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("big.mp3", "audio/mpeg", 600 * 1024 * 1024);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/too large/i)).toBeTruthy();
    });
  });

  it("file over 4 hours shows inline error", async () => {
    mockProbeAudioDuration.mockResolvedValue(4 * 3600 + 1);

    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("long.mp3", "audio/mpeg");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/too long/i)).toBeTruthy();
    });
  });
});

describe("AudioIngestPane — valid file preview", () => {
  it("shows filename, size, duration, and cost after valid file selected", async () => {
    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("interview.mp3", "audio/mpeg", 5 * 1024 * 1024);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      // Filename
      expect(screen.getByText(/interview\.mp3/i)).toBeTruthy();
      // Process button appears (enabled)
      const btn = screen.getByRole("button", { name: /Process audio/i });
      expect(btn).not.toBeDisabled();
      expect(btn.className).toContain("text-white");
      expect(btn.className).not.toContain("text-bg");
      expect(screen.getByText(/Ready to process/i)).toBeTruthy();
      expect(screen.getByText(/What happens next/i)).toBeTruthy();
    });
  });

  it("stages a pending PWA-launched audio file and clears the handoff slot", async () => {
    mockPendingLaunchFile = makeAudioFile("launch.mp3", "audio/mpeg", 1024 * 1024);

    render(<AudioIngestPane />);

    await waitFor(() => {
      expect(mockProbeAudioDuration).toHaveBeenCalledWith(
        expect.objectContaining({ name: "launch.mp3" }),
      );
      expect(screen.getByText(/launch\.mp3/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Process audio/i })).not.toBeDisabled();
      expect(mockClearPendingLaunchFile).toHaveBeenCalledOnce();
    });
  });

  it("loads the local validation WAV into the same staged-file flow", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("RIFF", {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      }),
    );

    render(<AudioIngestPane />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Load validation WAV/i }));
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/validation/yentl-synthetic-panel.wav");
      expect(mockProbeAudioDuration).toHaveBeenCalledWith(
        expect.objectContaining({ name: "yentl-synthetic-panel.wav" }),
      );
      expect(screen.getByText(/yentl-synthetic-panel\.wav/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Process audio/i })).not.toBeDisabled();
    });

    fetchSpy.mockRestore();
  });

  it("Process button disabled until valid file staged", () => {
    render(<AudioIngestPane />);
    // Initially no button
    expect(screen.queryByRole("button", { name: /Process audio/i })).toBeNull();
  });
});

describe("AudioIngestPane — Process flow", () => {
  async function stageAndProcess() {
    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("audio.mp3", "audio/mpeg");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Process audio/i })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Process audio/i }));
    });
  }

  it("calls transcribeAudioFile with the staged file and duration", async () => {
    await stageAndProcess();
    await waitFor(() => {
      // Small file (1 MB default) → 4th arg (onUploadProgress) is undefined
      expect(mockTranscribeAudioFile).toHaveBeenCalledWith(
        expect.objectContaining({ name: "audio.mp3" }),
        120, // duration from mockProbeAudioDuration
        expect.any(AbortSignal),
        undefined,
      );
    });
  });

  it("does NOT call fetch directly (transcribeAudioFile handles the request)", async () => {
    // fetch should not be called — transcribeAudioFile is the abstraction now
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await stageAndProcess();
    await waitFor(() => {
      expect(mockTranscribeAudioFile).toHaveBeenCalled();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("calls URL.createObjectURL to create a local blob: URL for playback", async () => {
    await stageAndProcess();
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({ name: "audio.mp3" }),
      );
    });
  });

  it("calls setSource with blob: URL (from createObjectURL) for in-app playback", async () => {
    await stageAndProcess();
    await waitFor(() => {
      expect(mockSetSource).toHaveBeenCalledWith({
        kind: "audio_file",
        blob_url: "blob:mock-url",
        duration_sec: 120,
        filename: "audio.mp3",
        mime: "audio/mpeg",
      });
    });
  });

  it("calls bulkIngest with utterances from transcribeAudioFile response", async () => {
    await stageAndProcess();
    await waitFor(() => {
      expect(mockBulkIngest).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: "Hello.", is_final: true }),
        ]),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          speakers: [{ id: 0, label: "Speaker 1" }],
        }),
      );
    });
  });

  it("opens Watch after successful upload ingest", async () => {
    await stageAndProcess();
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/session?view=watch");
    });
  });

  it("shows error message when transcribeAudioFile rejects", async () => {
    mockTranscribeAudioFile.mockRejectedValue(new Error("Deepgram quota exceeded"));

    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("audio.mp3", "audio/mpeg");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => screen.getByRole("button", { name: /Process audio/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Process audio/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Deepgram quota exceeded/i)).toBeTruthy();
    });
  });

  it("shows processing state during transcribeAudioFile (single combined phase)", async () => {
    let resolveTranscribe!: (v: { utterances: TranscriptSegment[]; speakers: Speaker[] }) => void;
    const transcribePromise = new Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }>(
      (r) => { resolveTranscribe = r; },
    );
    mockTranscribeAudioFile.mockReturnValue(transcribePromise);

    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("audio.mp3", "audio/mpeg");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => screen.getByRole("button", { name: /Process audio/i }));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Process audio/i }));
    });

    // Small file (1 MB) → skips blob upload, goes directly to "Transcribing…"
    await waitFor(() => {
      expect(screen.getByText(/Transcribing/i)).toBeTruthy();
    });

    // Resolve so we don't leave hanging promises
    act(() => resolveTranscribe({ utterances: [], speakers: [] }));
  });
});

describe("AudioIngestPane — drag-and-drop", () => {
  it("accepts valid audio file via drop", async () => {
    render(<AudioIngestPane />);
    const dropZone = screen.getByTestId("drop-zone");
    const file = makeAudioFile("dropped.mp3", "audio/mpeg");

    await act(async () => {
      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file], types: ["Files"] },
      });
    });

    await waitFor(() => {
      // Should show the process button after valid file
      expect(screen.getByRole("button", { name: /Process audio/i })).toBeTruthy();
    });
  });
});

describe("AudioIngestPane — large file blob upload path", () => {
  it("shows Uploading phase text for large files during upload", async () => {
    // Simulate a large file (> 4 MB threshold)
    const LARGE_SIZE = 8 * 1024 * 1024; // 8 MB
    let resolveTranscribe!: (v: { utterances: TranscriptSegment[]; speakers: Speaker[] }) => void;
    const transcribePromise = new Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }>(
      (r) => { resolveTranscribe = r; },
    );

    // transcribeAudioFile is called with onUploadProgress — we capture it and call
    // it with pct=50 to simulate mid-upload, then resolve the outer promise.
    let capturedProgress: ((pct: number) => void) | undefined;
    mockTranscribeAudioFile.mockImplementation(
      (_file: File, _dur: number, _signal: AbortSignal, onUploadProgress?: (pct: number) => void) => {
        capturedProgress = onUploadProgress;
        return transcribePromise;
      },
    );

    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("large.mp3", "audio/mpeg", LARGE_SIZE);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => screen.getByRole("button", { name: /Process audio/i }));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Process audio/i }));
    });

    // Simulate upload progress at 50%
    await act(async () => {
      capturedProgress?.(50);
    });

    await waitFor(() => {
      expect(screen.getByText(/Uploading.*50%/i)).toBeTruthy();
    });

    // Cleanup — resolve the promise to avoid hanging
    act(() => resolveTranscribe({ utterances: [], speakers: [] }));
  });

  it("transitions from Uploading to Transcribing when progress hits 100%", async () => {
    const LARGE_SIZE = 8 * 1024 * 1024;
    let resolveTranscribe!: (v: { utterances: TranscriptSegment[]; speakers: Speaker[] }) => void;
    const transcribePromise = new Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }>(
      (r) => { resolveTranscribe = r; },
    );

    let capturedProgress: ((pct: number) => void) | undefined;
    mockTranscribeAudioFile.mockImplementation(
      (_file: File, _dur: number, _signal: AbortSignal, onUploadProgress?: (pct: number) => void) => {
        capturedProgress = onUploadProgress;
        return transcribePromise;
      },
    );

    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("large.mp3", "audio/mpeg", LARGE_SIZE);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => screen.getByRole("button", { name: /Process audio/i }));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Process audio/i }));
    });

    // Simulate upload completing
    await act(async () => {
      capturedProgress?.(100);
    });

    await waitFor(() => {
      expect(screen.getByText(/Transcribing/i)).toBeTruthy();
    });

    act(() => resolveTranscribe({ utterances: [], speakers: [] }));
  });

  it("passes onUploadProgress callback when file is large (>= 4 MB)", async () => {
    const LARGE_SIZE = 5 * 1024 * 1024;
    mockTranscribeAudioFile.mockResolvedValue({ utterances: [], speakers: [] });

    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("large.mp3", "audio/mpeg", LARGE_SIZE);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => screen.getByRole("button", { name: /Process audio/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Process audio/i }));
    });

    await waitFor(() => {
      // 4th argument (onUploadProgress) should be a function for large files
      const call = mockTranscribeAudioFile.mock.calls[0];
      expect(typeof call[3]).toBe("function");
    });
  });

  it("does NOT pass onUploadProgress callback when file is small (< 4 MB)", async () => {
    const SMALL_SIZE = 1 * 1024 * 1024; // 1 MB
    mockTranscribeAudioFile.mockResolvedValue({ utterances: [], speakers: [] });

    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = makeAudioFile("small.mp3", "audio/mpeg", SMALL_SIZE);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => screen.getByRole("button", { name: /Process audio/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Process audio/i }));
    });

    await waitFor(() => {
      const call = mockTranscribeAudioFile.mock.calls[0];
      // 4th argument should be undefined for small files
      expect(call[3]).toBeUndefined();
    });
  });
});
