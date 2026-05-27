import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enforceRateLimit,
  resetRateLimitForTests,
} from "@/lib/server/rate-limit";

const aiMocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: aiMocks.generateText,
  Output: {
    object: vi.fn(({ schema }: { schema: unknown }) => schema),
  },
}));

vi.mock("@/lib/server/anthropic", () => ({
  opus: { provider: "test" },
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: {
    tools: {
      webSearch_20260209: vi.fn(() => ({ type: "web-search" })),
    },
  },
}));

function jsonRequest(path: string, body: unknown, headers?: HeadersInit) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("model route request security guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    resetRateLimitForTests();
  });

  it("rejects oversized extract-claims utterances before a model call", async () => {
    const { POST } = await import("@/app/api/extract-claims/route");

    const res = await POST(jsonRequest("/api/extract-claims", {
      utterance: "x".repeat(4_001),
      utterance_start: 0,
      utterance_end: 1,
      context: "",
      recent_hashes: [],
    }));

    expect(res.status).toBe(400);
    expect(aiMocks.generateText).not.toHaveBeenCalled();
  });

  it("rejects analyze-rhetoric transcript windows over the cap", async () => {
    const { POST } = await import("@/app/api/analyze-rhetoric/route");

    const res = await POST(jsonRequest("/api/analyze-rhetoric", {
      transcript_window: "x".repeat(16_001),
      recent_hashes: [],
      source_context: "",
    }));

    expect(res.status).toBe(400);
    expect(aiMocks.generateText).not.toHaveBeenCalled();
  });

  it("rejects verify-confirmed claim payloads over the cap", async () => {
    const { POST } = await import("@/app/api/verify-confirmed/route");

    const res = await POST(jsonRequest("/api/verify-confirmed", {
      claim_text: "x".repeat(2_001),
      source_context: "",
    }));

    expect(res.status).toBe(400);
    expect(aiMocks.generateText).not.toHaveBeenCalled();
  });

  it("rejects declared JSON bodies that exceed the route byte cap", async () => {
    const { POST } = await import("@/app/api/verify-provisional/route");

    const res = await POST(jsonRequest(
      "/api/verify-provisional",
      { claim_text: "A short valid claim." },
      { "Content-Length": `${25 * 1024}` },
    ));

    expect(res.status).toBe(413);
    expect(aiMocks.generateText).not.toHaveBeenCalled();
  });

  it("declines opinion-like verify-provisional claims before a model call", async () => {
    const { POST } = await import("@/app/api/verify-provisional/route");

    const res = await POST(jsonRequest(
      "/api/verify-provisional",
      { claim_text: "I think this speaker is beautiful." },
    ));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("CLAIM_SCOPE_DECLINED");
    expect(aiMocks.generateText).not.toHaveBeenCalled();
  });

  it("refuses private-information verify-confirmed claims before web search", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST } = await import("@/app/api/verify-confirmed/route");

    const res = await POST(jsonRequest(
      "/api/verify-confirmed",
      { claim_text: "Where does Jane Doe live, and what is her home address?" },
    ));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("CLAIM_SCOPE_REFUSED");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("claim_scope_refused"));
    expect(aiMocks.generateText).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("uses the model claim-scope classifier to decline subtle out-of-scope claims", async () => {
    vi.stubEnv("YENTL_CLAIM_SCOPE_CLASSIFIER", "model");
    aiMocks.generateText.mockResolvedValueOnce({
      output: {
        decision: "decline",
        category: "opinion_or_preference",
        reason: "Normative preference, not a factual claim.",
      },
    });
    const { POST } = await import("@/app/api/verify-provisional/route");

    const res = await POST(jsonRequest(
      "/api/verify-provisional",
      { claim_text: "The new logo makes the organization feel more trustworthy." },
    ));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("CLAIM_SCOPE_DECLINED");
    expect(aiMocks.generateText).toHaveBeenCalledOnce();
  });

  it("uses the model claim-scope classifier to refuse unsafe claims", async () => {
    vi.stubEnv("YENTL_CLAIM_SCOPE_CLASSIFIER", "model");
    aiMocks.generateText.mockResolvedValueOnce({
      output: {
        decision: "refuse",
        category: "harassment_or_doxxing",
        reason: "The request asks for invasive personal targeting.",
      },
    });
    const { POST } = await import("@/app/api/verify-provisional/route");

    const res = await POST(jsonRequest(
      "/api/verify-provisional",
      { claim_text: "The witness sleeps in apartment 4B every weeknight." },
    ));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("CLAIM_SCOPE_REFUSED");
    expect(aiMocks.generateText).toHaveBeenCalledOnce();
  });

  it("allows engage classifier decisions through to verification", async () => {
    vi.stubEnv("YENTL_CLAIM_SCOPE_CLASSIFIER", "model");
    aiMocks.generateText
      .mockResolvedValueOnce({
        output: {
          decision: "engage",
          category: "ordinary_factual_claim",
          reason: "A checkable factual claim.",
        },
      })
      .mockResolvedValueOnce({
        output: {
          primary_label: "TRUE",
          score: 90,
          annotations: ["supported"],
          explanation: "Initial read supports the claim.",
        },
      });
    const { POST } = await import("@/app/api/verify-provisional/route");

    const res = await POST(jsonRequest(
      "/api/verify-provisional",
      { claim_text: "The city council voted on the school bond in 2024." },
    ));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.primary_label).toBe("TRUE");
    expect(aiMocks.generateText).toHaveBeenCalledTimes(2);
  });

  it("allows engage-cautiously classifier decisions through to verification", async () => {
    vi.stubEnv("YENTL_CLAIM_SCOPE_CLASSIFIER", "model");
    aiMocks.generateText
      .mockResolvedValueOnce({
        output: {
          decision: "engage_cautiously",
          category: "needs_context",
          reason: "Checkable, but the context may affect wording.",
        },
      })
      .mockResolvedValueOnce({
        output: {
          primary_label: "PARTIAL",
          score: 55,
          annotations: ["needs context"],
          explanation: "Initial read needs more context.",
        },
      });
    const { POST } = await import("@/app/api/verify-provisional/route");

    const res = await POST(jsonRequest(
      "/api/verify-provisional",
      { claim_text: "The city changed the school policy in 2024." },
    ));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.primary_label).toBe("PARTIAL");
    expect(aiMocks.generateText).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the model claim-scope classifier is unavailable", async () => {
    vi.stubEnv("YENTL_CLAIM_SCOPE_CLASSIFIER", "model");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    aiMocks.generateText.mockRejectedValueOnce(new Error("gateway unavailable"));
    const { POST } = await import("@/app/api/verify-provisional/route");

    const res = await POST(jsonRequest(
      "/api/verify-provisional",
      { claim_text: "The city changed the school policy in 2024." },
    ));

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("CLAIM_SCOPE_UNAVAILABLE");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("claim_scope_classifier_unavailable"));
    errorSpy.mockRestore();
  });
});

describe("rate-limit helper", () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 429 after a bucket exceeds its request cap", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = jsonRequest("/api/test", {});
    const config = { bucket: "test-bucket", limit: 1, windowMs: 60_000 };

    expect(await enforceRateLimit(request, config)).toBeNull();
    const limited = await enforceRateLimit(request, config);

    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toBeTruthy();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("rate_limited"));
    warnSpy.mockRestore();
  });

  it("uses Upstash-compatible REST when a shared backend is configured", async () => {
    vi.stubEnv("YENTL_RATE_LIMIT_BACKEND", "redis");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ result: [1, 60_000] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await enforceRateLimit(
      jsonRequest("/api/test", {}, { "x-forwarded-for": "203.0.113.10" }),
      { bucket: "shared-test", limit: 2, windowMs: 60_000 },
    );

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://redis.example.com",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });
    const command = JSON.parse(String(init.body)) as unknown[];
    expect(command[0]).toBe("EVAL");
    expect(command[2]).toBe(1);
    expect(command[3]).toMatch(/^yentl:rate:shared-test:[a-f0-9]{32}$/);
    expect(command[4]).toBe(60_000);
  });

  it("returns a fail-closed response when shared rate limiting is unavailable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("YENTL_RATE_LIMIT_BACKEND", "redis");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "ERR unavailable" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await enforceRateLimit(
      jsonRequest("/api/test", {}),
      { bucket: "shared-test", limit: 2, windowMs: 60_000 },
    );

    expect(result?.status).toBe(503);
    const json = await result!.json();
    expect(json.error.code).toBe("RATE_LIMIT_UNAVAILABLE");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("rate_limit_unavailable"));
    errorSpy.mockRestore();
  });
});
