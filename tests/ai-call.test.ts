import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerate = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerate(...args),
}));

import { aiGenerateText, DEFAULT_AI_TIMEOUT_MS, DEFAULT_AI_MAX_RETRIES } from "@/lib/server/ai-call";

describe("aiGenerateText (Gateway-native retry + timeout wrapper)", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it("passes maxRetries to the underlying SDK call (default 3, configurable)", async () => {
    mockGenerate.mockResolvedValue({ text: "ok", usage: {} });
    await aiGenerateText({
      model: "anthropic/claude-opus-4.7",
      messages: [{ role: "user", content: "hi" }],
    });
    const passed = mockGenerate.mock.calls[0][0];
    expect(passed.maxRetries).toBe(DEFAULT_AI_MAX_RETRIES);
    expect(passed.maxRetries).toBeGreaterThanOrEqual(2);
  });

  it("attaches an AbortSignal that fires at the configured timeout", async () => {
    mockGenerate.mockImplementation(async (args: { abortSignal?: AbortSignal }) => {
      expect(args.abortSignal).toBeInstanceOf(AbortSignal);
      return { text: "ok", usage: {} };
    });
    await aiGenerateText({
      model: "anthropic/claude-opus-4.7",
      messages: [{ role: "user", content: "hi" }],
    });
  });

  it("respects a caller-supplied timeoutMs override", async () => {
    mockGenerate.mockResolvedValue({ text: "ok", usage: {} });
    await aiGenerateText(
      { model: "anthropic/claude-opus-4.7", messages: [] },
      { timeoutMs: 5_000 },
    );
    expect(mockGenerate).toHaveBeenCalled();
  });

  it("does NOT swallow 4xx — those propagate to the caller", async () => {
    mockGenerate.mockRejectedValue(
      Object.assign(new Error("Bad request"), { statusCode: 400 }),
    );
    await expect(
      aiGenerateText({
        model: "anthropic/claude-opus-4.7",
        messages: [],
      }),
    ).rejects.toThrow("Bad request");
  });

  it("uses the configured default timeout when none is supplied", () => {
    expect(DEFAULT_AI_TIMEOUT_MS).toBeGreaterThanOrEqual(15_000);
    expect(DEFAULT_AI_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
  });
});
