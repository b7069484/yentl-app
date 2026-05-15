/**
 * Tests for maybeRunSynthesis() pacer in lib/client/orchestrator.ts
 *
 * NOTE: synthesisUtteranceCounter and synthesisAbortController are module-scoped
 * in orchestrator.ts. We use vi.resetModules() + dynamic import in each test
 * (or describe block) to get a fresh module instance with counter=0.
 *
 * IMPORTANT: On a fresh module, lastSynthesisRunAt=0, so the very first call to
 * maybeRunSynthesis() ALWAYS fires (timeSince=Date.now()-0 >> 30_000). This is
 * intentional per spec: "fires after 30s regardless of utterance count". After
 * that first fire, lastSynthesisRunAt is set to now, so subsequent calls only
 * fire on multiples-of-5 or after another 30s.
 *
 * The counter is NOT reset to 0 on session restart — it only resets when the
 * module is re-loaded (full page reload in production).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush all pending microtasks and macrotasks via real setTimeout. */
const flushAsync = () => new Promise<void>((r) => { r(); });

/** Seed the Zustand session store with minimal state for orchestrator reads. */
async function seedStore(opts: {
  transcriptLen?: number;
  claims?: Array<{ primary_label: string }>;
  markers?: Array<{ type: string }>;
  speakers?: Array<{ id: number; label: string }>;
}) {
  const { useSession } = await import("@/lib/client/session-store");
  useSession.getState().reset();

  const { transcriptLen = 0, claims = [], markers = [], speakers = [] } = opts;

  for (let i = 0; i < transcriptLen; i++) {
    useSession.getState().appendFinal({
      text: `Utterance ${i}`,
      start: i * 2,
      end: i * 2 + 1,
      is_final: true,
      speaker_id: null,
    });
  }

  for (const c of claims) {
    useSession.getState().addClaim({
      id: `c-${Math.random()}`,
      claim_text: "test",
      utterance_start: 0,
      utterance_end: 1,
      speaker_id: null,
      topic: "Other",
      topic_secondary: null,
      primary_label: c.primary_label as never,
      score: 0,
      annotations: [],
      explanation: "",
      status: "confirmed",
      sources: [],
    });
  }
  for (const m of markers) {
    useSession.getState().addMarker({
      id: `m-${Math.random()}`,
      type: m.type as never,
      name: "test",
      display: "Test",
      excerpt: "test excerpt",
      speaker_id: null,
      start_time: 0,
      end_time: 1,
      severity: "clear",
      explanation: "test",
    });
  }
  for (const sp of speakers) {
    useSession.getState().ensureSpeaker(sp.id);
    useSession.getState().renameSpeaker(sp.id, sp.label);
  }
}

// ---------------------------------------------------------------------------
// Pacer: fires after 5 utterances (uses fake timers for time control)
// ---------------------------------------------------------------------------

describe("maybeRunSynthesis — fires after 5 utterances", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(100_000); // 100s into epoch — fresh module lastSynthesisRunAt=0 so timeSince=100s > 30s
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires on the very first call (fresh module: timeSince >> 30s)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "p", headlines: ["a", "b", "c"] }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 1 });
    const { maybeRunSynthesis } = await import("@/lib/client/orchestrator");

    maybeRunSynthesis();
    await flushAsync();

    const synthesisCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/synthesize");
    expect(synthesisCalls.length).toBe(1);
  });

  it("does NOT fire on utterances 2-4 after the initial fire", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "p", headlines: ["a", "b", "c"] }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 4 });
    const { maybeRunSynthesis } = await import("@/lib/client/orchestrator");

    // First call fires (fresh module, timeSince=100s > 30s)
    maybeRunSynthesis();
    // Advance only 1s so next calls are within 30s window
    vi.advanceTimersByTime(1_000);
    await flushAsync();

    const countAfterFirst = fetchMock.mock.calls.filter(([url]) => url === "/api/synthesize").length;
    expect(countAfterFirst).toBe(1);

    // Utterances 2, 3, 4 — not multiples of 5, not > 30s
    maybeRunSynthesis();
    maybeRunSynthesis();
    maybeRunSynthesis();
    await flushAsync();

    const countAfter234 = fetchMock.mock.calls.filter(([url]) => url === "/api/synthesize").length;
    expect(countAfter234).toBe(1);
  });

  it("fires on utterance 5 (multiple of 5)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "p", headlines: ["a", "b", "c"] }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 5 });
    const { maybeRunSynthesis } = await import("@/lib/client/orchestrator");

    maybeRunSynthesis(); // utterance 1 — fires (fresh module)
    vi.advanceTimersByTime(1_000); // only 1s
    await flushAsync();
    maybeRunSynthesis(); // 2
    maybeRunSynthesis(); // 3
    maybeRunSynthesis(); // 4
    maybeRunSynthesis(); // 5 — fires (multiple of 5)
    await flushAsync();

    const synthesisCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/synthesize");
    expect(synthesisCalls.length).toBe(2);
  });

  it("fires at utterances 1, 5, 10 (every 5 after initial)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "p", headlines: ["a", "b", "c"] }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 10 });
    const { maybeRunSynthesis } = await import("@/lib/client/orchestrator");

    maybeRunSynthesis(); // 1 — fires (fresh module)
    vi.advanceTimersByTime(1_000);
    await flushAsync();
    maybeRunSynthesis(); // 2
    maybeRunSynthesis(); // 3
    maybeRunSynthesis(); // 4
    maybeRunSynthesis(); // 5 — fires (multiple of 5)
    await flushAsync();
    maybeRunSynthesis(); // 6
    maybeRunSynthesis(); // 7
    maybeRunSynthesis(); // 8
    maybeRunSynthesis(); // 9
    maybeRunSynthesis(); // 10 — fires (multiple of 5)
    await flushAsync();

    const synthesisCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/synthesize");
    expect(synthesisCalls.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Pacer: fires after 30 seconds regardless of utterance count
// ---------------------------------------------------------------------------

describe("maybeRunSynthesis — fires after 30s timeout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires when more than 30s have elapsed since last run", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "p", headlines: ["a", "b", "c"] }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 3 });
    const { maybeRunSynthesis } = await import("@/lib/client/orchestrator");

    // First call fires (fresh module)
    maybeRunSynthesis();
    vi.advanceTimersByTime(1_000); // only 1s — NOT enough for 30s trigger
    await flushAsync();

    const countAfterFirst = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    ).length;
    expect(countAfterFirst).toBe(1);

    // Advance 31 more seconds
    vi.advanceTimersByTime(31_000);

    maybeRunSynthesis(); // utterance 2 — not multiple of 5, but > 30s elapsed → fires
    await flushAsync();

    const countAfterWait = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    ).length;
    expect(countAfterWait).toBe(2);
  });

  it("does NOT fire on utterance 2 when only ~5s have elapsed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "p", headlines: ["a", "b", "c"] }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 3 });
    const { maybeRunSynthesis } = await import("@/lib/client/orchestrator");

    maybeRunSynthesis(); // fires (fresh module)
    vi.advanceTimersByTime(5_000); // only 5s
    await flushAsync();

    maybeRunSynthesis(); // utterance 2 — NOT a multiple of 5, NOT > 30s
    await flushAsync();

    const synthesisCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    );
    expect(synthesisCalls.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Abort controller: concurrent calls cancel the previous
// (Real timers — no fake timer interference with Promise resolution)
// ---------------------------------------------------------------------------

describe("maybeRunSynthesis — AbortController cancels in-flight", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("second run aborts the first in-flight request", async () => {
    let firstSignal: AbortSignal | undefined;

    const fetchMock = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      const signal = opts.signal as AbortSignal;
      if (!firstSignal) {
        firstSignal = signal;
        // Return a promise that only rejects on abort
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      }
      // Second call — resolves immediately
      return Promise.resolve({
        ok: true,
        json: async () => ({ text: "p2", headlines: ["x", "y", "z"] }),
      } as Response);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 10 });
    const { maybeRunSynthesis } = await import("@/lib/client/orchestrator");

    // First fire: utterance 1 (timeSince >> 30s on fresh module since Date.now() >> 0)
    maybeRunSynthesis();
    await flushAsync();

    expect(firstSignal).toBeDefined();
    expect(firstSignal!.aborted).toBe(false);

    // Utterances 2-4 (no fire, < 30s elapsed on a real clock since we just set lastSynthesisRunAt)
    // Use utterance counter to trigger at 5
    maybeRunSynthesis(); // 2
    maybeRunSynthesis(); // 3
    maybeRunSynthesis(); // 4
    maybeRunSynthesis(); // 5 — fires (multiple of 5), should abort first
    await flushAsync();

    expect(firstSignal!.aborted).toBe(true);
  }, 10_000);
});

// ---------------------------------------------------------------------------
// abortSynthesis() exported function
// (Real timers)
// ---------------------------------------------------------------------------

describe("abortSynthesis()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("aborts an in-flight synthesis request", async () => {
    let capturedSignal: AbortSignal | undefined;

    const fetchMock = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedSignal = opts.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal!.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 5 });
    const { maybeRunSynthesis, abortSynthesis } = await import("@/lib/client/orchestrator");

    // First call fires (fresh module, timeSince >> 30s)
    maybeRunSynthesis();
    await flushAsync();

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(false);

    abortSynthesis();
    expect(capturedSignal!.aborted).toBe(true);
  }, 10_000);

  it("does not error when called with no in-flight request", async () => {
    const { abortSynthesis } = await import("@/lib/client/orchestrator");
    expect(() => abortSynthesis()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Store state: abort does not leak an "error" state
// (Real timers)
// ---------------------------------------------------------------------------

describe("maybeRunSynthesis — abort does not leak error state", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("store synthesis does not transition to error state after abort", async () => {
    let capturedSignal: AbortSignal | undefined;
    let rejectFetch: ((e: Error) => void) | undefined;

    const fetchMock = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedSignal = opts.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        rejectFetch = reject;
        capturedSignal!.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await seedStore({ transcriptLen: 5 });
    const { maybeRunSynthesis, abortSynthesis } = await import("@/lib/client/orchestrator");
    const { useSession } = await import("@/lib/client/session-store");

    // First call fires (fresh module)
    maybeRunSynthesis();
    await flushAsync();

    // Abort immediately
    abortSynthesis();

    // Let the rejection propagate through the promise chain
    // The fetch rejects synchronously once abort signal fires
    await new Promise<void>((r) => {
      // Use real setTimeout to flush microtasks in a non-fake-timer context
      globalThis.setTimeout(() => r(), 50);
    });

    // Store must NOT have transitioned to "error"
    const synth = useSession.getState().synthesis;
    const state = (synth as { state: string } | null)?.state;
    expect(state).not.toBe("error");
  }, 10_000);
});
