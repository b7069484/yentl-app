import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkMocks.auth,
}));

describe("paid-live auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stays disabled unless the production paid-live flag is enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { requirePaidLiveAccess } = await import("@/lib/server/paid-live-gate");

    const res = await requirePaidLiveAccess(
      new Request("https://yentl.it/api/extract-claims"),
      "model:extract-claims",
    );

    expect(res).toBeNull();
    expect(clerkMocks.auth).not.toHaveBeenCalled();
  });

  it("allows signed-in users when the production paid-live flag is enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("YENTL_REQUIRE_PAID_LIVE_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    clerkMocks.auth.mockResolvedValue({ userId: "user_123" });
    const { requirePaidLiveAccess } = await import("@/lib/server/paid-live-gate");

    const res = await requirePaidLiveAccess(
      new Request("https://yentl.it/api/extract-claims"),
      "model:extract-claims",
    );

    expect(res).toBeNull();
    expect(clerkMocks.auth).toHaveBeenCalledOnce();
  });

  it("returns 401 before paid-live work when no signed-in user is present", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("YENTL_REQUIRE_PAID_LIVE_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    clerkMocks.auth.mockResolvedValue({ userId: null });
    const { requirePaidLiveAccess } = await import("@/lib/server/paid-live-gate");

    const res = await requirePaidLiveAccess(
      new Request("https://yentl.it/api/deepgram/token"),
      "deepgram-token",
    );

    expect(res?.status).toBe(401);
    expect(await res?.json()).toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Sign in to use paid live analysis.",
      },
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("paid_live_auth_required"));
  });

  it("fails closed when paid-live auth is enabled but Clerk is not configured", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("YENTL_REQUIRE_PAID_LIVE_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    const { requirePaidLiveAccess } = await import("@/lib/server/paid-live-gate");

    const res = await requirePaidLiveAccess(
      new Request("https://yentl.it/api/deepgram/token"),
      "deepgram-token",
    );

    expect(res?.status).toBe(503);
    expect(await res?.json()).toEqual({
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "Paid live analysis is temporarily unavailable.",
      },
    });
    expect(clerkMocks.auth).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("paid_live_auth_unavailable"));
  });
});
