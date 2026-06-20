import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitForTests } from "@/lib/server/rate-limit";

const { mockMintToken, mockAuth } = vi.hoisted(() => ({
  mockMintToken: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/server/deepgram", () => ({
  mintToken: mockMintToken,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

function request(headers: HeadersInit = {}) {
  return new Request("http://localhost/api/deepgram/token", {
    method: "POST",
    headers,
  });
}

describe("POST /api/deepgram/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    resetRateLimitForTests();
    mockMintToken.mockResolvedValue({
      key: "test-key",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("requires source analysis consent before minting a token", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST } = await import("@/app/api/deepgram/token/route");
    const res = await POST(request());

    expect(res.status).toBe(428);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("source_consent_missing"));
    expect(mockMintToken).not.toHaveBeenCalled();
  });

  it("mints a token when consent is present", async () => {
    const { POST } = await import("@/app/api/deepgram/token/route");
    const res = await POST(request({
      "x-yentl-source-consent": "source-analysis-v1",
    }));

    expect(res.status).toBe(200);
    expect(mockMintToken).toHaveBeenCalledOnce();
  });

  it("requires paid-live auth before minting a token when the production gate is enabled", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("YENTL_REQUIRE_PAID_LIVE_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    mockAuth.mockResolvedValue({ userId: null });
    const { POST } = await import("@/app/api/deepgram/token/route");

    const res = await POST(request({
      "x-yentl-source-consent": "source-analysis-v1",
    }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Sign in to use paid live analysis.",
      },
    });
    expect(mockMintToken).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("paid_live_auth_required"));
  });

  it("mints a token for a signed-in paid-live user when the production gate is enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("YENTL_REQUIRE_PAID_LIVE_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const { POST } = await import("@/app/api/deepgram/token/route");

    const res = await POST(request({
      "x-yentl-source-consent": "source-analysis-v1",
    }));

    expect(res.status).toBe(200);
    expect(mockMintToken).toHaveBeenCalledOnce();
  });

  it("allows local Chrome extension origins to mint a token in development", async () => {
    const { POST } = await import("@/app/api/deepgram/token/route");
    const res = await POST(request({
      origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
      "x-yentl-source-consent": "source-analysis-v1",
    }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
    );
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "x-yentl-source-consent",
    );
    expect(res.headers.get("Access-Control-Allow-Private-Network")).toBe("true");
  });

  it("includes extension CORS headers on consent errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST } = await import("@/app/api/deepgram/token/route");
    const res = await POST(request({
      origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
    }));

    expect(res.status).toBe(428);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("source_consent_missing"));
  });
});

describe("OPTIONS /api/deepgram/token", () => {
  it("answers local Chrome extension preflights", async () => {
    const { OPTIONS } = await import("@/app/api/deepgram/token/route");
    const res = await OPTIONS(new Request("http://localhost/api/deepgram/token", {
      method: "OPTIONS",
      headers: {
        origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
        "access-control-request-method": "POST",
        "access-control-request-headers": "x-yentl-source-consent",
      },
    }));

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
    );
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Private-Network")).toBe("true");
  });
});
