import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const {
  mockReset,
  mockSetPrerecordStage,
  mockSetRecording,
  mockSetSource,
  mockSetInterim,
  mockAppendFinal,
  mockSetBrowserTabStatus,
  mockSetPendingYouTubeCaptions,
  mockStartSession,
  mockPush,
  mockCreateYouTubeAdapter,
  mockYouTubeEvents,
  mockDestroy,
  mockOpenDeepgramStream,
  mockDeepgramSend,
  mockDeepgramClose,
  mockDeepgramEvents,
  mockStartDisplayAudioCapture,
  mockDisplayCaptureStop,
  mockOnFinalUtterance,
  mockRunSynthesisNow,
} = vi.hoisted(() => ({
  mockReset: vi.fn(),
  mockSetPrerecordStage: vi.fn(),
  mockSetRecording: vi.fn(),
  mockSetSource: vi.fn(),
  mockSetInterim: vi.fn(),
  mockAppendFinal: vi.fn(),
  mockSetBrowserTabStatus: vi.fn(),
  mockSetPendingYouTubeCaptions: vi.fn(),
  mockStartSession: vi.fn(),
  mockPush: vi.fn(),
  mockCreateYouTubeAdapter: vi.fn(),
  mockYouTubeEvents: { current: null as null | {
    onTimeUpdate: (time: number) => void;
    onReady: () => void;
  } },
  mockDestroy: vi.fn(),
  mockOpenDeepgramStream: vi.fn(),
  mockDeepgramSend: vi.fn(),
  mockDeepgramClose: vi.fn(),
  mockDeepgramEvents: { current: null as null | {
    onInterim: (text: string) => void;
    onFinal: (segment: import("@/lib/types").TranscriptSegment) => void;
    onError: (error: unknown) => void;
    onClose: () => void;
  } },
  mockStartDisplayAudioCapture: vi.fn(),
  mockDisplayCaptureStop: vi.fn(),
  mockOnFinalUtterance: vi.fn(),
  mockRunSynthesisNow: vi.fn(),
}));

let mockSource: { kind: string; video_id: string; url: string } = {
  kind: "youtube",
  video_id: "",
  url: "",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      reset: mockReset,
      setPrerecordStage: mockSetPrerecordStage,
      setRecording: mockSetRecording,
      setSource: mockSetSource,
      setInterim: mockSetInterim,
      appendFinal: mockAppendFinal,
      setBrowserTabStatus: mockSetBrowserTabStatus,
      setPendingYouTubeCaptions: mockSetPendingYouTubeCaptions,
      startSession: mockStartSession,
      claims: [],
      markers: [],
      source: mockSource,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/client/youtube-adapter", () => ({
  createYouTubeAdapter: mockCreateYouTubeAdapter,
}));

vi.mock("@/lib/client/deepgram-stream", () => ({
  openDeepgramStream: (...args: unknown[]) => mockOpenDeepgramStream(...args),
}));

vi.mock("@/lib/client/display-audio-capture", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client/display-audio-capture")>();
  return {
    ...actual,
    startDisplayAudioCapture: (...args: unknown[]) => mockStartDisplayAudioCapture(...args),
  };
});

vi.mock("@/lib/client/orchestrator", () => ({
  onFinalUtterance: (...args: unknown[]) => mockOnFinalUtterance(...args),
  runSynthesisNow: (...args: unknown[]) => mockRunSynthesisNow(...args),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockOpen = vi.fn();
vi.stubGlobal("open", mockOpen);

const VALID_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const INVALID_URL = "https://vimeo.com/123456";
const VIDEO_ID = "dQw4w9WgXcQ";

const SAMPLE_SEGMENTS = [
  { text: "Hello.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
  { text: "This is live.", start: 2, end: 4, is_final: true, speaker_id: 0 },
];

function mockFetchByRoute(kind: "success" | "no-captions" | "invalid" | "private" | "network" = "success") {
  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/youtube-preview")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          video_id: VIDEO_ID,
          url: VALID_URL,
          title: "Rick Astley - Never Gonna Give You Up",
          channel: "Rick Astley",
          thumbnail_url: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
          thumbnail_source: "youtube-oembed",
          caption_precheck: "checked-on-fetch",
        }),
      });
    }

    if (kind === "success") {
      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({
          video_id: VIDEO_ID,
          url: VALID_URL,
          title: "Rick Astley - Never Gonna Give You Up",
          channel: "Rick Astley",
          transcript_segments: SAMPLE_SEGMENTS,
        }),
      });
    }

    const error =
      kind === "no-captions"
        ? { code: "NO_CAPTIONS", message: "No captions available" }
        : kind === "invalid"
          ? { code: "INVALID_URL", message: "Not a recognizable YouTube URL" }
          : kind === "private"
            ? { code: "PRIVATE", message: "Video not playable" }
            : { code: "NETWORK_ERROR", message: "Network error" };

    return Promise.resolve({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve({ error }),
    });
  });
}

import { YoutubeIngestPane } from "@/components/session/ingest-panes/youtube-ingest-pane";

beforeEach(() => {
  vi.clearAllMocks();
  mockSource = { kind: "youtube", video_id: "", url: "" };
  mockYouTubeEvents.current = null;
  mockCreateYouTubeAdapter.mockImplementation(async (options) => {
    mockYouTubeEvents.current = {
      onTimeUpdate: options.onTimeUpdate,
      onReady: options.onReady,
    };
    options.onReady();
    return { seekTo: vi.fn(), destroy: mockDestroy };
  });
  mockOpenDeepgramStream.mockImplementation(async (events) => {
    mockDeepgramEvents.current = events;
    return { send: mockDeepgramSend, close: mockDeepgramClose, sessionStart: 0 };
  });
  mockStartDisplayAudioCapture.mockResolvedValue({
    stream: {},
    audioStream: {},
    recorder: {},
    stop: mockDisplayCaptureStop,
  });
  mockOnFinalUtterance.mockResolvedValue(undefined);
  mockRunSynthesisNow.mockResolvedValue(undefined);
  mockFetchByRoute("success");
});

describe("YoutubeIngestPane - live watch UI", () => {
  it("renders the YouTube live-watch headline and primary player shell", () => {
    render(<YoutubeIngestPane />);

    expect(screen.getByText(/Paste a YouTube link and watch here/i)).toBeTruthy();
    expect(screen.getByText(/Yentl's Read/i)).toBeTruthy();
    expect(screen.getByTestId("yentl-read-card")).toHaveAttribute("data-read-tone", "calm");
    expect(screen.getByTestId("youtube-player-shell")).toBeTruthy();
    expect(screen.queryByAltText(/YouTube video thumbnail/i)).toBeNull();
  });

  it("renders a URL input and Start live analysis button", () => {
    render(<YoutubeIngestPane />);

    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);
    expect(input.tagName.toLowerCase()).toBe("input");
    expect(screen.getByRole("button", { name: /Start live analysis/i })).toBeTruthy();
  });

  it("keeps metric explanations collapsed until a metric is selected", () => {
    render(<YoutubeIngestPane />);

    expect(screen.queryByText(/Pulse: waiting for the first live turn/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Pulse/i }));
    expect(screen.getByText(/Pulse: waiting for the first live turn/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Pulse/i }));
    expect(screen.queryByText(/Pulse: waiting for the first live turn/i)).toBeNull();
  });

  it("prefills a shared YouTube URL from the selected source", () => {
    mockSource = {
      kind: "youtube",
      video_id: "",
      url: VALID_URL,
    };

    render(<YoutubeIngestPane />);

    expect(screen.getByDisplayValue(VALID_URL)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start live analysis/i })).not.toBeDisabled();
  });

  it("disables Start live analysis until the URL is a supported YouTube URL", () => {
    render(<YoutubeIngestPane />);
    const input = screen.getByPlaceholderText(/youtube\.com\/watch/i);

    expect(screen.getByRole("button", { name: /Start live analysis/i })).toBeDisabled();
    fireEvent.change(input, { target: { value: INVALID_URL } });
    expect(screen.getByRole("button", { name: /Start live analysis/i })).toBeDisabled();
    fireEvent.change(input, { target: { value: VALID_URL } });
    expect(screen.getByRole("button", { name: /Start live analysis/i })).not.toBeDisabled();
  });

  it("loads a real player in the left-side YouTube surface when a valid URL is entered", async () => {
    render(<YoutubeIngestPane />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: VALID_URL },
    });

    await waitFor(() => {
      expect(mockCreateYouTubeAdapter).toHaveBeenCalledWith(
        expect.objectContaining({ videoId: VIDEO_ID }),
      );
    });
  });
});

describe("YoutubeIngestPane - synced caption handoff", () => {
  async function enterUrlAndStart() {
    render(<YoutubeIngestPane />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: VALID_URL },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Start live analysis/i }));
    });
  }

  it("calls /api/youtube-ingest with source-analysis consent", async () => {
    await enterUrlAndStart();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/youtube-ingest",
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

  it("keeps the player in place and releases timed captions against playback", async () => {
    await enterUrlAndStart();

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
      expect(mockSetSource).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "youtube",
          video_id: VIDEO_ID,
          url: VALID_URL,
        }),
      );
      expect(mockStartSession).not.toHaveBeenCalled();
      expect(mockSetRecording).toHaveBeenCalledWith(false);
      expect(screen.getByText(/Press play\. Yentl will release 2 timed caption lines/i)).toBeTruthy();
    });

    expect(mockSetPendingYouTubeCaptions).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      mockYouTubeEvents.current?.onTimeUpdate(0.5);
    });

    await waitFor(() => {
      expect(mockAppendFinal).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Hello.", start: 0 }),
      );
      expect(mockOnFinalUtterance).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Hello.", start: 0 }),
      );
      expect(screen.getByTestId("youtube-caption-transcript").textContent).toContain("Hello.");
      expect(screen.getByRole("button", { name: /Live analysis running/i })).toBeDisabled();
    });
  });

  it("labels debate speakers from the YouTube title and splits mixed caption turns", async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const route = String(input);
      const metadata = {
        video_id: VIDEO_ID,
        url: VALID_URL,
        title: "Tucker Debates Kevin O'Leary in Heated Exchange",
        channel: "Tucker Carlson Network",
        thumbnail_url: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
        thumbnail_source: "youtube-oembed",
        caption_precheck: "checked-on-fetch",
      };

      if (route.startsWith("/api/youtube-preview")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(metadata),
        });
      }

      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({
          ...metadata,
          transcript_segments: [
            { text: "They don't. Um But why are you", start: 0, end: 3, is_final: true, speaker_id: null },
            { text: "getting tax breaks is my question?", start: 3, end: 4, is_final: true, speaker_id: null },
          ],
        }),
      });
    });

    await enterUrlAndStart();

    act(() => {
      mockYouTubeEvents.current?.onTimeUpdate(4.5);
    });

    await waitFor(() => {
      const text = screen.getByTestId("youtube-caption-transcript").textContent ?? "";
      expect(text).toContain("Kevin O'Leary");
      expect(text).toContain("Tucker Carlson");
      expect(text).toContain("They don't. Um");
      expect(text).toContain("But why are you getting tax breaks is my question?");
      expect(text).not.toContain("Um But why");
    });
  });
});

describe("YoutubeIngestPane - caption failure recovery", () => {
  it("keeps the player-first UX and tells the user to use live tab capture when captions are missing", async () => {
    mockFetchByRoute("no-captions");
    render(<YoutubeIngestPane />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: VALID_URL },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Start live analysis/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("youtube-live-player")).toBeTruthy();
      expect(screen.getByText(/This video needs live tab capture/i)).toBeTruthy();
      expect(screen.getByTestId("yentl-read-card")).toHaveAttribute("data-read-tone", "contentious");
      expect(screen.getAllByText(/Share tab audio/i).length).toBeGreaterThan(0);
    });
  });

  it("starts in-page tab-audio capture and routes live transcript into analysis", async () => {
    mockFetchByRoute("no-captions");
    render(<YoutubeIngestPane />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: VALID_URL },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Start live analysis/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Share tab audio with Yentl/i })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Share tab audio with Yentl/i }));
    });

    await waitFor(() => {
      expect(mockStartDisplayAudioCapture).toHaveBeenCalled();
      expect(mockOpenDeepgramStream).toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /Stop tab audio/i })).toBeTruthy();
    });

    act(() => {
      mockDeepgramEvents.current?.onFinal({
        text: "This is live from the video.",
        start: 0,
        end: 1.2,
        is_final: true,
        speaker_id: 0,
      });
    });

    expect(mockAppendFinal).toHaveBeenCalledWith(
      expect.objectContaining({ text: "This is live from the video." }),
    );
    expect(mockOnFinalUtterance).toHaveBeenCalledWith(
      expect.objectContaining({ text: "This is live from the video." }),
    );
    expect(screen.getByTestId("yentl-read-card")).toHaveAttribute("data-read-tone", "mixed");
    expect(screen.getByTestId("youtube-tab-audio-transcript").textContent).toContain(
      "This is live from the video.",
    );
  });

  it("lets the user recover with browser tab capture", async () => {
    mockFetchByRoute("no-captions");
    render(<YoutubeIngestPane />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: VALID_URL },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Start live analysis/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/This video needs live tab capture/i)).toBeTruthy();
    });

    const browserButtons = screen.getAllByRole("button", { name: /Browser tab/i });
    fireEvent.click(browserButtons[browserButtons.length - 1]);

    expect(mockSetSource).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "browser_tab", url: VALID_URL }),
    );
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
  });

  it("can open the original video on YouTube for extension capture", async () => {
    render(<YoutubeIngestPane />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: VALID_URL },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Open on YouTube/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Open on YouTube/i }));
    expect(mockOpen).toHaveBeenCalledWith(VALID_URL, "_blank", "noopener,noreferrer");
  });

  it("shows URL guidance on INVALID_URL from the server", async () => {
    mockFetchByRoute("invalid");
    render(<YoutubeIngestPane />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: VALID_URL },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Start live analysis/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/youtube\.com or youtu\.be/i)).toBeTruthy();
    });
  });

  it("shows private/age-restricted guidance on PRIVATE", async () => {
    mockFetchByRoute("private");
    render(<YoutubeIngestPane />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com\/watch/i), {
      target: { value: VALID_URL },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Start live analysis/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/private, age-restricted/i)).toBeTruthy();
    });
  });
});

describe("YoutubeIngestPane - navigation", () => {
  it("Back to sources calls setPrerecordStage('picker')", () => {
    render(<YoutubeIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: /Back to sources/i }));
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
  });
});
