import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

let mockSearchParamsRaw = new URLSearchParams("");
const mockReplace = vi.fn();

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

import { useSession } from "@/lib/client/session-store";
import SessionPage from "@/app/session/page";

// ─── Store helpers ────────────────────────────────────────────────────────────

type StoreState = {
  startedAt: string | null;
  startSession: () => void;
  prerecordStage: "picker" | "selected";
  source: { kind: string };
  setSource: (source: unknown) => void;
  setPrerecordStage: (stage: "picker" | "selected") => void;
  setBrowserTabStatus: (status: unknown) => void;
};

function makeStore(overrides: Partial<StoreState> = {}): StoreState {
  return {
    startedAt: null,
    startSession: vi.fn(),
    prerecordStage: "picker",
    // Default to a playable kind so view=watch tests don't redirect unexpectedly.
    source: { kind: "youtube" },
    setSource: vi.fn(),
    setPrerecordStage: vi.fn(),
    setBrowserTabStatus: vi.fn(),
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
  mockStore(makeStore());
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

  it("moves the project UX flow atlas out of the user session before start", () => {
    mockSearchParamsRaw = new URLSearchParams("view=flows");
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(mockReplace).toHaveBeenCalledWith("/project/flows");
    expect(screen.queryByTestId("source-router")).toBeNull();
  });

  it("renders the compact extension panel surface before capture starts", () => {
    mockSearchParamsRaw = new URLSearchParams("surface=extension-panel&source=browser-tab&bridge=test");
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(screen.getByTestId("extension-panel-view")).toBeTruthy();
    expect(screen.queryByTestId("source-router")).toBeNull();
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

  it("view=flows redirects to the separate project workspace", () => {
    mockSearchParamsRaw = new URLSearchParams("view=flows");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(mockReplace).toHaveBeenCalledWith("/project/flows");
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
