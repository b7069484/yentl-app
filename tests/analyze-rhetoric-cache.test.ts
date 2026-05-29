import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the rate limiter so the route proceeds past the guard
vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => null),
  RATE_LIMITS: { model: { bucket: "model", limit: 240, windowMs: 60_000 } },
}));

// Mock the anthropic lib — opus is just a string constant
vi.mock("@/lib/server/anthropic", () => ({
  opus: "mock-opus-model",
}));

// Mock the ai package — preserve Output so schema validation passes
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

describe("analyze-rhetoric cache control (Phase 1e revert of Phase 1a Task 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses cacheControl.type='ephemeral' on the rhetoric system message", async () => {
    // Phase 1e — Phase 1a Task 7 (ad7af89) attempted to use "persistent"
    // for a token-cost win, but Anthropic only accepts "ephemeral":
    //   "system.0.cache_control: Input tag 'persistent' found using 'type'
    //    does not match any of the expected tags: 'ephemeral'"
    // Every analyze-rhetoric call was returning HTTP 500 silently — surfaced
    // by the trimodal eval (0 markers across 8/8 candidates / 24 modes).
    // Reverted to "ephemeral" (the only Anthropic-accepted value).
    const { generateText } = await import("ai");
    const mockGenerateText = generateText as ReturnType<typeof vi.fn>;

    // generateText is called with Output.object — return a valid markers array
    mockGenerateText.mockResolvedValue({
      output: { markers: [] },
    });

    const { POST } = await import("@/app/api/analyze-rhetoric/route");

    const req = new Request("http://localhost/api/analyze-rhetoric", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        transcript_window: "Hello world",
        recent_hashes: [],
      }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockGenerateText).toHaveBeenCalledOnce();

    const callArg = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
    const anthropicOpts = (callArg?.providerOptions as Record<string, unknown>)?.anthropic as Record<string, unknown>;
    const cacheType = (anthropicOpts?.cacheControl as Record<string, unknown>)?.type;

    expect(cacheType).toBe("ephemeral");
  });
});
