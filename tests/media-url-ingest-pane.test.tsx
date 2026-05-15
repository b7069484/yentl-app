import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

const { mockSetPrerecordStage, mockSetSource, mockBulkIngest, mockPush } = vi.hoisted(() => ({
  mockSetPrerecordStage: vi.fn(),
  mockSetSource: vi.fn(),
  mockBulkIngest: vi.fn().mockResolvedValue(undefined),
  mockPush: vi.fn(),
}));

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

// ─── Mock global fetch ─────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_URL = "https://example.com/episode.mp3";
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

  it("renders the Process button", () => {
    render(<MediaUrlIngestPane />);
    expect(screen.getByRole("button", { name: /Process/i })).toBeTruthy();
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
    expect(screen.getByRole("button", { name: /Process/i })).not.toBeDisabled();
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
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("shows completion message after successful ingest", async () => {
    await typeAndProcess();
    await waitFor(() => {
      expect(screen.getByText(/session is live/i)).toBeTruthy();
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
      expect(screen.getByText(/Transcription failed/i)).toBeTruthy();
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
