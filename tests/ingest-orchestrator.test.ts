import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// vi.mock factories are hoisted — no top-level const references allowed inside.
// Use vi.hoisted() to create the mock fns so they're available in the factory.

const {
  mockStartSession,
  mockAppendFinal,
  mockOnFinalUtterance,
  mockRunSynthesisNow,
  sessionState,
} = vi.hoisted(() => {
  const mockStartSession = vi.fn();
  const mockAppendFinal = vi.fn();
  const mockOnFinalUtterance = vi.fn().mockResolvedValue(undefined);
  const mockRunSynthesisNow = vi.fn().mockResolvedValue(undefined);

  const sessionState = {
    startedAt: null as string | null,
    startSession: mockStartSession,
    appendFinal: mockAppendFinal,
  };

  return { mockStartSession, mockAppendFinal, mockOnFinalUtterance, mockRunSynthesisNow, sessionState };
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
  it("calls appendFinal() for each segment", async () => {
    const segs = [makeSeg("One.", 0), makeSeg("Two.", 1), makeSeg("Three.", 2)];
    await bulkIngest(segs);
    expect(mockAppendFinal).toHaveBeenCalledTimes(3);
    expect(mockAppendFinal).toHaveBeenNthCalledWith(1, segs[0]);
    expect(mockAppendFinal).toHaveBeenNthCalledWith(2, segs[1]);
    expect(mockAppendFinal).toHaveBeenNthCalledWith(3, segs[2]);
  });

  it("calls onFinalUtterance() for each segment", async () => {
    const segs = [makeSeg("One.", 0), makeSeg("Two.", 1)];
    await bulkIngest(segs);
    expect(mockOnFinalUtterance).toHaveBeenCalledTimes(2);
    expect(mockOnFinalUtterance).toHaveBeenNthCalledWith(1, segs[0]);
    expect(mockOnFinalUtterance).toHaveBeenNthCalledWith(2, segs[1]);
  });

  it("calls runSynthesisNow() exactly once at the end", async () => {
    const segs = [makeSeg("A.", 0), makeSeg("B.", 1)];
    await bulkIngest(segs);
    expect(mockRunSynthesisNow).toHaveBeenCalledTimes(1);
  });

  it("handles empty segment array: startSession called, no appendFinal/onFinalUtterance, runSynthesisNow once", async () => {
    sessionState.startedAt = null;
    await bulkIngest([]);
    expect(mockStartSession).toHaveBeenCalledTimes(1);
    expect(mockAppendFinal).not.toHaveBeenCalled();
    expect(mockOnFinalUtterance).not.toHaveBeenCalled();
    expect(mockRunSynthesisNow).toHaveBeenCalledTimes(1);
  });
});

describe("bulkIngest — ordering", () => {
  it("order: startSession → appendFinal/onFinalUtterance loop → runSynthesisNow", async () => {
    const calls: string[] = [];
    mockStartSession.mockImplementation(() => calls.push("startSession"));
    mockAppendFinal.mockImplementation(() => calls.push("appendFinal"));
    mockOnFinalUtterance.mockImplementation(async () => { calls.push("onFinalUtterance"); });
    mockRunSynthesisNow.mockImplementation(async () => { calls.push("runSynthesisNow"); });

    sessionState.startedAt = null;
    await bulkIngest([makeSeg("Seg 1.", 0), makeSeg("Seg 2.", 1)]);

    expect(calls).toEqual([
      "startSession",
      "appendFinal",
      "onFinalUtterance",
      "appendFinal",
      "onFinalUtterance",
      "runSynthesisNow",
    ]);
  });
});
