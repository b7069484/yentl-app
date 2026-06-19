import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dbSchema from "@/lib/db/schema";
import type { Session } from "@/lib/types";

function makeSession(): Session {
  return {
    title: "Cloud proof",
    started_at: "2026-06-11T12:00:00.000Z",
    transcript: [],
    claims: [],
    markers: [],
    speakers: [],
    source: { kind: "mic" },
  };
}

describe("cloud saved-session API availability", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@clerk/nextjs/server");
    vi.doUnmock("@/lib/db/client");
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

  it("returns invalid_request for malformed save JSON instead of a generic cloud error", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("DATABASE_URL", "postgres://example.test/db");
    const { POST } = await import("@/app/api/sessions/route");

    const res = await POST(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toEqual({
      code: "invalid_request",
      message: "Request body must be valid JSON.",
    });
  });

  it("returns invalid_request for malformed rename JSON instead of a generic cloud error", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("DATABASE_URL", "postgres://example.test/db");
    const { PATCH } = await import("@/app/api/sessions/[id]/route");

    const res = await PATCH(
      new Request("http://localhost/api/sessions/sess-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
      { params: Promise.resolve({ id: "sess-1" }) },
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toEqual({
      code: "invalid_request",
      message: "Request body must be valid JSON.",
    });
  });

  it("rejects a save when a same-id session becomes owned by another account during upsert", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("DATABASE_URL", "postgres://example.test/db");
    vi.doMock("@clerk/nextjs/server", () => ({
      auth: vi.fn(async () => ({ userId: "current-user" })),
      currentUser: vi.fn(async () => ({
        primaryEmailAddress: { emailAddress: "current@example.test" },
        emailAddresses: [],
        fullName: "Current User",
      })),
    }));

    const selectResponses: Array<Array<{ clerkUserId: string }>> = [
      [],
      [{ clerkUserId: "other-user" }],
    ];
    const conflictConfigs: Array<{ table: unknown; config: Record<string, unknown> }> = [];
    const db = {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(async (config: Record<string, unknown>) => {
            conflictConfigs.push({ table, config });
          }),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => selectResponses.shift() ?? []),
          })),
        })),
      })),
    };

    vi.doMock("@/lib/db/client", () => ({
      db,
      schema: dbSchema,
    }));

    const { CloudSessionError, saveCloudSession } = await import("@/lib/server/cloud-session-store");

    let thrown: unknown;
    try {
      await saveCloudSession({
        id: "same-local-id",
        name: "Should not overwrite",
        session: makeSession(),
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CloudSessionError);
    expect(thrown).toMatchObject({
      status: 409,
      code: "conflict",
    });
    expect(conflictConfigs.at(-1)?.config.setWhere).toBeDefined();
  });
});
