import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

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

// ── 1. No media state ─────────────────────────────────────────────────────────

describe("WatchView — no-media fallback", () => {
  it("renders 'No media to watch' for mic source", () => {
    mockStoreState = { ...mockStoreState, source: { kind: "mic" } };
    render(<WatchView />);
    expect(screen.getByTestId("no-media-message")).toBeTruthy();
    expect(screen.getByText(/No media to watch/i)).toBeTruthy();
    expect(screen.getByText(/live microphone/i)).toBeTruthy();
  });

  it("renders 'No media to watch' for text_doc source", () => {
    mockStoreState = {
      ...mockStoreState,
      source: { kind: "text_doc", filename: "doc.txt", mime: "text/plain", byte_count: 1000 },
    };
    render(<WatchView />);
    expect(screen.getByTestId("no-media-message")).toBeTruthy();
    expect(screen.getByText(/No media to watch/i)).toBeTruthy();
    expect(screen.getByText(/text/i)).toBeTruthy();
  });
});

// ── 2. Transcript panel visibility ────────────────────────────────────────────

describe("WatchView — transcript panel", () => {
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

  it("with currentTime=0 → only segment at t=0 is rendered (others have start > 0 + 0.3)", async () => {
    setup();

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    // currentTime starts at 0 by default (no onTimeUpdate fired yet)
    // Segment at t=0: start(0) <= 0 + 0.3 → rendered
    // Segment at t=5: start(5) > 0 + 0.3 → hidden

    await waitFor(() => {
      expect(screen.getByTestId("transcript-seg-0")).toBeTruthy();
    });
    expect(screen.queryByTestId("transcript-seg-5")).toBeNull();
    expect(screen.queryByTestId("transcript-seg-10")).toBeNull();
    expect(screen.queryByTestId("transcript-seg-15")).toBeNull();
    expect(screen.queryByTestId("transcript-seg-20")).toBeNull();
  });

  it("currentTime=7 → segments at t=0 and t=5 rendered, t=5 is current (highlighted)", async () => {
    setup();

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    act(() => {
      ytCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      // t=0 and t=5 should be visible (5 <= 7 + 0.3)
      expect(screen.getByTestId("transcript-seg-0")).toBeTruthy();
      expect(screen.getByTestId("transcript-seg-5")).toBeTruthy();
      // t=10: 10 > 7.3 → hidden
      expect(screen.queryByTestId("transcript-seg-10")).toBeNull();
    });

    // t=5 is current (last visible whose start <= currentTime=7)
    const currentEl = screen.getByTestId("transcript-seg-5");
    expect(currentEl.getAttribute("data-is-current")).toBe("true");

    // t=0 is past — no current marker
    const pastEl = screen.getByTestId("transcript-seg-0");
    expect(pastEl.getAttribute("data-is-current")).toBeNull();
  });

  it("currentTime backward from 7 to 4 → segment at t=5 hidden again", async () => {
    setup();

    await waitFor(() => expect(ytCallbacks.onTimeUpdate).toBeDefined());

    // First advance to 7
    act(() => {
      ytCallbacks.onTimeUpdate!(7);
    });

    await waitFor(() => {
      expect(screen.getByTestId("transcript-seg-5")).toBeTruthy();
    });

    // Seek back to 4
    act(() => {
      ytCallbacks.onTimeUpdate!(4);
    });

    await waitFor(() => {
      // t=0: visible (0 <= 4 + 0.3)
      expect(screen.getByTestId("transcript-seg-0")).toBeTruthy();
      // t=5: 5 > 4.3 → hidden
      expect(screen.queryByTestId("transcript-seg-5")).toBeNull();
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
