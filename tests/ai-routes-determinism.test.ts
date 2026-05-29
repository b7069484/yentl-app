import { beforeEach, describe, expect, it, vi } from "vitest";

// Phase 1d Task 4 — every AI route that contributes to the trimodal eval's
// cross-mode integrity metrics must pass `temperature: 0`. Without it, the
// Anthropic SDK defaults to 1.0 and the same input produces different
// outputs across re-runs and modes — root cause of the 0% claim Jaccard the
// eval found on hitchens_mcgrath SRT vs audio. Synthesize is intentionally
// left at the SDK default since some creative variety is acceptable in a
// summary.

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("@/lib/server/ai-call", () => ({
  aiGenerateText: mockGenerateText,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
  RATE_LIMITS: { model: { bucket: "model", limit: 240, windowMs: 60_000 } },
}));

vi.mock("@/lib/server/anthropic", () => ({
  opus: "mock-opus-model",
  anthropic: {
    tools: {
      webSearch_20260209: vi.fn().mockReturnValue("mock-web-search-tool"),
    },
  },
}));

// Engagement gate is invoked by verify routes; stub it out so we don't have
// to thread a real rate-limit / consent path.
vi.mock("@/lib/server/engagement-gate", () => ({
  enforceEngagementGate: vi.fn().mockResolvedValue(null),
}));

function passingThroughResponse(payload: unknown) {
  return {
    output: payload,
    text: "",
    finishReason: "stop" as const,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    steps: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AI routes pass temperature: 0 (Phase 1d Task 4)", () => {
  it("extract-claims sets temperature: 0", async () => {
    mockGenerateText.mockResolvedValue(
      passingThroughResponse({ claims: [] }),
    );

    const { POST } = await import("@/app/api/extract-claims/route");
    const res = await POST(
      new Request("http://localhost/api/extract-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utterance: "Test utterance for determinism.",
          utterance_start: 0,
          utterance_end: 2,
          context: "",
          recent_hashes: [],
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0 }),
    );
  });

  it("verify-provisional sets temperature: 0", async () => {
    mockGenerateText.mockResolvedValue(
      passingThroughResponse({
        primary_label: "TRUE",
        score: 95,
        annotations: [],
        explanation: "ok",
        label_rationale: "Picked TRUE over MOSTLY_TRUE because evidence is unambiguous.",
      }),
    );

    const { POST } = await import("@/app/api/verify-provisional/route");
    const res = await POST(
      new Request("http://localhost/api/verify-provisional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_text: "Test claim.",
          source_context: "",
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0 }),
    );
  });

  it("verify-confirmed sets temperature: 0", async () => {
    mockGenerateText.mockResolvedValue(
      passingThroughResponse({
        primary_label: "TRUE",
        score: 95,
        annotations: [],
        explanation: "ok",
        label_rationale: "Picked TRUE over MOSTLY_TRUE because every source supports it.",
        stance_refs: [],
      }),
    );

    const { POST } = await import("@/app/api/verify-confirmed/route");
    const res = await POST(
      new Request("http://localhost/api/verify-confirmed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_text: "Test claim.",
          source_context: "",
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0 }),
    );
  });

  it("analyze-rhetoric sets temperature: 0", async () => {
    mockGenerateText.mockResolvedValue(
      passingThroughResponse({ markers: [] }),
    );

    const { POST } = await import("@/app/api/analyze-rhetoric/route");
    const res = await POST(
      new Request("http://localhost/api/analyze-rhetoric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript_window: "Test rhetoric window.",
          recent_hashes: [],
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0 }),
    );
  });
});
