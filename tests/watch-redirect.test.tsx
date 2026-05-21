import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();
let mockSearchParamsRaw = new URLSearchParams("view=watch");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
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

vi.mock("@/components/session/home-overview", () => ({
  HomeOverview: () => <div data-testid="home-overview">HomeOverview</div>,
}));

vi.mock("@/components/session/TranscriptView", () => ({
  TranscriptView: () => <div data-testid="transcript-view">TranscriptView</div>,
}));

vi.mock("@/components/session/filtered-list", () => ({
  FilteredList: () => <div data-testid="filtered-list">FilteredList</div>,
}));

vi.mock("@/components/session/watch-view", () => ({
  WatchView: () => <div data-testid="watch-view">WatchView</div>,
}));

vi.mock("@/lib/client/source-router", () => ({
  SourceRouter: () => <div data-testid="source-router">SourceRouter</div>,
}));

// Compliance siblings folded into SessionPage during sprint-as-trunk
// reconciliation (2026-05-18) — stub them so this test stays focused on
// the watch-redirect routing logic and the selector-only useSession mock
// below isn't confused by their non-selector useSession() calls.
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

// ─── Session store mock ───────────────────────────────────────────────────────

type StoreState = {
  startedAt: string | null;
  source: { kind: string };
};

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";
import SessionPage from "@/app/session/page";

function mockStore(state: StoreState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: StoreState) => unknown) => selector(state),
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const startedAt = new Date().toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsRaw = new URLSearchParams("view=watch");
});

// ─── 1. view=watch + non-playable source → redirect to overview ───────────────

describe("SessionPage – watch redirect for non-media sources", () => {
  it("calls router.replace to overview when view=watch and source.kind=mic", () => {
    mockSearchParamsRaw = new URLSearchParams("view=watch");
    mockStore({ startedAt, source: { kind: "mic" } });
    render(<SessionPage />);
    expect(mockReplace).toHaveBeenCalledWith("/session?view=overview");
  });

  it("calls router.replace to overview when view=watch and source.kind=text_doc", () => {
    mockSearchParamsRaw = new URLSearchParams("view=watch");
    mockStore({ startedAt, source: { kind: "text_doc" } });
    render(<SessionPage />);
    expect(mockReplace).toHaveBeenCalledWith("/session?view=overview");
  });

  it("calls router.replace to overview when view=watch and source.kind=browser_tab", () => {
    mockSearchParamsRaw = new URLSearchParams("view=watch");
    mockStore({ startedAt, source: { kind: "browser_tab" } });
    render(<SessionPage />);
    expect(mockReplace).toHaveBeenCalledWith("/session?view=overview");
  });

  it("does NOT call router.replace when view=watch and source.kind=youtube", () => {
    mockSearchParamsRaw = new URLSearchParams("view=watch");
    mockStore({ startedAt, source: { kind: "youtube" } });
    render(<SessionPage />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId("watch-view")).toBeTruthy();
  });

  it("does NOT call router.replace when view=watch and source.kind=audio_file", () => {
    mockSearchParamsRaw = new URLSearchParams("view=watch");
    mockStore({ startedAt, source: { kind: "audio_file" } });
    render(<SessionPage />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId("watch-view")).toBeTruthy();
  });

  it("does NOT call router.replace when view=watch and source.kind=media_url", () => {
    mockSearchParamsRaw = new URLSearchParams("view=watch");
    mockStore({ startedAt, source: { kind: "media_url" } });
    render(<SessionPage />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId("watch-view")).toBeTruthy();
  });

  it("does NOT call router.replace when view=overview (regardless of source)", () => {
    mockSearchParamsRaw = new URLSearchParams("view=overview");
    mockStore({ startedAt, source: { kind: "mic" } });
    render(<SessionPage />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
