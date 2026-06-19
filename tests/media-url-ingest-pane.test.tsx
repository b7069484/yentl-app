import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

const { mockSetPrerecordStage, mockSetSource, mockBulkIngest, mockPush } = vi.hoisted(() => ({
  mockSetPrerecordStage: vi.fn(),
  mockSetSource: vi.fn(),
  mockBulkIngest: vi.fn().mockResolvedValue(undefined),
  mockPush: vi.fn(),
}));
let mockSource: { kind: string; url: string } = { kind: "media_url", url: "" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setPrerecordStage: mockSetPrerecordStage,
      setSource: mockSetSource,
      source: mockSource,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/client/ingest-orchestrator", () => ({
  bulkIngest: mockBulkIngest,
}));

// ─── Mock global fetch ─────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
let mockClipboardReadText = vi.fn();

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_URL = "https://example.com/episode.mp3";
const VALIDATION_MEDIA_URL = "http://localhost:3000/validation/yentl-synthetic-panel.wav";
const VALIDATION_VIDEO_URL = "http://localhost:3000/validation/yentl-synthetic-panel.mp4";
const INVALID_URL_FORMAT = "not-a-url";
const PRIVATE_IP_URL = "http://192.168.1.1/audio.mp3";

const SAMPLE_UTTERANCES = [
  { text: "Hello.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
];

const SAMPLE_SPEAKERS = [{ id: 0, label: "Speaker 1" }];

function happyFetchResponse() {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        utterances: SAMPLE_UTTERANCES,
        speakers: SAMPLE_SPEAKERS,
        mime: "audio/mpeg",
      }),
  };
}

function errorFetchResponse(code: string, message: string) {
  return {
    ok: false,
    json: () =>
      Promise.resolve({
        error: { code, message },
      }),
  };
}

// ─── Import under test ────────────────────────────────────────────────────────

import { MediaUrlIngestPane } from "@/components/session/ingest-panes/media-url-ingest-pane";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockBulkIngest.mockResolvedValue(undefined);
  mockSource = { kind: "media_url", url: "" };
  mockClipboardReadText = vi.fn();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      readText: mockClipboardReadText,
    },
  });
});

// ─── 1. Renders ───────────────────────────────────────────────────────────────

describe("MediaUrlIngestPane — renders", () => {
  it("renders the headline 'Paste a media URL'", () => {
    render(<MediaUrlIngestPane />);
    expect(screen.getByText(/Paste a media URL/i)).toBeTruthy();
  });

  it("renders the subtitle about MP3/MP4", () => {
    render(<MediaUrlIngestPane />);
    expect(screen.getByText(/podcast MP3.*MP4.*audio\/video/i)).toBeTruthy();
  });

  it("renders a URL input with the correct placeholder", () => {
    render(<MediaUrlIngestPane />);
    const input = screen.getByPlaceholderText(/https:\/\/example\.com\/episode\.mp3/i);
    expect(input.tagName.toLowerCase()).toBe("input");
    expect((input as HTMLInputElement).type).toBe("url");
  });

  it("prefills a shared media URL from the selected source", () => {
    mockSource = { kind: "media_url", url: VALID_URL };

    render(<MediaUrlIngestPane />);

    expect(screen.getByDisplayValue(VALID_URL)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Process$/i })).not.toBeDisabled();
  });

  it("renders the Process button", () => {
    render(<MediaUrlIngestPane />);
    expect(screen.getByRole("button", { name: /Process/i })).toBeTruthy();
  });

  it("renders a clipboard paste action", () => {
    render(<MediaUrlIngestPane />);
    expect(screen.getByRole("button", { name: "Paste media URL from clipboard" })).toBeTruthy();
  });

  it("renders a local validation media URL loader in development", () => {
    render(<MediaUrlIngestPane />);
    expect(screen.getByRole("button", { name: "Load validation media URL" })).toBeTruthy();
  });

  it("renders a local validation video URL loader in development", () => {
    render(<MediaUrlIngestPane />);
    expect(screen.getByRole("button", { name: "Load validation video URL" })).toBeTruthy();
  });

  it("renders the Back to sources button", () => {
    render(<MediaUrlIngestPane />);
    expect(screen.getByRole("button", { name: /Back to sources/i })).toBeTruthy();
  });
});

// ─── 2. Process button disabled state ────────────────────────────────────────

describe("MediaUrlIngestPane — Process button disabled state", () => {
  it("Process button is disabled when input is empty", () => {
    render(<MediaUrlIngestPane />);
    const btn = screen.getByRole("button", { name: /Process/i });
    expect(btn).toBeDisabled();
  });

  it("Process button is disabled for a non-URL string", () => {
    render(<MediaUrlIngestPane />);
    const input = screen.getByPlaceholderText(/episode\.mp3/i);
    fireEvent.change(input, { target: { value: INVALID_URL_FORMAT } });
    expect(screen.getByRole("button", { name: /Process/i })).toBeDisabled();
  });

  it("Process button is enabled after valid URL is entered", () => {
    render(<MediaUrlIngestPane />);
    const input = screen.getByPlaceholderText(/episode\.mp3/i);
    fireEvent.change(input, { target: { value: VALID_URL } });
    const btn = screen.getByRole("button", { name: /^Process$/i });
    expect(btn).not.toBeDisabled();
    expect(btn.className).toContain("text-white");
    expect(btn.className).not.toContain("text-bg");
    expect(screen.getByText(/Direct media URL recognized/i)).toBeTruthy();
    expect(screen.getByText("MP3")).toBeTruthy();
  });

  it("Process button is disabled again when URL is cleared", () => {
    render(<MediaUrlIngestPane />);
    const input = screen.getByPlaceholderText(/episode\.mp3/i);
    fireEvent.change(input, { target: { value: VALID_URL } });
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /Process/i })).toBeDisabled();
  });

  it("Process button is enabled for an http:// URL", () => {
    render(<MediaUrlIngestPane />);
    const input = screen.getByPlaceholderText(/episode\.mp3/i);
    fireEvent.change(input, { target: { value: "http://podcast.example.com/ep.mp3" } });
    expect(screen.getByRole("button", { name: /Process/i })).not.toBeDisabled();
  });

  it("pastes the first copied URL into the media URL field", async () => {
    mockClipboardReadText.mockResolvedValue(`Listen here ${VALID_URL}.`);

    render(<MediaUrlIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: "Paste media URL from clipboard" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Media URL")).toHaveValue(VALID_URL);
      expect(screen.getByText("URL pasted from clipboard.")).toBeTruthy();
      expect(screen.getByRole("button", { name: /^Process$/i })).not.toBeDisabled();
    });
  });

  it("shows a clipboard error when copied text has no URL", async () => {
    mockClipboardReadText.mockResolvedValue("episode notes only");

    render(<MediaUrlIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: "Paste media URL from clipboard" }));

    await waitFor(() => {
      expect(screen.getByText("Clipboard did not contain an http or https URL.")).toBeTruthy();
    });
  });
});

// ─── 3. Happy-path flow ───────────────────────────────────────────────────────

describe("MediaUrlIngestPane — happy path", () => {
  async function typeAndProcess(url = VALID_URL) {
    render(<MediaUrlIngestPane />);
    const input = screen.getByPlaceholderText(/episode\.mp3/i);
    fireEvent.change(input, { target: { value: url } });

    mockFetch.mockResolvedValueOnce(happyFetchResponse());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Process/i }));
    });
  }

  it("calls /api/media-ingest with POST and the entered URL", async () => {
    await typeAndProcess();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/media-ingest",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-yentl-source-consent": "source-analysis-v1",
          }),
          body: expect.stringContaining(VALID_URL),
        }),
      );
    });
  });

  it("calls setSource with kind: media_url and the URL", async () => {
    await typeAndProcess();
    await waitFor(() => {
      expect(mockSetSource).toHaveBeenCalledWith({
        kind: "media_url",
        url: VALID_URL,
      });
    });
  });

  it("calls bulkIngest with utterances and an AbortSignal", async () => {
    await typeAndProcess();
    await waitFor(() => {
      expect(mockBulkIngest).toHaveBeenCalledWith(
        SAMPLE_UTTERANCES,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          speakers: SAMPLE_SPEAKERS,
        }),
      );
    });
  });

  it("shows completion message after successful ingest", async () => {
    await typeAndProcess();
    await waitFor(() => {
      expect(screen.getByText(/Transcription complete/i)).toBeTruthy();
      expect(screen.getByText(/Opening the synchronized Watch view/i)).toBeTruthy();
    });
  });

  it("opens Watch after successful media ingest", async () => {
    await typeAndProcess();
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/session?view=watch");
    });
  });

  it("loads the local validation media URL through the same ingest path", async () => {
    render(<MediaUrlIngestPane />);
    mockFetch.mockResolvedValueOnce(happyFetchResponse());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Load validation media URL" }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Media URL")).toHaveValue(VALIDATION_MEDIA_URL);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/media-ingest",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-yentl-source-consent": "source-analysis-v1",
          }),
          body: JSON.stringify({ url: VALIDATION_MEDIA_URL }),
        }),
      );
      expect(mockSetSource).toHaveBeenCalledWith({
        kind: "media_url",
        url: VALIDATION_MEDIA_URL,
      });
      expect(mockBulkIngest).toHaveBeenCalledWith(
        SAMPLE_UTTERANCES,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          speakers: SAMPLE_SPEAKERS,
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/session?view=watch");
    });
  });

  it("loads the local validation video URL through the same ingest path", async () => {
    render(<MediaUrlIngestPane />);
    mockFetch.mockResolvedValueOnce(happyFetchResponse());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Load validation video URL" }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Media URL")).toHaveValue(VALIDATION_VIDEO_URL);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/media-ingest",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-yentl-source-consent": "source-analysis-v1",
          }),
          body: JSON.stringify({ url: VALIDATION_VIDEO_URL }),
        }),
      );
      expect(mockSetSource).toHaveBeenCalledWith({
        kind: "media_url",
        url: VALIDATION_VIDEO_URL,
      });
      expect(mockBulkIngest).toHaveBeenCalledWith(
        SAMPLE_UTTERANCES,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          speakers: SAMPLE_SPEAKERS,
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/session?view=watch");
    });
  });
});

// ─── 4. Error states ──────────────────────────────────────────────────────────

describe("MediaUrlIngestPane — error states", () => {
  async function typeAndProcessWithError(url: string, code: string, message: string) {
    render(<MediaUrlIngestPane />);
    const input = screen.getByPlaceholderText(/episode\.mp3/i);
    fireEvent.change(input, { target: { value: url } });

    mockFetch.mockResolvedValueOnce(errorFetchResponse(code, message));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Process/i }));
    });
  }

  it("shows private-address error copy for SSRF_BLOCKED", async () => {
    await typeAndProcessWithError(
      PRIVATE_IP_URL,
      "SSRF_BLOCKED",
      "resolved to a private address",
    );
    await waitFor(() => {
      expect(
        screen.getByText(/private \/ local addresses/i),
      ).toBeTruthy();
    });
  });

  it("shows direct recovery actions for blocked private media URLs", async () => {
    await typeAndProcessWithError(
      PRIVATE_IP_URL,
      "SSRF_BLOCKED",
      "resolved to a private address",
    );

    await waitFor(() => {
      expect(screen.getByText("Recovery")).toBeTruthy();
      expect(screen.getByText(/upload the file directly/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Use browser tab" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Upload file" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Paste transcript" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Use browser tab" }));
    expect(mockSetSource).toHaveBeenCalledWith({ kind: "browser_tab" });
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");

    fireEvent.click(screen.getByRole("button", { name: "Upload file" }));
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename: "",
      mime: "",
    });
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");

    fireEvent.click(screen.getByRole("button", { name: "Paste transcript" }));
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "",
      mime: "",
      byte_count: 0,
    });
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
  });

  it("shows invalid URL error copy for INVALID_URL", async () => {
    await typeAndProcessWithError(
      VALID_URL,
      "INVALID_URL",
      "Not a valid URL",
    );
    await waitFor(() => {
      expect(
        screen.getByText(/doesn.t look like a valid URL/i),
      ).toBeTruthy();
    });
  });

  it("explains unsupported media recovery without trapping the user on the failed URL", async () => {
    await typeAndProcessWithError(
      "https://example.com/document.pdf",
      "UNSUPPORTED_MEDIA",
      "Unsupported content type",
    );

    await waitFor(() => {
      expect(screen.getByText(/does not look like a direct audio\/video file/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Use browser tab" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Paste transcript" })).toBeTruthy();
    });
  });

  it("shows unsupported media error copy for UNSUPPORTED_MEDIA", async () => {
    await typeAndProcessWithError(
      "https://example.com/document.pdf",
      "UNSUPPORTED_MEDIA",
      "Unsupported content type",
    );
    await waitFor(() => {
      expect(
        screen.getByText(/only support direct audio\/video URLs/i),
      ).toBeTruthy();
    });
  });

  it("shows transcription error copy for TRANSCRIBE_FAILED", async () => {
    await typeAndProcessWithError(
      VALID_URL,
      "TRANSCRIBE_FAILED",
      "Deepgram quota exceeded",
    );
    await waitFor(() => {
      expect(screen.getByText("Transcription failed. Deepgram quota exceeded")).toBeTruthy();
      expect(screen.getByText(/Deepgram quota exceeded/i)).toBeTruthy();
    });
  });

  it("clears the error message when the user edits the URL", async () => {
    await typeAndProcessWithError(
      VALID_URL,
      "INVALID_URL",
      "Not a valid URL",
    );

    await waitFor(() => {
      expect(screen.getByText(/doesn.t look like a valid URL/i)).toBeTruthy();
    });

    const input = screen.getByPlaceholderText(/episode\.mp3/i);
    fireEvent.change(input, { target: { value: "https://other.example.com/ep.mp3" } });

    await waitFor(() => {
      expect(screen.queryByText(/doesn.t look like a valid URL/i)).toBeNull();
    });
  });
});

// ─── 5. Back navigation ───────────────────────────────────────────────────────

describe("MediaUrlIngestPane — navigation", () => {
  it("Back to sources calls setPrerecordStage('picker')", () => {
    render(<MediaUrlIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: /Back to sources/i }));
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
  });
});
