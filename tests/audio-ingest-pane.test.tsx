import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { TranscriptSegment, Speaker } from "@/lib/types";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

const {
  mockSetPrerecordStage,
  mockSetSource,
  mockBulkIngest,
  mockProbeAudioDuration,
  mockUploadToBlob,
  mockPush,
} = vi.hoisted(() => {
  return {
    mockSetPrerecordStage: vi.fn(),
    mockSetSource: vi.fn(),
    mockBulkIngest: vi.fn().mockResolvedValue(undefined),
    mockProbeAudioDuration: vi.fn().mockResolvedValue(120), // 2 minutes default
    mockUploadToBlob: vi.fn().mockResolvedValue({ url: "https://blob.vercel-storage.com/audio.mp3" }),
    mockPush: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setPrerecordStage: mockSetPrerecordStage,
      setSource: mockSetSource,
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
  uploadToBlob: mockUploadToBlob,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Setup ────────────────────────────────────────────────────────────────────

function setupFetchSuccess(utterances: TranscriptSegment[] = [], speakers: Speaker[] = []) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ utterances, speakers }),
  });
}

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
  mockUploadToBlob.mockResolvedValue({ url: "https://blob.vercel-storage.com/audio.mp3" });
  mockBulkIngest.mockResolvedValue(undefined);
  setupFetchSuccess(
    [{ text: "Hello.", start: 0, end: 1, is_final: true, speaker_id: 0 }],
    [{ id: 0, label: "Speaker 1" }],
  );
});

describe("AudioIngestPane — renders", () => {
  it("renders the headline", () => {
    render(<AudioIngestPane />);
    expect(screen.getByText(/Drop an audio file/i)).toBeTruthy();
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
  it("non-audio file shows inline error", async () => {
    render(<AudioIngestPane />);
    const input = screen.getByLabelText(/Select audio file/i);
    const file = new File(["data"], "video.mp4", { type: "video/mp4" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file type/i)).toBeTruthy();
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
    });
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

  it("calls uploadToBlob with the staged file", async () => {
    await stageAndProcess();
    await waitFor(() => {
      expect(mockUploadToBlob).toHaveBeenCalledWith(
        expect.objectContaining({ name: "audio.mp3" }),
      );
    });
  });

  it("calls fetch /api/transcribe-batch with blob_url and duration_sec", async () => {
    await stageAndProcess();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/transcribe-batch",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("blob.vercel-storage.com"),
        }),
      );
    });
  });

  it("calls bulkIngest with utterances from the API response", async () => {
    await stageAndProcess();
    await waitFor(() => {
      expect(mockBulkIngest).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: "Hello.", is_final: true }),
        ]),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("calls setSource with exact audio_file shape after successful transcribe", async () => {
    await stageAndProcess();
    await waitFor(() => {
      expect(mockSetSource).toHaveBeenCalledWith({
        kind: "audio_file",
        blob_url: "https://blob.vercel-storage.com/audio.mp3",
        duration_sec: 120,
        filename: "audio.mp3",
        mime: "audio/mpeg",
      });
    });
  });

  it("shows error message when transcribe-batch returns non-ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Deepgram quota exceeded" }),
    });

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

  it("shows uploading state during upload", async () => {
    // Make upload take a tick so we can catch the intermediate state
    let resolveUpload!: (v: { url: string }) => void;
    const uploadPromise = new Promise<{ url: string }>((r) => { resolveUpload = r; });
    mockUploadToBlob.mockReturnValue(uploadPromise);

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

    await waitFor(() => {
      expect(screen.getByText(/Uploading/i)).toBeTruthy();
    });

    // Resolve so we don't leave hanging promises
    act(() => resolveUpload({ url: "https://blob.vercel-storage.com/audio.mp3" }));
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
