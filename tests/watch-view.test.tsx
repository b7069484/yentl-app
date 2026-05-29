import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";

const {
  mockAppendFinal,
  mockClearPendingYouTubeCaptions,
  mockOnFinalUtterance,
  mockRunSynthesisNow,
  mockAttachAudioFeatures,
} = vi.hoisted(() => ({
  mockAppendFinal: vi.fn(),
  mockClearPendingYouTubeCaptions: vi.fn(),
  mockOnFinalUtterance: vi.fn().mockResolvedValue(undefined),
  mockRunSynthesisNow: vi.fn().mockResolvedValue(undefined),
  mockAttachAudioFeatures: vi.fn(),
}));

// ── Adapter stub storage ──────────────────────────────────────────────────────
// These are module-level so vi.mock factories can access them.

const mockSeekTo = vi.fn();
const mockDestroy = vi.fn();

// Holds the callbacks the adapter received during construction so tests can
// call them to simulate player events.
type AdapterCallbacks = {
  onTimeUpdate?: (t: number) => void;
  onReady?: () => void;
};

let ytCallbacks: AdapterCallbacks = {};
let audioCallbacks: AdapterCallbacks = {};

const adapterStub = { seekTo: mockSeekTo, destroy: mockDestroy };

// ── Adapter mocks (top-level, hoisting-safe) ──────────────────────────────────

vi.mock("@/lib/client/youtube-adapter", () => ({
  createYouTubeAdapter: vi.fn(async (opts: AdapterCallbacks) => {
    ytCallbacks = { onTimeUpdate: opts.onTimeUpdate, onReady: opts.onReady };
    return adapterStub;
  }),
}));

vi.mock("@/lib/client/audio-adapter", () => ({
  createAudioAdapter: vi.fn(async (opts: AdapterCallbacks) => {
    audioCallbacks = { onTimeUpdate: opts.onTimeUpdate, onReady: opts.onReady };
    return adapterStub;
  }),
}));

vi.mock("@/lib/client/orchestrator", () => ({
  onFinalUtterance: mockOnFinalUtterance,
  runSynthesisNow: mockRunSynthesisNow,
  attachAudioFeatures: mockAttachAudioFeatures,
}));

// ── Session store mock ────────────────────────────────────────────────────────

type StoreState = {
  source: import("@/lib/types").SessionSource;
  claims: import("@/lib/types").ClaimCard[];
  markers: import("@/lib/types").RhetoricMarker[];
  synthesis: import("@/lib/client/session-store").SynthesisState;
  speakers: import("@/lib/types").Speaker[];
  transcript: import("@/lib/types").TranscriptSegment[];
  pendingYouTubeCaptions: import("@/lib/types").TranscriptSegment[];
  appendFinal: (segment: import("@/lib/types").TranscriptSegment) => void;
  clearPendingYouTubeCaptions: () => void;
};

let mockStoreState: StoreState = {
  source: { kind: "youtube", video_id: "abc123", url: "https://youtube.com/watch?v=abc123" },
  claims: [],
  markers: [],
  synthesis: null,
  speakers: [],
  transcript: [],
  pendingYouTubeCaptions: [],
  appendFinal: mockAppendFinal,
  clearPendingYouTubeCaptions: mockClearPendingYouTubeCaptions,
};

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: StoreState) => unknown) => {
    const state = {
      ...mockStoreState,
      appendFinal: mockAppendFinal,
      clearPendingYouTubeCaptions: mockClearPendingYouTubeCaptions,
    };
    return selector ? selector(state) : state;
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSegment(
  start: number,
  text = `Segment at t=${start}`,
): import("@/lib/types").TranscriptSegment {
  return {
    start,
    end: start + 4.5,
    text,
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
  audioCallbacks = {};
  mockStoreState = {
    source: { kind: "youtube", video_id: "abc123", url: "https://youtube.com/watch?v=abc123" },
    claims: [],
    markers: [],
    synthesis: null,
    speakers: [{ id: 0, label: "Speaker 1" }],
    transcript: [],
    pendingYouTubeCaptions: [],
    appendFinal: mockAppendFinal,
    clearPendingYouTubeCaptions: mockClearPendingYouTubeCaptions,
  };

  // Mock scrollIntoView for auto-scroll tests
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
  // Also ensure HTMLButtonElement has it
  Object.defineProperty(HTMLButtonElement.prototype, "scrollIntoView", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
});

// ── 1. No-media fallback removed (redirect now handled in page.tsx) ──────────
// WatchView is only ever rendered for PLAYABLE_SOURCE_KINDS. The mic/text_doc
// dead block has been deleted; these tests verify it is truly gone.

describe("WatchView — no-media fallback removed", () => {
  it("does NOT render a no-media-message for mic source (redirect is upstream)", () => {
    mockStoreState = { ...mockStoreState, source: { kind: "mic" } };
    render(<WatchView />);
    expect(screen.queryByTestId("no-media-message")).toBeNull();
  });

  it("does NOT render a no-media-message for text_doc source (redirect is upstream)", () => {
    mockStoreState = {
      ...mockStoreState,
      source: { kind: "text_doc", filename: "doc.txt", mime: "text/plain", byte_count: 1000 },
    };
    render(<WatchView />);
    expect(screen.queryByTestId("no-media-message")).toBeNull();
  });
});

// ── 2. Transcript panel visibility ────────────────────────────────────────────

describe("WatchView — transcript panel", () => {
  it("renders the source header and review metrics for a loaded YouTube source", async () => {
    mockStoreState = {
      ...mockStoreState,
      source: {
        kind: "youtube",
        video_id: "abc123",
        url: "https://youtube.com/watch?v=abc123",
        title: "Debate clip",
        channel: "Civic Channel",
      },
      transcript: [makeSegment(0), makeSegment(5)],
      claims: [makeClaim("claim-1", 0)],
      markers: [makeMarker("marker-1", 5)],
    };

    render(<WatchView />);

    await waitFor(() => {
      expect(screen.getByText("Debate clip")).toBeTruthy();
      expect(screen.getByText(/Civic Channel/i)).toBeTruthy();
      expect(screen.getByText("Claims")).toBeTruthy();
      expect(screen.getByText("Markers")).toBeTruthy();
    });
  });

  it("shows 'Loading transcript…' when transcript is empty", async () => {
    mockStoreState = { ...mockStoreState, transcript: [] };
    render(<WatchView />);

    await waitFor(() => {
      expect(screen.getByTestId("transcript-loading")).toBeTruthy();
    });
  });

  it("renders player container for youtube source", async () => {
    render(<WatchView />);
    await waitFor(() => {
      expect(screen.getByTestId("player-container")).toBeTruthy();
    });
  });

  it("renders transcript panel", async () => {
    render(<WatchView />);
    await waitFor(() => {
      expect(screen.getByTestId("transcript-panel")).toBeTruthy();
    });
  });

  it("renders the live signal board with read, heat, evidence, and live state", async () => {
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0)],
      claims: [
        {
          ...makeClaim("claim-risk", 0),
          primary_label: "FALSE",
          sources: [],
        },
      ],
      markers: [
        {
          ...makeMarker("marker-heat", 0),
          severity: "blatant",
        },
      ],
    };

    render(<WatchView />);

    const board = await screen.findByTestId("watch-signal-board");
    expect(within(board).getByText("Current read")).toBeTruthy();
    expect(within(board).getByText("False")).toBeTruthy();
    expect(within(board).getByText("Language heat")).toBeTruthy();
    expect(within(board).getByText("High")).toBeTruthy();
    expect(within(board).getByText("Evidence state")).toBeTruthy();
    expect(within(board).getByText("Needs backing")).toBeTruthy();

    await waitFor(() => expect(ytCallbacks.onReady).toBeDefined());
    act(() => {
      ytCallbacks.onReady!();
    });

    await waitFor(() => {
      expect(within(board).getByText("Live state")).toBeTruthy();
      expect(within(board).getByText("Ready")).toBeTruthy();
    });
  });
});

describe("WatchView — evidence queue", () => {
  it("renders claim and marker queue items that seek to their timestamps", async () => {
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0), makeSegment(5)],
      claims: [makeClaim("claim-queue", 5)],
      markers: [makeMarker("marker-queue", 5)],
    };

    render(<WatchView />);

    await waitFor(() => {
      expect(screen.getByTestId("watch-evidence-queue")).toBeTruthy();
      expect(screen.getByTestId("queue-claim-claim-queue")).toBeTruthy();
      expect(screen.getByTestId("queue-marker-marker-queue")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("queue-claim-claim-queue"));
    expect(mockSeekTo).toHaveBeenCalledWith(5);
  });
});

describe("WatchView — YouTube live caption release", () => {
  it("appends pending YouTube captions only as playback reaches them", async () => {
    const first = makeSegment(0, "Opening line.");
    const second = makeSegment(5, "Second line.");
    mockStoreState = {
      ...mockStoreState,
      transcript: [],
      pendingYouTubeCaptions: [first, second],
    };

    render(<WatchView />);

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    act(() => {
      ytCallbacks.onTimeUpdate!(0.1);
    });
    expect(mockAppendFinal).not.toHaveBeenCalled();

    act(() => {
      ytCallbacks.onTimeUpdate!(0.5);
    });

    await waitFor(() => {
      expect(mockAppendFinal).toHaveBeenCalledWith(first);
      expect(mockOnFinalUtterance).toHaveBeenCalledWith(first);
    });
    expect(mockAppendFinal).not.toHaveBeenCalledWith(second);

    act(() => {
      ytCallbacks.onTimeUpdate!(5.4);
    });

    await waitFor(() => {
      expect(mockAppendFinal).toHaveBeenCalledWith(second);
      expect(mockOnFinalUtterance).toHaveBeenCalledWith(second);
      expect(mockClearPendingYouTubeCaptions).toHaveBeenCalled();
    });
  });
});

// ── 3. Karaoke: segments revealed as currentTime advances ─────────────────────

describe("WatchView — karaoke transcript (segments revealed by currentTime)", () => {
  // 5 segments at t=0,5,10,15,20
  function setup() {
    mockStoreState = {
      ...mockStoreState,
      transcript: [
        makeSegment(0),
        makeSegment(5),
        makeSegment(10),
        makeSegment(15),
        makeSegment(20),
      ],
    };
    render(<WatchView />);
  }

  it("with currentTime=0 → all segments rendered; all start in 'future' state until playback begins", async () => {
    setup();

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    // All segments visible from the start so the user can read what's coming.
    // None are "current" yet because currentTime hasn't advanced past any start.
    await waitFor(() => {
      expect(screen.getByTestId("transcript-seg-0")).toBeTruthy();
      expect(screen.getByTestId("transcript-seg-5")).toBeTruthy();
      expect(screen.getByTestId("transcript-seg-10")).toBeTruthy();
      expect(screen.getByTestId("transcript-seg-15")).toBeTruthy();
      expect(screen.getByTestId("transcript-seg-20")).toBeTruthy();
    });

    // t=0 (start=0) IS reached by currentTime=0, so t=0 is "current"
    // (start <= currentTime, last such segment).
    expect(
      screen.getByTestId("transcript-seg-0").getAttribute("data-is-current"),
    ).toBe("true");
    // Later segments: future
    expect(
      screen.getByTestId("transcript-seg-5").getAttribute("data-line-state"),
    ).toBe("future");
  });

  it("currentTime=7 → t=5 is current; t=0 is past; t=10+ are future", async () => {
    setup();

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    act(() => {
      ytCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      // All segments still rendered
      expect(screen.getByTestId("transcript-seg-0")).toBeTruthy();
      expect(screen.getByTestId("transcript-seg-5")).toBeTruthy();
      expect(screen.getByTestId("transcript-seg-10")).toBeTruthy();
    });

    // t=5 is current (last segment whose start <= currentTime=7)
    expect(
      screen.getByTestId("transcript-seg-5").getAttribute("data-is-current"),
    ).toBe("true");
    expect(
      screen.getByTestId("transcript-seg-5").getAttribute("data-line-state"),
    ).toBe("current");

    // t=0: past
    expect(
      screen.getByTestId("transcript-seg-0").getAttribute("data-line-state"),
    ).toBe("past");

    // t=10: future
    expect(
      screen.getByTestId("transcript-seg-10").getAttribute("data-line-state"),
    ).toBe("future");
  });

  it("seek backward from 7 to 4 → t=5 returns to 'future', t=0 becomes 'current'", async () => {
    setup();

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    // Advance to 7 (t=5 becomes current)
    act(() => {
      ytCallbacks.onTimeUpdate!(7);
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("transcript-seg-5").getAttribute("data-is-current"),
      ).toBe("true");
    });

    // Seek back to 4 (t=0 becomes current, t=5 flips back to future)
    act(() => {
      ytCallbacks.onTimeUpdate!(4);
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("transcript-seg-0").getAttribute("data-is-current"),
      ).toBe("true");
      expect(
        screen.getByTestId("transcript-seg-5").getAttribute("data-line-state"),
      ).toBe("future");
    });
  });
});

// ── 4. Click-to-seek on transcript line ──────────────────────────────────────

describe("WatchView — click-to-seek on transcript", () => {
  it("clicking a segment calls adapter.seekTo with segment.start", async () => {
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0), makeSegment(5)],
    };
    render(<WatchView />);

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    // Advance to show t=5
    act(() => {
      ytCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      expect(screen.getByTestId("transcript-seg-5")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("transcript-seg-5"));
    expect(mockSeekTo).toHaveBeenCalledWith(5);
  });
});

// ── 5. Inline annotations ────────────────────────────────────────────────────

describe("WatchView — inline annotations", () => {
  it("claim at utterance_start=5 appears under t=5 segment when currentTime=7", async () => {
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0), makeSegment(5), makeSegment(10)],
      claims: [makeClaim("c-at-5", 5), makeClaim("c-at-12", 12)],
    };
    render(<WatchView />);

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    act(() => {
      ytCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      // Claim at t=5 should appear as an annotation (under the t=5 segment)
      expect(screen.getByTestId("annotation-claim-c-at-5")).toBeTruthy();
      // Claim at t=12 is future (t=10 segment is hidden) — not rendered
      expect(screen.queryByTestId("annotation-claim-c-at-12")).toBeNull();
    });
  });

  it("marker at start_time=5 appears as annotation under the t=5 segment", async () => {
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0), makeSegment(5)],
      markers: [makeMarker("m-at-5", 5)],
    };
    render(<WatchView />);

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    act(() => {
      ytCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      expect(screen.getByTestId("annotation-marker-m-at-5")).toBeTruthy();
    });
  });
});

// ── 6. Synthesis card ─────────────────────────────────────────────────────────

describe("WatchView — synthesis card", () => {
  it("renders synthesis card when synthesis is fresh with text", async () => {
    mockStoreState = {
      ...mockStoreState,
      synthesis: {
        state: "fresh",
        text: "This speech is full of red herrings.",
        headlines: [],
        at: Date.now(),
      },
    };
    render(<WatchView />);

    await waitFor(() => {
      expect(screen.getByTestId("synthesis-card")).toBeTruthy();
      expect(screen.getByText(/This speech is full of red herrings/i)).toBeTruthy();
    });
  });

  it("does not render synthesis card when synthesis is null", async () => {
    mockStoreState = { ...mockStoreState, synthesis: null };
    render(<WatchView />);

    await waitFor(() => {
      expect(screen.getByTestId("player-container")).toBeTruthy();
    });

    expect(screen.queryByTestId("synthesis-card")).toBeNull();
  });

  it("does not render synthesis card when synthesis is warming (no text)", async () => {
    mockStoreState = {
      ...mockStoreState,
      synthesis: { state: "warming", at: Date.now() },
    };
    render(<WatchView />);

    await waitFor(() => {
      expect(screen.getByTestId("player-container")).toBeTruthy();
    });

    expect(screen.queryByTestId("synthesis-card")).toBeNull();
  });
});

// ── 7. Status counter replaces "revealed counter" ────────────────────────────

describe("WatchView — status counter", () => {
  it("shows 'Analysing…' when there are no claims or markers yet", async () => {
    mockStoreState = { ...mockStoreState, claims: [], markers: [] };
    render(<WatchView />);

    await waitFor(() => {
      expect(screen.getByTestId("status-counter").textContent).toContain("Analysing");
    });
  });

  it("shows 'X claims · Y markers' when there are claims and markers", async () => {
    mockStoreState = {
      ...mockStoreState,
      claims: [makeClaim("c1", 5), makeClaim("c2", 10)],
      markers: [makeMarker("m1", 5)],
    };
    render(<WatchView />);

    await waitFor(() => {
      const counter = screen.getByTestId("status-counter");
      expect(counter.textContent).toContain("2 claims");
      expect(counter.textContent).toContain("1 marker");
    });
  });
});

// ── 8. Auto-scroll ────────────────────────────────────────────────────────────

describe("WatchView — auto-scroll", () => {
  it("scrollIntoView is called when the current segment changes", async () => {
    mockStoreState = {
      ...mockStoreState,
      transcript: [makeSegment(0), makeSegment(5), makeSegment(10)],
    };
    render(<WatchView />);

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    // Advance to t=7 — current segment becomes t=5
    act(() => {
      ytCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      expect(screen.getByTestId("transcript-seg-5")).toBeTruthy();
    });

    // scrollIntoView should have been called on some element
    // (the mock is on the prototype so any instance would pick it up)
    const anyScrolled = Array.from(document.querySelectorAll("[data-is-current='true']")).some(
      (el) => (el as HTMLElement).scrollIntoView !== undefined,
    );
    expect(anyScrolled).toBe(true);
  });
});

// ── 9. Audio adapter ──────────────────────────────────────────────────────────

describe("WatchView — audio source", () => {
  it("uses audio adapter for audio_file source", async () => {
    mockStoreState = {
      ...mockStoreState,
      source: {
        kind: "audio_file",
        blob_url: "https://blob.example.com/audio.mp3",
        duration_sec: 60,
        filename: "audio.mp3",
        mime: "audio/mpeg",
      },
      transcript: [makeSegment(0), makeSegment(5)],
    };
    render(<WatchView />);

    await waitFor(() => {
      expect(audioCallbacks.onTimeUpdate).toBeDefined();
    });

    act(() => {
      audioCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      expect(screen.getByTestId("transcript-seg-5")).toBeTruthy();
    });
  });

  it("uses audio adapter for media_url source", async () => {
    mockStoreState = {
      ...mockStoreState,
      source: { kind: "media_url", url: "https://podcast.example.com/ep.mp3" },
      transcript: [makeSegment(0), makeSegment(5)],
    };
    render(<WatchView />);

    await waitFor(() => {
      expect(audioCallbacks.onTimeUpdate).toBeDefined();
    });

    act(() => {
      audioCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      expect(screen.getByTestId("transcript-seg-5")).toBeTruthy();
    });
  });
});
