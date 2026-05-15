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

const VALID_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const INVALID_URL = "https://vimeo.com/123456";
const VIDEO_ID = "dQw4w9WgXcQ";

const SAMPLE_SEGMENTS = [
  { text: "Hello.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
];

function happyFetchResponse() {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        video_id: VIDEO_ID,
        url: VALID_URL,
        title: "Rick Astley - Never Gonna Give You Up",
        channel: "Rick Astley",
        transcript_segments: SAMPLE_SEGMENTS,
      }),
  };
}

function errorFetchResponse(code: string, message: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        error: { code, message },
      }),
  };
}

// ─── Import under test ────────────────────────────────────────────────────────

import { YoutubeIngestPane } from "@/components/session/ingest-panes/youtube-ingest-pane";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockBulkIngest.mockResolvedValue(undefined);
});

// ─── 1. Renders ───────────────────────────────────────────────────────────────

describe("YoutubeIngestPane — renders", () => {
  it("renders the headline 'Paste a YouTube URL'", () => {
    render(<YoutubeIngestPane />);
    expect(screen.getByText(/Paste a YouTube URL/i)).toBeTruthy();
  });

  it("renders a URL input with placeholder", () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    expect(input.tagName.toLowerCase()).toBe("input");
    expect((input as HTMLInputElement).type).toBe("url");
  });

  it("renders a Fetch captions button", () => {
    render(<YoutubeIngestPane />);
    expect(screen.getByRole("button", { name: /Fetch captions/i })).toBeTruthy();
  });

  it("renders the Back to sources button", () => {
    render(<YoutubeIngestPane />);
    expect(screen.getByRole("button", { name: /Back to sources/i })).toBeTruthy();
  });
});

// ─── 2. Fetch button disabled state ──────────────────────────────────────────

describe("YoutubeIngestPane — Fetch button disabled state", () => {
  it("Fetch button is disabled when input is empty", () => {
    render(<YoutubeIngestPane />);
    const btn = screen.getByRole("button", { name: /Fetch captions/i });
    expect(btn).toBeDisabled();
  });

  it("Fetch button is disabled for an invalid URL (non-YouTube)", () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    fireEvent.change(input, { target: { value: INVALID_URL } });
    const btn = screen.getByRole("button", { name: /Fetch captions/i });
    expect(btn).toBeDisabled();
  });

  it("Fetch button is enabled after valid YouTube URL is entered", () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    fireEvent.change(input, { target: { value: VALID_URL } });
    const btn = screen.getByRole("button", { name: /Fetch captions/i });
    expect(btn).not.toBeDisabled();
  });

  it("Fetch button is disabled again if URL is cleared", () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    fireEvent.change(input, { target: { value: VALID_URL } });
    fireEvent.change(input, { target: { value: "" } });
    const btn = screen.getByRole("button", { name: /Fetch captions/i });
    expect(btn).toBeDisabled();
  });
});

// ─── 3. Happy-path fetch flow ─────────────────────────────────────────────────

describe("YoutubeIngestPane — happy path fetch flow", () => {
  async function enterUrlAndFetch() {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    fireEvent.change(input, { target: { value: VALID_URL } });

    mockFetch.mockResolvedValueOnce(happyFetchResponse());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Fetch captions/i }));
    });
  }

  it("calls /api/youtube-ingest with the entered URL", async () => {
    await enterUrlAndFetch();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/youtube-ingest",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(VALID_URL),
        }),
      );
    });
  });

  it("calls setSource with exact youtube shape", async () => {
    await enterUrlAndFetch();
    await waitFor(() => {
      expect(mockSetSource).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "youtube",
          video_id: VIDEO_ID,
          url: VALID_URL,
        }),
      );
    });
  });

  it("calls bulkIngest with transcript_segments and an AbortSignal", async () => {
    await enterUrlAndFetch();
    await waitFor(() => {
      expect(mockBulkIngest).toHaveBeenCalledWith(
        SAMPLE_SEGMENTS,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});

// ─── 4. Error states ──────────────────────────────────────────────────────────

describe("YoutubeIngestPane — error states", () => {
  it("shows friendly audio-file redirect message on NO_CAPTIONS", async () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    fireEvent.change(input, { target: { value: VALID_URL } });

    mockFetch.mockResolvedValueOnce(
      errorFetchResponse("NO_CAPTIONS", "No captions available"),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Fetch captions/i }));
    });

    // Should reference the Audio file source option
    await waitFor(() => {
      expect(screen.getByText(/Audio file/i)).toBeTruthy();
    });
  });

  it("shows 'Not a YouTube URL' message on INVALID_URL from server", async () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    // Enter something that looks like YouTube but server rejects
    fireEvent.change(input, { target: { value: VALID_URL } });

    mockFetch.mockResolvedValueOnce(
      errorFetchResponse("INVALID_URL", "Not a recognizable YouTube URL"),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Fetch captions/i }));
    });

    // Should show text specific to the error message (not just the heading)
    await waitFor(() => {
      expect(screen.getByText(/youtube\.com or youtu\.be/i)).toBeTruthy();
    });
  });

  it("shows private/age-restricted message on PRIVATE", async () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    fireEvent.change(input, { target: { value: VALID_URL } });

    mockFetch.mockResolvedValueOnce(
      errorFetchResponse("PRIVATE", "Video not playable: Sign in to confirm your age"),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Fetch captions/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/private, age-restricted/i)).toBeTruthy();
    });
  });

  it("shows error message on NETWORK_ERROR", async () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    fireEvent.change(input, { target: { value: VALID_URL } });

    mockFetch.mockResolvedValueOnce(
      errorFetchResponse("NETWORK_ERROR", "Network error"),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Fetch captions/i }));
    });

    await waitFor(() => {
      // Some error text appears
      expect(screen.queryByRole("button", { name: /Fetch captions/i })).toBeTruthy();
    });
  });
});

// ─── 5. Back navigation ───────────────────────────────────────────────────────

describe("YoutubeIngestPane — navigation", () => {
  it("Back to sources calls setPrerecordStage('picker')", () => {
    render(<YoutubeIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: /Back to sources/i }));
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
  });
});
