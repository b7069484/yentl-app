import { beforeEach, describe, expect, it, vi } from "vitest";

const aiMocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: aiMocks.generateText,
}));

import {
  aiGenerateText,
  DEFAULT_AI_MAX_RETRIES,
  DEFAULT_AI_TIMEOUT_MS,
} from "@/lib/server/ai-call";

const basicArgs = {
  model: "mock-model" as never,
  prompt: "hi",
};

describe("aiGenerateText", () => {
  beforeEach(() => {
    aiMocks.generateText.mockReset();
    vi.useRealTimers();
  });

  it("passes the default retry count to the underlying SDK call", async () => {
    aiMocks.generateText.mockResolvedValue({ text: "ok", usage: {} });

    await aiGenerateText(basicArgs);

    const passed = aiMocks.generateText.mock.calls[0][0];
    expect(passed.maxRetries).toBe(DEFAULT_AI_MAX_RETRIES);
    expect(passed.maxRetries).toBeGreaterThanOrEqual(2);
  });

  it("allows a per-call retry override", async () => {
    aiMocks.generateText.mockResolvedValue({ text: "ok", usage: {} });

    await aiGenerateText(basicArgs, { maxRetries: 1 });

    const passed = aiMocks.generateText.mock.calls[0][0];
    expect(passed.maxRetries).toBe(1);
  });

  it("attaches an AbortSignal that fires at the configured timeout", async () => {
    vi.useFakeTimers();
    const observedSignals: AbortSignal[] = [];
    aiMocks.generateText.mockImplementation((args: { abortSignal?: AbortSignal }) => {
      if (!args.abortSignal) throw new Error("missing abort signal");
      observedSignals.push(args.abortSignal);
      return new Promise((_resolve, reject) => {
        args.abortSignal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    });

    const promise = aiGenerateText(basicArgs, { timeoutMs: 25 });
    const assertion = expect(promise).rejects.toThrow("aborted");
    await vi.advanceTimersByTimeAsync(25);

    expect(observedSignals[0]).toBeInstanceOf(AbortSignal);
    expect(observedSignals[0].aborted).toBe(true);
    await assertion;
  });

  it("chains a caller-supplied AbortSignal", async () => {
    const callerController = new AbortController();
    const observedSignals: AbortSignal[] = [];
    aiMocks.generateText.mockImplementation((args: { abortSignal?: AbortSignal }) => {
      if (!args.abortSignal) throw new Error("missing abort signal");
      observedSignals.push(args.abortSignal);
      return new Promise((_resolve, reject) => {
        args.abortSignal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    });

    const promise = aiGenerateText(basicArgs, { signal: callerController.signal });
    const assertion = expect(promise).rejects.toThrow("aborted");
    callerController.abort();

    expect(observedSignals[0].aborted).toBe(true);
    await assertion;
  });

  it("does not swallow 4xx errors", async () => {
    aiMocks.generateText.mockRejectedValue(
      Object.assign(new Error("Bad request"), { statusCode: 400 }),
    );

    await expect(aiGenerateText(basicArgs)).rejects.toThrow("Bad request");
  });

  it("uses a bounded default timeout", () => {
    expect(DEFAULT_AI_TIMEOUT_MS).toBeGreaterThanOrEqual(15_000);
    expect(DEFAULT_AI_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
  });
});
