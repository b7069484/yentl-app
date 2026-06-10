import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker, Speaker, TranscriptSegment, SessionSource } from "@/lib/types";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

let mockSearchParamsRaw = new URLSearchParams("");
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => "/session",
  useSearchParams: () => mockSearchParamsRaw,
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

// ─── Mock child components to isolate SessionShell ───────────────────────────

vi.mock("@/components/session/ExportDialog", () => ({
  ExportDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="export-dialog">
        <button onClick={onClose}>Close Export</button>
      </div>
    ) : null,
}));

vi.mock("@/components/session/EndSessionDialog", () => ({
  EndSessionDialog: ({
    open,
    onClose,
    onSaveFirst,
    onExportFirst,
  }: {
    open: boolean;
    onClose: () => void;
    onSaveFirst?: () => void;
    onExportFirst?: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="end-session-dialog">
        <button onClick={onSaveFirst}>Save first</button>
        <button onClick={onExportFirst}>Export first</button>
        <button onClick={onClose}>Close End</button>
      </div>
    ) : null,
}));

vi.mock("@/components/session/SaveSessionDialog", () => ({
  SaveSessionDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="save-session-dialog">
        <button onClick={onClose}>Close Save</button>
      </div>
    ) : null,
}));

vi.mock("@/components/session/speaker-rail", () => ({
  SpeakerRail: ({
    speakers,
    activeSpeakerId,
    onRename,
  }: {
    speakers: Speaker[];
    activeSpeakerId: number | null;
    onRename: (id: number, label: string) => void;
  }) => (
    <div
      data-testid="speaker-rail"
      data-active-id={activeSpeakerId}
      data-speaker-count={speakers.length}
    >
      {speakers.map((s) => (
        <span key={s.id} data-testid={`speaker-${s.id}`}>
          {s.label}
        </span>
      ))}
      <button onClick={() => onRename(0, "Alice")}>rename</button>
    </div>
  ),
}));

vi.mock("@/components/session/ExtensionBridge", () => ({
  stopBrowserTabCapture: vi.fn(),
}));

// ─── Mock useSession store ────────────────────────────────────────────────────

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";
import { SessionShell, useElapsed } from "@/components/session/session-shell";
import { stopBrowserTabCapture } from "@/components/session/ExtensionBridge";

// ─── Store helpers ────────────────────────────────────────────────────────────

type StoreState = {
  startedAt: string | null;
  endedAt: string | null;
  isRecording: boolean;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  speakers: Speaker[];
  source: SessionSource;
  browserTabStatus: {
    phase:
      | "idle"
      | "waiting_for_extension"
      | "extension_connected"
      | "capturing"
      | "transcribing"
      | "no_audio_detected"
      | "stopped"
      | "error";
  };
  setRecording: (b: boolean) => void;
  reset: () => void;
  renameSpeaker: (id: number, label: string) => void;
};

function makeDefaultStoreState(overrides: Partial<StoreState> = {}): StoreState {
  return {
    startedAt: "2026-05-20T00:00:00.000Z",
    endedAt: null,
    isRecording: false,
    transcript: [],
    claims: [],
    markers: [],
    speakers: [],
    source: { kind: "mic" },
    browserTabStatus: { phase: "idle" },
    setRecording: vi.fn(),
    reset: vi.fn(),
    renameSpeaker: vi.fn(),
    ...overrides,
  };
}

function mockStore(state: StoreState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: StoreState) => unknown) => selector(state),
  );
}

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "c-" + Math.random(),
    claim_text: "Some claim",
    utterance_start: 0,
    utterance_end: 5,
    speaker_id: 0,
    topic: "politics",
    topic_secondary: null,
    primary_label: "FALSE",
    score: 10,
    annotations: [],
    explanation: "",
    status: "confirmed",
    sources: [],
    ...overrides,
  };
}

function makeMarker(overrides: Partial<RhetoricMarker> = {}): RhetoricMarker {
  return {
    id: "m-" + Math.random(),
    type: "fallacy",
    name: "straw-man",
    display: "Straw Man",
    excerpt: "...",
    speaker_id: 0,
    start_time: 0,
    end_time: 5,
    severity: "clear",
    explanation: "",
    ...overrides,
  };
}

function makeSegment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    text: "Hello",
    start: 0,
    end: 2,
    is_final: true,
    speaker_id: 0,
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSearchParamsRaw = new URLSearchParams("");
  mockRouterPush.mockClear();
  mockStore(makeDefaultStoreState());
});

// ─── 1. Renders brand mark + live pill + tabs + controls ─────────────────────

describe("SessionShell – basic render", () => {
  it("hides session chrome before a session starts", () => {
    mockStore(makeDefaultStoreState({ startedAt: null }));
    render(<SessionShell>Body</SessionShell>);

    expect(screen.queryByRole("link", { name: /yentl/i })).toBeNull();
    expect(screen.queryByText("Idle")).toBeNull();
    expect(screen.queryByText("Overview")).toBeNull();
    expect(screen.queryByRole("button", { name: /Export/ })).toBeNull();
    expect(screen.queryByTestId("speaker-rail")).toBeNull();
    expect(screen.getByText("Body")).toBeTruthy();
  });

  it("renders brand mark (yentl link)", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    const link = screen.getAllByRole("link").find((l) =>
      l.textContent?.includes("yentl"),
    );
    expect(link).toBeTruthy();
    expect(link?.className).toContain("min-h-11");
    expect(link?.className).toContain("items-center");
  });

  it("renders the live pill", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Paused")).toBeTruthy();
  });

  it("renders user-facing session tabs", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("Transcript")).toBeTruthy();
    expect(screen.getByText(/Claims/)).toBeTruthy();
    expect(screen.getByText(/Markers/)).toBeTruthy();
    expect(screen.queryByText("UX Flows")).toBeNull();
  });

  it("renders mobile session tabs as wrapped touch targets", () => {
    mockStore(makeDefaultStoreState());
    const { container } = render(<SessionShell>Body</SessionShell>);
    const nav = container.querySelector('nav[aria-label="Session views"]');
    const overviewLink = Array.from(container.querySelectorAll("a")).find(
      (a) => a.textContent === "Overview",
    );

    expect(nav?.className).toContain("grid");
    expect(nav?.className).toContain("grid-cols-2");
    expect(nav?.className).toContain("min-[380px]:grid-cols-3");
    expect(overviewLink?.className).toContain("min-h-11");
  });

  it("hides controls before a session starts", () => {
    mockStore(makeDefaultStoreState({ startedAt: null }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.queryByRole("button", { name: /Pause|Resume/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /End/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Export/ })).toBeNull();
  });

  it("renders session controls when a session has started", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByRole("button", { name: /Pause|Resume/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /End/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Export/ })).toBeTruthy();
    const roomLink = screen.getByRole("link", { name: /Room/ });
    expect(roomLink).toHaveAttribute("href", "/tv");
    expect(roomLink.className).toContain("h-11");
  });

  it("preserves validation sample context in the room-mode action", () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=media_playback_sync&view=watch&t=17",
    );
    mockStore(makeDefaultStoreState({ source: { kind: "audio_file", blob_url: "", duration_sec: 30, filename: "fixture.wav", mime: "audio/wav" } }));
    render(<SessionShell>Body</SessionShell>);

    expect(screen.getByRole("link", { name: /Room/ })).toHaveAttribute(
      "href",
      "/tv?demo=validation&sample=media_playback_sync",
    );
  });

  it("renders Pause/Resume and End when startedAt is set", () => {
    mockStore(makeDefaultStoreState({ startedAt: new Date().toISOString() }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByRole("button", { name: /Pause|Resume/ }).className).toContain("h-11");
    expect(screen.getByRole("button", { name: /Export/ }).className).toContain("h-11");
    expect(screen.getByRole("button", { name: /End/ }).className).toContain("h-11");
  });

  it("keeps active-session actions thumb-reachable in a mobile bottom bar", () => {
    mockStore(makeDefaultStoreState({ startedAt: new Date().toISOString() }));
    const { container } = render(<SessionShell>Body</SessionShell>);
    const toolbar = screen.getByRole("toolbar", { name: /Session actions/i });
    const main = container.querySelector("main");

    expect(toolbar.className).toContain("fixed");
    expect(toolbar.className).toContain("bottom-0");
    expect(toolbar.className).toContain("env(safe-area-inset-bottom)");
    expect(toolbar.className).toContain("sm:static");
    expect(main?.className).toContain("env(safe-area-inset-bottom)");
    expect(main?.className).toContain("sm:pb-0");
  });
});

// ─── 2. Live pill states ─────────────────────────────────────────────────────

describe("SessionShell – live pill states", () => {
  it("does not show a live pill before a session starts", () => {
    mockStore(makeDefaultStoreState({ startedAt: null, isRecording: false }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.queryByText("Idle")).toBeNull();
  });

  it("shows Listening when isRecording is true and startedAt is set", () => {
    mockStore(
      makeDefaultStoreState({
        startedAt: new Date().toISOString(),
        isRecording: true,
      }),
    );
    const { container } = render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Listening")).toBeTruthy();
    expect(container.innerHTML).toContain("motion-safe:animate-pulse");
  });

  it("shows Paused when startedAt is set but isRecording is false", () => {
    mockStore(
      makeDefaultStoreState({
        startedAt: new Date().toISOString(),
        isRecording: false,
        endedAt: null,
      }),
    );
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Paused")).toBeTruthy();
  });

  it("shows Ended when endedAt is set", () => {
    const now = new Date().toISOString();
    mockStore(
      makeDefaultStoreState({
        startedAt: now,
        endedAt: now,
        isRecording: false,
      }),
    );
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Ended")).toBeTruthy();
  });
});

// ─── 3. Elapsed time helper ───────────────────────────────────────────────────

describe("useElapsed", () => {
  it("returns 00:00 when startedAt is null", () => {
    expect(useElapsed(null, null)).toBe("00:00");
  });

  it("formats 65 seconds as 01:05", () => {
    const start = new Date(Date.now() - 65_000).toISOString();
    expect(useElapsed(start, null)).toBe("01:05");
  });

  it("formats hours correctly for >= 60 minutes", () => {
    const start = new Date(Date.now() - 3_661_000).toISOString(); // 1h 1m 1s
    expect(useElapsed(start, null)).toBe("1:01:01");
  });

  it("uses endedAt if provided instead of now", () => {
    const start = new Date(0).toISOString();
    const end = new Date(65_000).toISOString();
    expect(useElapsed(start, end)).toBe("01:05");
  });
});

// ─── 4. Tabs: active state on current view ───────────────────────────────────

describe("SessionShell – tab active state", () => {
  it("Overview tab is active by default (no ?view= param)", () => {
    mockSearchParamsRaw = new URLSearchParams("");
    mockStore(makeDefaultStoreState());
    const { container } = render(<SessionShell>Body</SessionShell>);
    const overviewLink = Array.from(
      container.querySelectorAll("a"),
    ).find((a) => a.textContent === "Overview");
    expect(overviewLink?.className).toContain("bg-cream-2");
    expect(overviewLink?.className).toContain("text-ink");
  });

  it("Claims tab is active when ?view=claims", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims");
    mockStore(makeDefaultStoreState());
    const { container } = render(<SessionShell>Body</SessionShell>);
    const claimsLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.startsWith("Claims"),
    );
    expect(claimsLink?.className).toContain("bg-cream-2");
  });

  it("Markers tab is active when ?view=markers", () => {
    mockSearchParamsRaw = new URLSearchParams("view=markers");
    mockStore(makeDefaultStoreState());
    const { container } = render(<SessionShell>Body</SessionShell>);
    const markersLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.startsWith("Markers"),
    );
    expect(markersLink?.className).toContain("bg-cream-2");
  });

  it("Transcript tab is active when ?view=transcript", () => {
    mockSearchParamsRaw = new URLSearchParams("view=transcript");
    mockStore(makeDefaultStoreState());
    const { container } = render(<SessionShell>Body</SessionShell>);
    const transcriptLink = Array.from(container.querySelectorAll("a")).find(
      (a) => a.textContent === "Transcript",
    );
    expect(transcriptLink?.className).toContain("bg-cream-2");
  });

  it("shows and activates the Source tab for text document sessions", () => {
    mockSearchParamsRaw = new URLSearchParams("demo=validation&sample=source_quote_anchors&view=source");
    mockStore(
      makeDefaultStoreState({
        source: {
          kind: "text_doc",
          filename: "Article",
          mime: "text/plain",
          byte_count: 20,
          initial_text: "A source paragraph.",
        },
      }),
    );
    const { container } = render(<SessionShell>Body</SessionShell>);
    const sourceLink = Array.from(container.querySelectorAll("a")).find(
      (a) => a.textContent === "Source",
    );
    expect(sourceLink?.getAttribute("href")).toBe(
      "/session?demo=validation&sample=source_quote_anchors&view=source",
    );
    expect(sourceLink?.className).toContain("bg-cream-2");
  });

  it("preserves validation and share context when switching session tabs", () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=media_playback_sync&title=Fixture%20clip&view=watch&t=17",
    );
    mockStore(makeDefaultStoreState({ source: { kind: "audio_file", blob_url: "", duration_sec: 30, filename: "fixture.wav", mime: "audio/wav" } }));
    render(<SessionShell>Body</SessionShell>);

    expect(screen.getByRole("link", { name: "Transcript" })).toHaveAttribute(
      "href",
      "/session?demo=validation&sample=media_playback_sync&title=Fixture+clip&view=transcript&t=17",
    );
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/session?demo=validation&sample=media_playback_sync&title=Fixture+clip&view=overview&t=17",
    );
  });

  it("does not show the Source tab for microphone sessions", () => {
    mockSearchParamsRaw = new URLSearchParams("");
    mockStore(makeDefaultStoreState({ source: { kind: "mic" } }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.queryByRole("link", { name: "Source" })).toBeNull();
  });

  it("does not expose the project UX flow atlas in the user session nav", () => {
    mockSearchParamsRaw = new URLSearchParams("view=flows");
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    expect(screen.queryByText("UX Flows")).toBeNull();
  });

  it("uses a compact shell inside the Chrome extension panel surface", () => {
    mockSearchParamsRaw = new URLSearchParams("surface=extension-panel");
    mockStore(makeDefaultStoreState({ startedAt: new Date().toISOString() }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.queryByText("Overview")).toBeNull();
    expect(screen.queryByText("Transcript")).toBeNull();
    expect(screen.queryByRole("button", { name: /Export/ })).toBeNull();
    expect(screen.getByText("Body")).toBeTruthy();
  });
});

// ─── 5. Claims tab label includes count ──────────────────────────────────────

describe("SessionShell – tab counts", () => {
  it("Claims tab label shows count of non-checking claims", () => {
    const claims = [
      makeClaim({ status: "confirmed" }),
      makeClaim({ status: "provisional" }),
      makeClaim({ status: "checking" }), // excluded
    ];
    mockStore(makeDefaultStoreState({ claims }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Claims · 2")).toBeTruthy();
  });

  it("Claims tab shows 0 when all claims are checking", () => {
    const claims = [
      makeClaim({ status: "checking" }),
      makeClaim({ status: "checking" }),
    ];
    mockStore(makeDefaultStoreState({ claims }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Claims · 0")).toBeTruthy();
  });

  // ─── 6. Markers tab label includes count ────────────────────────────────────

  it("Markers tab label shows correct count", () => {
    const markers = [makeMarker(), makeMarker(), makeMarker()];
    mockStore(makeDefaultStoreState({ markers }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Markers · 3")).toBeTruthy();
  });

  it("Markers tab shows 0 when no markers", () => {
    mockStore(makeDefaultStoreState({ markers: [] }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Markers · 0")).toBeTruthy();
  });
});

// ─── 7. Pause/Resume button calls setRecording ───────────────────────────────

describe("SessionShell – Pause/Resume button", () => {
  it("shows Resume when startedAt is set but not recording; clicking calls setRecording(true)", () => {
    const setRecording = vi.fn();
    mockStore(makeDefaultStoreState({
      startedAt: new Date().toISOString(),
      isRecording: false,
      setRecording,
    }));
    render(<SessionShell>Body</SessionShell>);
    const btn = screen.getByRole("button", { name: /Resume/ });
    fireEvent.click(btn);
    expect(setRecording).toHaveBeenCalledWith(true);
  });

  it("shows Pause when recording; clicking calls setRecording(false)", () => {
    const setRecording = vi.fn();
    mockStore(
      makeDefaultStoreState({
        isRecording: true,
        startedAt: new Date().toISOString(),
        setRecording,
      }),
    );
    render(<SessionShell>Body</SessionShell>);
    const btn = screen.getByRole("button", { name: /Pause/ });
    fireEvent.click(btn);
    expect(setRecording).toHaveBeenCalledWith(false);
  });

  it("Pause/Resume is disabled when session has ended", () => {
    const now = new Date().toISOString();
    mockStore(makeDefaultStoreState({ startedAt: now, endedAt: now }));
    render(<SessionShell>Body</SessionShell>);
    const btn = screen.getByRole("button", { name: /Pause|Resume/ });
    expect(btn).toBeDisabled();
  });
});

// ─── 8. Export button opens ExportDialog ─────────────────────────────────────

describe("SessionShell – ExportDialog", () => {
  it("Export button click opens ExportDialog", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect(screen.getByRole("dialog", { name: "export-dialog" })).toBeTruthy();
  });

  it("ExportDialog close handler dismisses dialog", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    fireEvent.click(screen.getByRole("button", { name: "Close Export" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// ─── 9. End button opens EndSessionDialog ────────────────────────────────────

describe("SessionShell – EndSessionDialog", () => {
  it("End button click opens EndSessionDialog", () => {
    mockStore(makeDefaultStoreState({ startedAt: new Date().toISOString() }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /End/ }));
    expect(
      screen.getByRole("dialog", { name: "end-session-dialog" }),
    ).toBeTruthy();
  });

  it("End button is disabled when session has already ended", () => {
    const now = new Date().toISOString();
    mockStore(makeDefaultStoreState({ startedAt: now, endedAt: now }));
    render(<SessionShell>Body</SessionShell>);
    const btn = screen.getByRole("button", { name: /End/ });
    expect(btn).toBeDisabled();
  });

  it("Save first from the end dialog opens the save dialog without ending", () => {
    mockStore(
      makeDefaultStoreState({
        startedAt: new Date().toISOString(),
        transcript: [makeSegment()],
      }),
    );
    render(<SessionShell>Body</SessionShell>);

    fireEvent.click(screen.getByRole("button", { name: /End/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save first" }));

    expect(screen.getByRole("dialog", { name: "save-session-dialog" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "end-session-dialog" })).toBeNull();
  });

  it("Export first from the end dialog opens export without ending", () => {
    mockStore(
      makeDefaultStoreState({
        startedAt: new Date().toISOString(),
        claims: [makeClaim()],
      }),
    );
    render(<SessionShell>Body</SessionShell>);

    fireEvent.click(screen.getByRole("button", { name: /End/ }));
    fireEvent.click(screen.getByRole("button", { name: "Export first" }));

    expect(screen.getByRole("dialog", { name: "export-dialog" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "end-session-dialog" })).toBeNull();
  });
});

// ─── 10. Source switch confirmation ──────────────────────────────────────────

describe("SessionShell – source switch confirmation", () => {
  it("opens a product confirmation dialog instead of a native confirm", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    mockStore(
      makeDefaultStoreState({
        transcript: [makeSegment()],
        claims: [makeClaim()],
        markers: [makeMarker()],
      }),
    );
    render(<SessionShell>Body</SessionShell>);

    fireEvent.click(screen.getByRole("button", { name: /Sources/ }));

    expect(screen.getByRole("dialog", { name: /Choose another source/i })).toBeTruthy();
    expect(screen.getByText("Utterances")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Save first/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Export first/i })).toBeTruthy();
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("Save first opens the save dialog without resetting the session", () => {
    const reset = vi.fn();
    mockStore(
      makeDefaultStoreState({
        transcript: [makeSegment()],
        reset,
      }),
    );
    render(<SessionShell>Body</SessionShell>);

    fireEvent.click(screen.getByRole("button", { name: /Sources/ }));
    fireEvent.click(screen.getByRole("button", { name: /Save first/i }));

    expect(screen.getByRole("dialog", { name: "save-session-dialog" })).toBeTruthy();
    expect(reset).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("Export first opens export without resetting the session", () => {
    const reset = vi.fn();
    mockStore(
      makeDefaultStoreState({
        claims: [makeClaim()],
        reset,
      }),
    );
    render(<SessionShell>Body</SessionShell>);

    fireEvent.click(screen.getByRole("button", { name: /Sources/ }));
    fireEvent.click(screen.getByRole("button", { name: /Export first/i }));

    expect(screen.getByRole("dialog", { name: "export-dialog" })).toBeTruthy();
    expect(reset).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("confirming a new source resets and returns to the source picker", () => {
    const reset = vi.fn();
    mockStore(makeDefaultStoreState({ reset }));
    render(<SessionShell>Body</SessionShell>);

    fireEvent.click(screen.getByRole("button", { name: /Sources/ }));
    fireEvent.click(screen.getByRole("button", { name: /Choose new source/i }));

    expect(reset).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/session");
  });

  it("stops browser-tab capture before switching away from an active tab source", () => {
    const reset = vi.fn();
    mockStore(
      makeDefaultStoreState({
        source: { kind: "browser_tab", title: "Live page" },
        reset,
      }),
    );
    render(<SessionShell>Body</SessionShell>);

    fireEvent.click(screen.getByRole("button", { name: /Sources/ }));
    fireEvent.click(screen.getByRole("button", { name: /Choose new source/i }));

    expect(stopBrowserTabCapture).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/session");
  });
});

// ─── 11. SpeakerRail rendered with speakers from store ───────────────────────

describe("SessionShell – SpeakerRail integration", () => {
  it("renders SpeakerRail with speakers from store", () => {
    const speakers: Speaker[] = [
      { id: 0, label: "Alice" },
      { id: 1, label: "Bob" },
    ];
    mockStore(makeDefaultStoreState({ speakers }));
    render(<SessionShell>Body</SessionShell>);
    const rail = screen.getByTestId("speaker-rail");
    expect(rail).toBeTruthy();
    expect(rail.dataset.speakerCount).toBe("2");
    expect(screen.getByTestId("speaker-0").textContent).toBe("Alice");
    expect(screen.getByTestId("speaker-1").textContent).toBe("Bob");
  });

  it("passes active speaker id derived from latest transcript segment", () => {
    const transcript = [
      makeSegment({ speaker_id: 0 }),
      makeSegment({ speaker_id: 2 }),
    ];
    mockStore(makeDefaultStoreState({ transcript }));
    render(<SessionShell>Body</SessionShell>);
    const rail = screen.getByTestId("speaker-rail");
    // Latest segment is speaker_id 2
    expect(rail.dataset.activeId).toBe("2");
  });

  it("passes null active speaker when transcript is empty", () => {
    mockStore(makeDefaultStoreState({ transcript: [] }));
    render(<SessionShell>Body</SessionShell>);
    const rail = screen.getByTestId("speaker-rail");
    // data-active-id is not rendered when value is null (React omits null attrs)
    expect(rail.dataset.activeId).toBeUndefined();
  });
});

// ─── 11. Body slot renders children ──────────────────────────────────────────

describe("SessionShell – children slot", () => {
  it("renders children passed to the shell", () => {
    mockStore(makeDefaultStoreState());
    render(
      <SessionShell>
        <div data-testid="body-content">Hello from child</div>
      </SessionShell>,
    );
    expect(screen.getByTestId("body-content").textContent).toBe(
      "Hello from child",
    );
  });

  it("renders children inside a <main> element", () => {
    mockStore(makeDefaultStoreState());
    const { container } = render(
      <SessionShell>
        <p>child</p>
      </SessionShell>,
    );
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.querySelector("p")?.textContent).toBe("child");
  });
});
