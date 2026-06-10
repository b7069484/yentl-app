import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// vi.mock factories are hoisted — no top-level const references allowed inside.
// Use vi.hoisted() to create the mock fns so they're available in the factory.

const {
  mockStartSession,
  mockAppendFinal,
  mockEnsureSpeaker,
  mockRenameSpeaker,
  mockOnFinalUtterance,
  mockRunSynthesisNow,
  sessionState,
} = vi.hoisted(() => {
  const mockStartSession = vi.fn();
  const mockAppendFinal = vi.fn();
  const mockEnsureSpeaker = vi.fn();
  const mockRenameSpeaker = vi.fn();
  const mockOnFinalUtterance = vi.fn().mockResolvedValue(undefined);
  const mockRunSynthesisNow = vi.fn().mockResolvedValue(undefined);

  const sessionState = {
    startedAt: null as string | null,
    startSession: mockStartSession,
    appendFinal: mockAppendFinal,
    ensureSpeaker: mockEnsureSpeaker,
    renameSpeaker: mockRenameSpeaker,
  };

  return {
    mockStartSession,
    mockAppendFinal,
    mockEnsureSpeaker,
    mockRenameSpeaker,
    mockOnFinalUtterance,
    mockRunSynthesisNow,
    sessionState,
  };
});

vi.mock("@/lib/client/session-store", () => ({
  useSession: {
    getState: vi.fn(() => sessionState),
  },
}));

vi.mock("@/lib/client/orchestrator", () => ({
  onFinalUtterance: mockOnFinalUtterance,
  runSynthesisNow: mockRunSynthesisNow,
}));

import { bulkIngest } from "@/lib/client/ingest-orchestrator";
import type { TranscriptSegment } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSeg(text: string, i: number): TranscriptSegment {
  return {
    text,
    start: i * 1000,
    end: i * 1000 + 800,
    is_final: true,
    speaker_id: 0,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.startedAt = null;
  // Re-attach after clearAllMocks clears mock implementations
  mockStartSession.mockImplementation(() => undefined);
  mockAppendFinal.mockImplementation(() => undefined);
  mockEnsureSpeaker.mockImplementation(() => undefined);
  mockRenameSpeaker.mockImplementation(() => undefined);
  mockOnFinalUtterance.mockResolvedValue(undefined);
  mockRunSynthesisNow.mockResolvedValue(undefined);
});

describe("bulkIngest — session start", () => {
  it("calls startSession() when startedAt is null", async () => {
    sessionState.startedAt = null;
    await bulkIngest([makeSeg("Hello.", 0)]);
    expect(mockStartSession).toHaveBeenCalledTimes(1);
  });

  it("does NOT call startSession() when startedAt is already set", async () => {
    sessionState.startedAt = new Date().toISOString();
    await bulkIngest([makeSeg("Hello.", 0)]);
    expect(mockStartSession).not.toHaveBeenCalled();
  });
});

describe("bulkIngest — segment processing", () => {
  it("calls appendFinal() for each segment synchronously before resolving", async () => {
    const segs = [makeSeg("One.", 0), makeSeg("Two.", 1), makeSeg("Three.", 2)];
    await bulkIngest(segs);
    // All appendFinal calls are made before bulkIngest resolves —
    // this is the contract Watch view depends on (full transcript visible immediately)
    expect(mockAppendFinal).toHaveBeenCalledTimes(3);
    expect(mockAppendFinal).toHaveBeenNthCalledWith(1, segs[0]);
    expect(mockAppendFinal).toHaveBeenNthCalledWith(2, segs[1]);
    expect(mockAppendFinal).toHaveBeenNthCalledWith(3, segs[2]);
  });

  it("registers and labels provider-detected speakers before appending transcript", async () => {
    const calls: string[] = [];
    mockEnsureSpeaker.mockImplementation((id) => calls.push(`ensure:${id}`));
    mockRenameSpeaker.mockImplementation((id, label) => calls.push(`rename:${id}:${label}`));
    mockAppendFinal.mockImplementation(() => calls.push("appendFinal"));

    await bulkIngest([makeSeg("Hello.", 0)], {
      speakers: [
        { id: 0, label: "Mira" },
        { id: 1, label: "Jordan" },
      ],
    });

    expect(mockEnsureSpeaker).toHaveBeenCalledWith(0);
    expect(mockRenameSpeaker).toHaveBeenCalledWith(0, "Mira");
    expect(mockEnsureSpeaker).toHaveBeenCalledWith(1);
    expect(mockRenameSpeaker).toHaveBeenCalledWith(1, "Jordan");
    expect(calls).toEqual([
      "ensure:0",
      "rename:0:Mira",
      "ensure:1",
      "rename:1:Jordan",
      "appendFinal",
    ]);
  });

  it("eventually calls onFinalUtterance() for each segment (parallel, background)", async () => {
    // These two segments have a gap of 1000s (i * 1000 - (i-1) * 1000 + 800 = 200s)
    // which is >> 1.5s, so mergeIntoUtterances keeps them as separate utterances.
    // The merge reconstructs them as new objects, so we use toContainEqual for deep equality.
    const segs = [makeSeg("One.", 0), makeSeg("Two.", 1)];
    await bulkIngest(segs);
    // Wait for the background workers to drain
    await vi.waitFor(() => {
      expect(mockOnFinalUtterance).toHaveBeenCalledTimes(2);
    });
    // Both segments should appear in the call list (order not guaranteed since
    // workers race; just assert presence via deep equality — merge produces
    // new object references even when no merging occurs)
    const calledArgs = mockOnFinalUtterance.mock.calls.map((c) => c[0]);
    expect(calledArgs).toContainEqual(segs[0]);
    expect(calledArgs).toContainEqual(segs[1]);
  });

  it("schedules runSynthesisNow() after the delay", async () => {
    vi.useFakeTimers();
    try {
      const segs = [makeSeg("A.", 0), makeSeg("B.", 1)];
      await bulkIngest(segs);
      // Synthesis is delayed — not called immediately
      expect(mockRunSynthesisNow).not.toHaveBeenCalled();
      // Advance past the synthesis delay
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockRunSynthesisNow).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("handles empty segment array: startSession called, no appendFinal/onFinalUtterance, synthesis still scheduled", async () => {
    vi.useFakeTimers();
    try {
      sessionState.startedAt = null;
      await bulkIngest([]);
      expect(mockStartSession).toHaveBeenCalledTimes(1);
      expect(mockAppendFinal).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockOnFinalUtterance).not.toHaveBeenCalled();
      // Synthesis is still scheduled — produces a "nothing on the floor yet" read
      expect(mockRunSynthesisNow).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("bulkIngest — ordering", () => {
  it("appendFinal calls all complete before bulkIngest resolves; analysis runs after", async () => {
    const calls: string[] = [];
    mockStartSession.mockImplementation(() => calls.push("startSession"));
    mockAppendFinal.mockImplementation(() => calls.push("appendFinal"));
    mockOnFinalUtterance.mockImplementation(async () => { calls.push("onFinalUtterance"); });

    sessionState.startedAt = null;
    await bulkIngest([makeSeg("Seg 1.", 0), makeSeg("Seg 2.", 1)]);

    // Before resolution: startSession + all appendFinal calls done.
    // onFinalUtterance dispatched but its async resolution may or may not
    // have happened yet — that's OK; the Watch view doesn't depend on it.
    const beforeAnalysis = calls.slice(0, 3);
    expect(beforeAnalysis).toEqual(["startSession", "appendFinal", "appendFinal"]);

    // Wait for analysis to drain
    await vi.waitFor(() => {
      expect(mockOnFinalUtterance).toHaveBeenCalledTimes(2);
    });
  });
});

describe("bulkIngest — AbortSignal", () => {
  it("aborted before start: skips all appendFinal, no analysis, no synthesis", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      controller.abort();

      await bulkIngest([makeSeg("A.", 0), makeSeg("B.", 1)], { signal: controller.signal });

      expect(mockAppendFinal).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockOnFinalUtterance).not.toHaveBeenCalled();
      expect(mockRunSynthesisNow).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborted mid-append: stops appending and does not dispatch analysis", async () => {
    const controller = new AbortController();
    let appendCount = 0;
    mockAppendFinal.mockImplementation(() => {
      appendCount++;
      if (appendCount === 1) controller.abort();
    });

    const segs = [makeSeg("A.", 0), makeSeg("B.", 1), makeSeg("C.", 2)];
    await bulkIngest(segs, { signal: controller.signal });

    // Only the first appendFinal landed; loop bailed after detecting abort
    expect(mockAppendFinal).toHaveBeenCalledTimes(1);
    // Analysis was never dispatched because we aborted before reaching that step
    expect(mockOnFinalUtterance).not.toHaveBeenCalled();
  });
});
