import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

let mockSearchParamsRaw = new URLSearchParams("");
const mockReplace = vi.fn();
const mockLoadSession = vi.fn();
const mockLoadCloudSession = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  usePathname: () => "/session",
  useSearchParams: () => mockSearchParamsRaw,
}));

vi.mock("@/lib/source-kinds", () => ({
  PLAYABLE_SOURCE_KINDS: new Set(["youtube", "audio_file", "media_url"]),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ─── Mock child views ─────────────────────────────────────────────────────────

vi.mock("@/components/session/home-overview", () => ({
  HomeOverview: () => <div data-testid="home-overview">HomeOverview</div>,
}));

vi.mock("@/components/session/TranscriptView", () => ({
  TranscriptView: ({ variant }: { variant: string }) => (
    <div data-testid="transcript-view" data-variant={variant}>
      TranscriptView
    </div>
  ),
}));

vi.mock("@/components/session/filtered-list", () => ({
  FilteredList: () => <div data-testid="filtered-list">FilteredList</div>,
}));

vi.mock("@/components/session/watch-view", () => ({
  WatchView: () => <div data-testid="watch-view">WatchView</div>,
}));

vi.mock("@/components/session/extension-panel-view", () => ({
  ExtensionPanelView: () => <div data-testid="extension-panel-view">ExtensionPanelView</div>,
}));

vi.mock("@/components/session/source-review-view", () => ({
  SourceReviewView: () => <div data-testid="source-review-view">SourceReviewView</div>,
}));

// ─── Mock SourceRouter ────────────────────────────────────────────────────────

vi.mock("@/lib/client/source-router", () => ({
  SourceRouter: () => <div data-testid="source-router">SourceRouter</div>,
}));

// ─── Mock compliance siblings ─────────────────────────────────────────────────
// These were folded into SessionPage during the sprint-as-trunk reconciliation
// (2026-05-18). They use the non-selector useSession() pattern, which clashes
// with this test's selector-only mock; rendering stubs keeps the routing
// tests focused on their actual concern.

vi.mock("@/components/session/SessionTimer", () => ({
  SessionTimer: () => null,
}));
vi.mock("@/components/session/TwoPartyDisclosure", () => ({
  TwoPartyDisclosure: () => null,
}));
vi.mock("@/components/session/ClaimsLiveRegion", () => ({
  ClaimsLiveRegion: () => null,
}));
vi.mock("@/components/session/AIDisclosureFooter", () => ({
  AIDisclosureFooter: () => null,
}));

// ─── Mock session store ───────────────────────────────────────────────────────

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/lib/client/session-storage", () => ({
  loadSession: (...args: unknown[]) => mockLoadSession(...args),
}));

vi.mock("@/lib/client/session-sync", () => ({
  loadCloudSession: (...args: unknown[]) => mockLoadCloudSession(...args),
}));

import { useSession } from "@/lib/client/session-store";
import SessionPage from "@/app/session/page";

// ─── Store helpers ────────────────────────────────────────────────────────────

type StoreState = {
  startedAt: string | null;
  startSession: (title?: string) => void;
  restoreSession: (session: unknown) => void;
  prerecordStage: "picker" | "selected";
  source: { kind: string };
  setSource: (source: unknown) => void;
  setPrerecordStage: (stage: "picker" | "selected") => void;
  setBrowserTabStatus: (status: unknown) => void;
  setRecording: (recording: boolean) => void;
  setSynthesis: (synthesis: unknown) => void;
  ensureSpeaker: (id: number) => void;
  renameSpeaker: (id: number, label: string) => void;
  appendFinal: (segment: unknown) => void;
  addClaim: (claim: unknown) => void;
  addMarker: (marker: unknown) => void;
  reset: () => void;
};

function makeStore(overrides: Partial<StoreState> = {}): StoreState {
  return {
    startedAt: null,
    startSession: vi.fn(),
    restoreSession: vi.fn(),
    prerecordStage: "picker",
    // Default to a playable kind so view=watch tests don't redirect unexpectedly.
    source: { kind: "youtube" },
    setSource: vi.fn(),
    setPrerecordStage: vi.fn(),
    setBrowserTabStatus: vi.fn(),
    setRecording: vi.fn(),
    setSynthesis: vi.fn(),
    ensureSpeaker: vi.fn(),
    renameSpeaker: vi.fn(),
    appendFinal: vi.fn(),
    addClaim: vi.fn(),
    addMarker: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function mockStore(state: StoreState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: StoreState) => unknown) => selector(state),
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsRaw = new URLSearchParams("");
  mockLoadSession.mockResolvedValue({
    session: {
      title: "Restored",
      started_at: "2026-05-21T10:00:00.000Z",
      transcript: [],
      claims: [],
      markers: [],
      speakers: [],
      source: { kind: "browser_tab" },
    },
  });
  mockLoadCloudSession.mockResolvedValue({
    ok: false,
    status: "signed_out",
    message: "Sign in to sync saved sessions across devices.",
  });
  mockStore(makeStore());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ─── 1. SourceRouter renders when startedAt === null ─────────────────────────

describe("SessionPage – SourceRouter state (pre-record)", () => {
  it("renders SourceRouter when startedAt is null", () => {
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(screen.getByTestId("source-router")).toBeTruthy();
  });

  it("does not render view content when startedAt is null", () => {
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(screen.queryByTestId("home-overview")).toBeNull();
    expect(screen.queryByTestId("transcript-view")).toBeNull();
    expect(screen.queryByTestId("filtered-list")).toBeNull();
  });

  it("does not redirect legacy flow-atlas queries into the project workspace", () => {
    mockSearchParamsRaw = new URLSearchParams("view=flows");
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(mockReplace).not.toHaveBeenCalledWith("/project/flows");
    expect(screen.getByTestId("source-router")).toBeTruthy();
  });

  it("selects the claim-only quick-check pane from the source query", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("source=claim");
    mockStore(makeStore({
      startedAt: null,
      prerecordStage: "picker",
      source: { kind: "mic" },
      setSource,
      setPrerecordStage,
    }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(setSource).toHaveBeenCalledWith({
        kind: "text_doc",
        filename: "Claim quick check",
        mime: "text/plain",
        byte_count: 0,
        intent: "claim_only",
      });
    });
    expect(setPrerecordStage).toHaveBeenCalledWith("selected");
  });

  it("ignores corpus sample queries unless the validation demo flag is present", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    mockSearchParamsRaw = new URLSearchParams("sample=solo_005&view=watch");
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(screen.queryByText("Loading corpus sample")).toBeNull();
    expect(screen.getByTestId("source-router")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores validation demo samples when local demo loading is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO", "1");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    mockSearchParamsRaw = new URLSearchParams("demo=validation&sample=solo_005&view=watch");
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(screen.queryByText("Loading validation demo")).toBeNull();
    expect(screen.getByTestId("source-router")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets the validation demo kill switch override an explicit public enable flag", () => {
    vi.stubEnv("NEXT_PUBLIC_YENTL_ENABLE_VALIDATION_DEMO", "1");
    vi.stubEnv("NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO", "1");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    mockSearchParamsRaw = new URLSearchParams("demo=validation&sample=solo_005&view=watch");
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);

    expect(screen.queryByText("Loading validation demo")).toBeNull();
    expect(screen.getByTestId("source-router")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hydrates validation demo synthesis into the live session store", async () => {
    const setSynthesis = vi.fn();
    const renameSpeaker = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "solo_005",
        title: "Sample clip",
        category: "solo",
        url: "https://youtu.be/example",
        source: { kind: "youtube", video_id: "example", url: "https://youtu.be/example" },
        speakers: [{ id: 0, label: "Speaker 1" }],
        segments: [{ text: "A claim.", start: 0, end: 2, is_final: true, speaker_id: 0 }],
        claims: [],
        markers: [],
        synthesis: {
          text: "Validation replay for Sample clip.",
          headlines: ["1 claim loaded", "No markers bundled", "Replay verdicts included"],
          per_speaker_verdicts: [
            {
              speaker_id: 0,
              label: "Speaker 1",
              factual_grade: "insufficient",
              faith_grade: "insufficient",
              one_liner: "No claim or marker evidence is bundled for Speaker 1.",
            },
          ],
        },
      }),
    } as Response);
    mockSearchParamsRaw = new URLSearchParams("demo=validation&sample=solo_005&view=overview");
    mockStore(makeStore({ startedAt: null, renameSpeaker, setSynthesis }));

    render(<SessionPage />);

    expect(screen.getByText("Loading validation demo")).toBeTruthy();
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/corpus-sample?id=solo_005");
      expect(renameSpeaker).toHaveBeenCalledWith(0, "Speaker 1");
      expect(setSynthesis).toHaveBeenCalledWith(
        expect.objectContaining({
          state: "fresh",
          text: "Validation replay for Sample clip.",
          per_speaker_verdicts: expect.arrayContaining([
            expect.objectContaining({ label: "Speaker 1" }),
          ]),
        }),
      );
    });
  });

  it("renders the compact extension panel surface before capture starts", () => {
    mockSearchParamsRaw = new URLSearchParams("surface=extension-panel&source=browser-tab&bridge=test");
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(screen.getByTestId("extension-panel-view")).toBeTruthy();
    expect(screen.queryByTestId("source-router")).toBeNull();
  });

  it("routes a mobile share target YouTube URL into the YouTube pane", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    const reset = vi.fn();
    mockSearchParamsRaw = new URLSearchParams(
      "title=Shared%20video&url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ",
    );
    mockStore(makeStore({ startedAt: null, reset, setSource, setPrerecordStage }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(reset).toHaveBeenCalledOnce();
      expect(setSource).toHaveBeenCalledWith({
        kind: "youtube",
        video_id: "",
        url: "https://youtu.be/dQw4w9WgXcQ",
        title: "Shared video",
      });
      expect(setPrerecordStage).toHaveBeenCalledWith("selected");
      expect(mockReplace).toHaveBeenCalledWith("/session");
    });
  });

  it("routes an explicit source=youtube URL into the YouTube pane", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    mockSearchParamsRaw = new URLSearchParams(
      "source=youtube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DIDC8PrZQHts",
    );
    mockStore(makeStore({
      startedAt: null,
      source: { kind: "mic" },
      setSource,
      setPrerecordStage,
    }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(setSource).toHaveBeenCalledWith({
        kind: "youtube",
        video_id: "",
        url: "https://www.youtube.com/watch?v=IDC8PrZQHts",
      });
      expect(setPrerecordStage).toHaveBeenCalledWith("selected");
    });
  });

  it("routes an explicit source=audio-file URL into the upload pane", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("source=audio-file");
    mockStore(makeStore({
      startedAt: null,
      source: { kind: "mic" },
      setSource,
      setPrerecordStage,
    }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(setSource).toHaveBeenCalledWith({
        kind: "audio_file",
        blob_url: "",
        duration_sec: 0,
        filename: "",
        mime: "",
      });
      expect(setPrerecordStage).toHaveBeenCalledWith("selected");
    });
  });

  it("routes an explicit source=media-url URL into the direct media pane", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("source=media-url&url=https%3A%2F%2Fexample.com%2Fepisode.mp3");
    mockStore(makeStore({
      startedAt: null,
      source: { kind: "mic" },
      setSource,
      setPrerecordStage,
    }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(setSource).toHaveBeenCalledWith({
        kind: "media_url",
        url: "https://example.com/episode.mp3",
      });
      expect(setPrerecordStage).toHaveBeenCalledWith("selected");
    });
  });

  it("routes an explicit source=text-doc URL into the transcript pane", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("source=text-doc");
    mockStore(makeStore({
      startedAt: null,
      source: { kind: "mic" },
      setSource,
      setPrerecordStage,
    }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(setSource).toHaveBeenCalledWith({
        kind: "text_doc",
        filename: "",
        mime: "",
        byte_count: 0,
      });
      expect(setPrerecordStage).toHaveBeenCalledWith("selected");
    });
  });

  it("routes an explicit source=web-url URL into the article URL pane", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("source=web-url");
    mockStore(makeStore({
      startedAt: null,
      source: { kind: "mic" },
      setSource,
      setPrerecordStage,
    }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(setSource).toHaveBeenCalledWith({
        kind: "text_doc",
        filename: "",
        mime: "text/html",
        byte_count: 0,
        intent: "web_url",
        source_url: "",
      });
      expect(setPrerecordStage).toHaveBeenCalledWith("selected");
    });
  });

  it("routes shared text into a prefilled text document pane", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("title=Shared%20note&text=The%20claim%20is%20specific.");
    mockStore(makeStore({ startedAt: null, setSource, setPrerecordStage }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(setSource).toHaveBeenCalledWith({
        kind: "text_doc",
        filename: "Shared text",
        mime: "text/plain",
        byte_count: "Shared note\n\nThe claim is specific.".length,
        initial_text: "Shared note\n\nThe claim is specific.",
      });
      expect(setPrerecordStage).toHaveBeenCalledWith("selected");
    });
  });

  it("does not duplicate the title when shared text already starts with it", async () => {
    const setSource = vi.fn();
    const setPrerecordStage = vi.fn();
    mockSearchParamsRaw = new URLSearchParams(
      "title=Shared%20note&text=Shared%20note%0A%0AThe%20claim%20is%20specific.",
    );
    mockStore(makeStore({ startedAt: null, setSource, setPrerecordStage }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(setSource).toHaveBeenCalledWith({
        kind: "text_doc",
        filename: "Shared text",
        mime: "text/plain",
        byte_count: "Shared note\n\nThe claim is specific.".length,
        initial_text: "Shared note\n\nThe claim is specific.",
      });
      expect(setPrerecordStage).toHaveBeenCalledWith("selected");
    });
  });

  it("restores a saved extension workspace from ?restore=", async () => {
    const restoreSession = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("restore=saved-session-1");
    mockStore(makeStore({ startedAt: null, restoreSession }));

    render(<SessionPage />);

    expect(screen.getByText("Opening workspace")).toBeTruthy();
    await waitFor(() => {
      expect(mockLoadSession).toHaveBeenCalledWith("saved-session-1");
      expect(restoreSession).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Restored" }),
      );
      expect(mockReplace).toHaveBeenCalledWith("/session?view=overview");
    });
  });

  it("falls back to cloud restore when the local saved session is missing", async () => {
    mockLoadSession.mockRejectedValue(new Error("Session not found: cloud-id"));
    mockLoadCloudSession.mockResolvedValue({
      ok: true,
      data: {
        id: "cloud-id",
        name: "Cloud session",
        source_kind: "mic",
        saved_at: "2026-06-09T12:00:00.000Z",
        started_at: "2026-06-09T11:00:00.000Z",
        ended_at: null,
        claim_count: 0,
        marker_count: 0,
        speaker_count: 0,
        source_count: 0,
        source_linked_count: 0,
        high_source_count: 0,
        duration_sec: 60,
        session: {
          title: "Cloud session",
          started_at: "2026-06-09T11:00:00.000Z",
          transcript: [],
          claims: [],
          markers: [],
          speakers: [],
          source: { kind: "mic" },
        },
      },
    });
    const restoreSession = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("restore=cloud-id");
    mockStore(makeStore({ startedAt: null, restoreSession }));

    render(<SessionPage />);

    await waitFor(() => {
      expect(mockLoadSession).toHaveBeenCalledWith("cloud-id");
      expect(mockLoadCloudSession).toHaveBeenCalledWith("cloud-id");
      expect(restoreSession).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Cloud session" }),
      );
      expect(mockReplace).toHaveBeenCalledWith("/session?view=overview");
    });
  });

  it("shows an explanatory empty state when a restore id is missing", async () => {
    mockLoadSession.mockRejectedValue(new Error("Session not found: missing-id"));
    const restoreSession = vi.fn();
    mockSearchParamsRaw = new URLSearchParams("restore=missing-id");
    mockStore(makeStore({ startedAt: null, restoreSession }));

    render(<SessionPage />);

    expect(screen.getByText("Opening workspace")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText("Saved snapshot not found")).toBeTruthy(),
    );
    expect(screen.getByText(/could not find that saved session locally or in account sync/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open saved sessions" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start a new analysis" })).toBeTruthy();
    expect(restoreSession).not.toHaveBeenCalled();
  });
});

// ─── 2. After startedAt set — view dispatch ───────────────────────────────────

describe("SessionPage – view dispatch (startedAt set)", () => {
  const startedAt = new Date().toISOString();

  it("view=overview (default) renders HomeOverview", () => {
    mockSearchParamsRaw = new URLSearchParams("");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(screen.getByTestId("home-overview")).toBeTruthy();
  });

  it("no ?view= param falls back to overview", () => {
    mockSearchParamsRaw = new URLSearchParams("");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(screen.getByTestId("home-overview")).toBeTruthy();
    expect(screen.queryByTestId("transcript-view")).toBeNull();
  });

  it("view=transcript renders TranscriptView with compact variant", () => {
    mockSearchParamsRaw = new URLSearchParams("view=transcript");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    const tv = screen.getByTestId("transcript-view");
    expect(tv).toBeTruthy();
    expect(tv.dataset.variant).toBe("compact");
  });

  it("view=claims renders FilteredList", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(screen.getByTestId("filtered-list")).toBeTruthy();
  });

  it("view=markers renders FilteredList", () => {
    mockSearchParamsRaw = new URLSearchParams("view=markers");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(screen.getByTestId("filtered-list")).toBeTruthy();
  });

  it("view=source renders SourceReviewView", () => {
    mockSearchParamsRaw = new URLSearchParams("view=source");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(screen.getByTestId("source-review-view")).toBeTruthy();
  });

  it("view=flows falls back to the product overview", () => {
    mockSearchParamsRaw = new URLSearchParams("view=flows");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(mockReplace).not.toHaveBeenCalledWith("/project/flows");
    expect(screen.getByTestId("home-overview")).toBeTruthy();
  });

  it("unknown view falls back to HomeOverview", () => {
    mockSearchParamsRaw = new URLSearchParams("view=unknown-view");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(screen.getByTestId("home-overview")).toBeTruthy();
  });
});

// ─── 3. SourceRouter does not render after start ─────────────────────────────

describe("SessionPage – no SourceRouter after start", () => {
  it("does not show SourceRouter when startedAt is set", () => {
    mockStore(makeStore({ startedAt: new Date().toISOString() }));
    render(<SessionPage />);
    expect(screen.queryByTestId("source-router")).toBeNull();
  });
});
