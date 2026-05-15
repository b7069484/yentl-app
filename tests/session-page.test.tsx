import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
};

function makeStore(overrides: Partial<StoreState> = {}): StoreState {
  return {
    startedAt: null,
    startSession: vi.fn(),
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
  mockSearchParamsRaw = new URLSearchParams("");
  mockStore(makeStore());
});

// ─── 1. PreRecord renders when startedAt === null ─────────────────────────────

describe("SessionPage – PreRecord state", () => {
  it("renders PreRecord when startedAt is null", () => {
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(
      screen.getByText("Yenta is ready to listen."),
    ).toBeTruthy();
  });

  it("renders Start a session button in PreRecord", () => {
    mockStore(makeStore({ startedAt: null }));
    render(<SessionPage />);
    expect(
      screen.getByRole("button", { name: /Start a session/i }),
    ).toBeTruthy();
  });

  it("PreRecord onClick calls startSession", () => {
    const startSession = vi.fn();
    mockStore(makeStore({ startedAt: null, startSession }));
    render(<SessionPage />);
    fireEvent.click(screen.getByRole("button", { name: /Start a session/i }));
    expect(startSession).toHaveBeenCalledOnce();
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

  it("unknown view falls back to HomeOverview", () => {
    mockSearchParamsRaw = new URLSearchParams("view=unknown-view");
    mockStore(makeStore({ startedAt }));
    render(<SessionPage />);
    expect(screen.getByTestId("home-overview")).toBeTruthy();
  });
});

// ─── 3. PreRecord does not render when startedAt is set ──────────────────────

describe("SessionPage – no PreRecord after start", () => {
  it("does not show PreRecord heading when startedAt is set", () => {
    mockStore(makeStore({ startedAt: new Date().toISOString() }));
    render(<SessionPage />);
    expect(
      screen.queryByText("Yenta is ready to listen."),
    ).toBeNull();
  });
});
