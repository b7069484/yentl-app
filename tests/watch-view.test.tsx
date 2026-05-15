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
};

let mockStoreState: StoreState = {
  source: { kind: "youtube", video_id: "abc123", url: "https://youtube.com/watch?v=abc123" },
  claims: [],
  markers: [],
  synthesis: null,
  speakers: [],
};

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: StoreState) => unknown) => {
    return selector ? selector(mockStoreState) : mockStoreState;
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

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
  };
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

// ── 2. Initial revealed state ─────────────────────────────────────────────────

describe("WatchView — initial revealed state", () => {
  it("shows 'Press play' hint when there are claims but currentTime=0", async () => {
    mockStoreState = {
      ...mockStoreState,
      claims: [makeClaim("c1", 5), makeClaim("c2", 15), makeClaim("c3", 25)],
    };
    render(<WatchView />);

    // Wait for async adapter setup to run
    await waitFor(() => {
      expect(screen.getByTestId("press-play-hint")).toBeTruthy();
    });

    expect(screen.getByTestId("revealed-counter").textContent).toContain("0 of 3");
  });

  it("renders player container for youtube source", async () => {
    render(<WatchView />);
    await waitFor(() => {
      expect(screen.getByTestId("player-container")).toBeTruthy();
    });
  });
});

// ── 3. Claim revelation as currentTime advances ───────────────────────────────

describe("WatchView — progressive claim revelation", () => {
  function setup() {
    mockStoreState = {
      ...mockStoreState,
      claims: [makeClaim("c1", 5), makeClaim("c2", 15), makeClaim("c3", 25)],
    };
    render(<WatchView />);
  }

  it("reveals claim at t=5 when onTimeUpdate(10) fires", async () => {
    setup();

    await waitFor(() => {
      expect(ytCallbacks.onTimeUpdate).toBeDefined();
    });

    act(() => {
      ytCallbacks.onTimeUpdate!(10);
    });

    await waitFor(() => {
      expect(screen.getByTestId("revealed-counter").textContent).toContain("1 of 3");
      expect(screen.getByTestId("revealed-row-c1")).toBeTruthy();
      expect(screen.queryByTestId("revealed-row-c2")).toBeNull();
    });
  });

  it("reveals claims at t=5 and t=15 when onTimeUpdate(20) fires", async () => {
    setup();

    await waitFor(() => {
      expect(ytCallbacks.onTimeUpdate).toBeDefined();
    });

    act(() => {
      ytCallbacks.onTimeUpdate!(20);
    });

    await waitFor(() => {
      expect(screen.getByTestId("revealed-counter").textContent).toContain("2 of 3");
      expect(screen.getByTestId("revealed-row-c1")).toBeTruthy();
      expect(screen.getByTestId("revealed-row-c2")).toBeTruthy();
      expect(screen.queryByTestId("revealed-row-c3")).toBeNull();
    });
  });

  it("hides claim at t=15 when seeking back to t=5", async () => {
    setup();

    await waitFor(() => {
      expect(ytCallbacks.onTimeUpdate).toBeDefined();
    });

    // First advance past 15
    act(() => {
      ytCallbacks.onTimeUpdate!(20);
    });

    await waitFor(() => {
      expect(screen.getByTestId("revealed-row-c2")).toBeTruthy();
    });

    // Seek back to 5 (only c1 should remain)
    act(() => {
      ytCallbacks.onTimeUpdate!(5);
    });

    await waitFor(() => {
      expect(screen.getByTestId("revealed-counter").textContent).toContain("1 of 3");
      expect(screen.getByTestId("revealed-row-c1")).toBeTruthy();
      expect(screen.queryByTestId("revealed-row-c2")).toBeNull();
    });
  });
});

// ── 4. Click-to-seek ──────────────────────────────────────────────────────────

describe("WatchView — click-to-seek", () => {
  it("calls adapter.seekTo with the claim's timestamp when row is clicked", async () => {
    mockStoreState = {
      ...mockStoreState,
      claims: [makeClaim("c1", 5)],
    };
    render(<WatchView />);

    await waitFor(() => {
      expect(ytCallbacks.onTimeUpdate).toBeDefined();
    });

    // Reveal the claim
    act(() => {
      ytCallbacks.onTimeUpdate!(10);
    });

    await waitFor(() => {
      expect(screen.getByTestId("revealed-row-c1")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("revealed-row-c1"));
    expect(mockSeekTo).toHaveBeenCalledWith(5);
  });
});

// ── 5. Synthesis card ─────────────────────────────────────────────────────────

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

    // Give async effects a moment to settle
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

// ── 6. Audio adapter wired correctly ─────────────────────────────────────────

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
      claims: [makeClaim("c1", 5)],
    };
    render(<WatchView />);

    await waitFor(() => {
      expect(audioCallbacks.onTimeUpdate).toBeDefined();
    });

    act(() => {
      audioCallbacks.onTimeUpdate!(10);
    });

    await waitFor(() => {
      expect(screen.getByTestId("revealed-row-c1")).toBeTruthy();
    });
  });

  it("uses audio adapter for media_url source", async () => {
    mockStoreState = {
      ...mockStoreState,
      source: { kind: "media_url", url: "https://podcast.example.com/ep.mp3" },
      claims: [makeClaim("c1", 5)],
    };
    render(<WatchView />);

    await waitFor(() => {
      expect(audioCallbacks.onTimeUpdate).toBeDefined();
    });

    act(() => {
      audioCallbacks.onTimeUpdate!(10);
    });

    await waitFor(() => {
      expect(screen.getByTestId("revealed-row-c1")).toBeTruthy();
    });
  });
});
