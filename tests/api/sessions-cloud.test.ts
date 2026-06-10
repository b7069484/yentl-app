import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("cloud saved-session API availability", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@clerk/nextjs/server");
  });

  it("returns an explicit unavailable state when Clerk is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    const { GET } = await import("@/app/api/sessions/route");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error.code).toBe("cloud_unavailable");
  });

  it("returns an explicit unavailable state when the database is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("DATABASE_URL", "");
    const { GET } = await import("@/app/api/sessions/route");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error.code).toBe("cloud_unavailable");
  });

  it("returns signed_out when Clerk is configured but no user is signed in", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("DATABASE_URL", "postgres://example.test/db");
    vi.doMock("@clerk/nextjs/server", () => ({
      auth: vi.fn(async () => ({ userId: null })),
    }));
    const { GET } = await import("@/app/api/sessions/route");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("signed_out");
  });

  it("rejects malformed save payloads before attempting account sync", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("DATABASE_URL", "postgres://example.test/db");
    const { POST } = await import("@/app/api/sessions/route");

    const res = await POST(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ session: { title: "missing arrays" } }),
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("invalid_request");
  });
});
