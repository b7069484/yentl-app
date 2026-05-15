import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker, Speaker, TranscriptSegment, SessionSource } from "@/lib/types";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

let mockSearchParamsRaw = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="end-session-dialog">
        <button onClick={onClose}>Close End</button>
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

// ─── Mock useSession store ────────────────────────────────────────────────────

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";
import { SessionShell, useElapsed } from "@/components/session/session-shell";

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
  setRecording: (b: boolean) => void;
  renameSpeaker: (id: number, label: string) => void;
};

function makeDefaultStoreState(overrides: Partial<StoreState> = {}): StoreState {
  return {
    startedAt: null,
    endedAt: null,
    isRecording: false,
    transcript: [],
    claims: [],
    markers: [],
    speakers: [],
    source: { kind: "mic" },
    setRecording: vi.fn(),
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
  mockStore(makeDefaultStoreState());
});

// ─── 1. Renders brand mark + live pill + tabs + controls ─────────────────────

describe("SessionShell – basic render", () => {
  it("renders brand mark (yenta link)", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    const link = screen.getAllByRole("link").find((l) =>
      l.textContent?.includes("yenta"),
    );
    expect(link).toBeTruthy();
  });

  it("renders the live pill", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    // Idle state when no startedAt
    expect(screen.getByText("Idle")).toBeTruthy();
  });

  it("renders all four tabs", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("Transcript")).toBeTruthy();
    expect(screen.getByText(/Claims/)).toBeTruthy();
    expect(screen.getByText(/Markers/)).toBeTruthy();
  });

  it("renders Export button always, hides Pause/Resume and End when startedAt is null", () => {
    mockStore(makeDefaultStoreState());
    render(<SessionShell>Body</SessionShell>);
    // Pause/Resume and End are hidden when startedAt is null
    expect(screen.queryByRole("button", { name: /Pause|Resume/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /End/ })).toBeNull();
    // Export always renders
    expect(screen.getByRole("button", { name: /Export/ })).toBeTruthy();
  });

  it("renders Pause/Resume and End when startedAt is set", () => {
    mockStore(makeDefaultStoreState({ startedAt: new Date().toISOString() }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByRole("button", { name: /Pause|Resume/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Export/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /End/ })).toBeTruthy();
  });
});

// ─── 2. Live pill states ─────────────────────────────────────────────────────

describe("SessionShell – live pill states", () => {
  it("shows Idle when startedAt is null", () => {
    mockStore(makeDefaultStoreState({ startedAt: null, isRecording: false }));
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Idle")).toBeTruthy();
  });

  it("shows Listening when isRecording is true and startedAt is set", () => {
    mockStore(
      makeDefaultStoreState({
        startedAt: new Date().toISOString(),
        isRecording: true,
      }),
    );
    render(<SessionShell>Body</SessionShell>);
    expect(screen.getByText("Listening")).toBeTruthy();
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
});

// ─── 10. SpeakerRail rendered with speakers from store ───────────────────────

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
