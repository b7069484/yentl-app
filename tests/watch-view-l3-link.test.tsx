/**
 * Task F — L3 click affordance on annotation rows.
 *
 * Contract:
 *  - Click the verdict/marker chip → seek (existing behavior, preserved)
 *  - Click the quote text → navigate to /session/detail/{claim|marker}/{id}
 *  - A ChevronRight icon is present in each row
 *  - Chip click does NOT trigger navigation
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ── next/link mock ────────────────────────────────────────────────────────────

const mockRouterPush = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        mockRouterPush(href);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

// ── Adapter stubs ─────────────────────────────────────────────────────────────

const mockSeekTo = vi.fn();
const mockDestroy = vi.fn();

type AdapterCallbacks = {
  onTimeUpdate?: (t: number) => void;
  onReady?: () => void;
};

let ytCallbacks: AdapterCallbacks = {};

vi.mock("@/lib/client/youtube-adapter", () => ({
  createYouTubeAdapter: vi.fn(async (opts: AdapterCallbacks) => {
    ytCallbacks = { onTimeUpdate: opts.onTimeUpdate, onReady: opts.onReady };
    return { seekTo: mockSeekTo, destroy: mockDestroy };
  }),
}));

vi.mock("@/lib/client/audio-adapter", () => ({
  createAudioAdapter: vi.fn(async () => {
    return { seekTo: mockSeekTo, destroy: mockDestroy };
  }),
}));

// ── Session store mock ────────────────────────────────────────────────────────

type StoreState = {
  source: import("@/lib/types").SessionSource;
  claims: import("@/lib/types").ClaimCard[];
  markers: import("@/lib/types").RhetoricMarker[];
  synthesis: import("@/lib/client/session-store").SynthesisState;
  speakers: import("@/lib/types").Speaker[];
  transcript: import("@/lib/types").TranscriptSegment[];
};

let mockStoreState: StoreState = {
  source: { kind: "youtube", video_id: "abc123", url: "https://youtube.com/watch?v=abc123" },
  claims: [],
  markers: [],
  synthesis: null,
  speakers: [],
  transcript: [],
};

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: StoreState) => unknown) => {
    return selector ? selector(mockStoreState) : mockStoreState;
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSegment(start: number): import("@/lib/types").TranscriptSegment {
  return {
    start,
    end: start + 4.5,
    text: `Segment at t=${start}`,
    is_final: true,
    speaker_id: 0,
  };
}

function makeClaim(id: string, utterance_start: number): import("@/lib/types").ClaimCard {
  return {
    id,
    claim_text: `Claim text for ${id}`,
    utterance_start,
    utterance_end: utterance_start + 5,
    speaker_id: 0,
    topic: "politics",
    topic_secondary: null,
    primary_label: "TRUE",
    score: 85,
    annotations: [],
    explanation: "explanation",
    status: "confirmed",
    sources: [],
  };
}

function makeMarker(id: string, start_time: number): import("@/lib/types").RhetoricMarker {
  return {
    id,
    type: "fallacy",
    name: "straw-man",
    display: "Straw Man",
    excerpt: `Marker excerpt for ${id}`,
    speaker_id: 0,
    start_time,
    end_time: start_time + 5,
    severity: "clear",
    explanation: "explanation",
  };
}

// ── Import under test ─────────────────────────────────────────────────────────

import { WatchView } from "@/components/session/watch-view";

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  ytCallbacks = {};
  mockRouterPush.mockClear();
  mockStoreState = {
    source: { kind: "youtube", video_id: "abc123", url: "https://youtube.com/watch?v=abc123" },
    claims: [],
    markers: [],
    synthesis: null,
    speakers: [{ id: 0, label: "Speaker 1" }],
    transcript: [],
  };

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
});

// ── Helper: render with a claim annotation visible ────────────────────────────

async function renderWithClaim(claimId: string) {
  mockStoreState = {
    ...mockStoreState,
    transcript: [makeSegment(0), makeSegment(5)],
    claims: [makeClaim(claimId, 5)],
  };
  render(<WatchView />);

  await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());
  act(() => { ytCallbacks.onTimeUpdate!(7); });
  await waitFor(() =>
    expect(screen.getByTestId(`annotation-claim-${claimId}`)).toBeTruthy()
  );
}

async function renderWithMarker(markerId: string) {
  mockStoreState = {
    ...mockStoreState,
    transcript: [makeSegment(0), makeSegment(5)],
    markers: [makeMarker(markerId, 5)],
  };
  render(<WatchView />);

  await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());
  act(() => { ytCallbacks.onTimeUpdate!(7); });
  await waitFor(() =>
    expect(screen.getByTestId(`annotation-marker-${markerId}`)).toBeTruthy()
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Task F — L3 link affordance: claim annotation", () => {
  it("clicking the quote text on a claim annotation navigates to /session/detail/claim/<id>", async () => {
    await renderWithClaim("claim-42");

    const row = screen.getByTestId("annotation-claim-claim-42");
    const link = row.querySelector("[data-testid='annotation-detail-link']");
    expect(link).not.toBeNull();

    fireEvent.click(link!);
    expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/claim/claim-42");
  });

  it("clicking the chip button on a claim annotation calls onSeek and does NOT navigate", async () => {
    await renderWithClaim("claim-99");

    const row = screen.getByTestId("annotation-claim-claim-99");
    const chipBtn = row.querySelector("[data-testid='annotation-chip-btn']");
    expect(chipBtn).not.toBeNull();

    fireEvent.click(chipBtn!);
    expect(mockSeekTo).toHaveBeenCalledWith(5);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("the annotation row contains a chevron icon", async () => {
    await renderWithClaim("claim-chevron");

    const row = screen.getByTestId("annotation-claim-claim-chevron");
    const chevron = row.querySelector("[data-testid='annotation-chevron']");
    expect(chevron).not.toBeNull();
  });
});

describe("Task F — L3 link affordance: marker annotation", () => {
  it("clicking the quote text on a marker annotation navigates to /session/detail/marker/<id>", async () => {
    await renderWithMarker("marker-55");

    const row = screen.getByTestId("annotation-marker-marker-55");
    const link = row.querySelector("[data-testid='annotation-detail-link']");
    expect(link).not.toBeNull();

    fireEvent.click(link!);
    expect(mockRouterPush).toHaveBeenCalledWith("/session/detail/marker/marker-55");
  });

  it("clicking the chip on a marker annotation seeks, does NOT navigate", async () => {
    await renderWithMarker("marker-77");

    const row = screen.getByTestId("annotation-marker-marker-77");
    const chipBtn = row.querySelector("[data-testid='annotation-chip-btn']");
    expect(chipBtn).not.toBeNull();

    fireEvent.click(chipBtn!);
    expect(mockSeekTo).toHaveBeenCalledWith(5);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("the marker annotation row contains a chevron icon", async () => {
    await renderWithMarker("marker-chevron");

    const row = screen.getByTestId("annotation-marker-marker-chevron");
    const chevron = row.querySelector("[data-testid='annotation-chevron']");
    expect(chevron).not.toBeNull();
  });
});
