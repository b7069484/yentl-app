/**
 * Task G — Color-coded speaker-ring on the player frame.
 *
 * Contract:
 *  - When current segment has speaker_id=0 → player wrapper has `border-spk-1`
 *  - When current segment has speaker_id=2 → player wrapper has `border-spk-3`
 *  - With currentTime=0 (no active segment / pre-playback) →
 *    player wrapper has `border-transparent` (no colored ring)
 *  - Player wrapper always has `transition-colors`
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

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
  createAudioAdapter: vi.fn(async () => ({
    seekTo: mockSeekTo,
    destroy: mockDestroy,
  })),
}));

// ── next/link stub (not needed for ring tests, but some imports pull it) ──────

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <a href={href} {...rest}>{children}</a>,
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

function makeSegment(
  start: number,
  speakerId: number | null = 0,
): import("@/lib/types").TranscriptSegment {
  return {
    start,
    end: start + 4.5,
    text: `Segment at t=${start}`,
    is_final: true,
    speaker_id: speakerId,
  };
}

// ── Import under test ─────────────────────────────────────────────────────────

import { WatchView } from "@/components/session/watch-view";

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  ytCallbacks = {};
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Task G — speaker-ring on player wrapper", () => {
  it("player wrapper always has transition-colors class", async () => {
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0, 0)],
    };
    render(<WatchView />);

    await waitFor(() =>
      expect(screen.getByTestId("player-wrapper")).toBeTruthy()
    );

    const wrapper = screen.getByTestId("player-wrapper");
    expect(wrapper.className).toContain("transition-colors");
  });

  it("no active segment (transcript empty, currentTime=0) → border-transparent on player wrapper", async () => {
    // transcript is empty: currentSpeakerId stays null
    render(<WatchView />);

    await waitFor(() =>
      expect(screen.getByTestId("player-wrapper")).toBeTruthy()
    );

    const wrapper = screen.getByTestId("player-wrapper");
    expect(wrapper.className).toContain("border-transparent");
    expect(wrapper.className).not.toMatch(/border-spk-\d/);
  });

  it("current segment has speaker_id=0 → border-spk-1 on player wrapper", async () => {
    // paletteFor(0) = SPEAKER_PALETTE[0] = { border: "border-spk-1" }
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0, 0), makeSegment(5, 0)],
    };
    render(<WatchView />);

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());
    act(() => { ytCallbacks.onTimeUpdate!(7); });

    await waitFor(() => {
      const wrapper = screen.getByTestId("player-wrapper");
      expect(wrapper.className).toContain("border-spk-1");
    });
  });

  it("current segment has speaker_id=2 → border-spk-3 on player wrapper", async () => {
    // paletteFor(2) = SPEAKER_PALETTE[2] = { border: "border-spk-3" }
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0, 0), makeSegment(5, 2)],
    };
    render(<WatchView />);

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());
    act(() => { ytCallbacks.onTimeUpdate!(7); });

    await waitFor(() => {
      const wrapper = screen.getByTestId("player-wrapper");
      expect(wrapper.className).toContain("border-spk-3");
    });
  });

  it("ring color updates when speaker changes mid-session", async () => {
    // Segment at t=0 → speaker 0 (border-spk-1)
    // Segment at t=5 → speaker 1 (border-spk-2)
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0, 0), makeSegment(5, 1)],
    };
    render(<WatchView />);

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    // t=2: speaker 0
    act(() => { ytCallbacks.onTimeUpdate!(2); });
    await waitFor(() => {
      const wrapper = screen.getByTestId("player-wrapper");
      expect(wrapper.className).toContain("border-spk-1");
    });

    // t=7: speaker 1 takes over
    act(() => { ytCallbacks.onTimeUpdate!(7); });
    await waitFor(() => {
      const wrapper = screen.getByTestId("player-wrapper");
      expect(wrapper.className).toContain("border-spk-2");
    });
  });
});
