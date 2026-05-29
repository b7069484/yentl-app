import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockDbInsertValues } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbInsertValues: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db/client", async () => {
  const realSchema = await import("@/lib/db/schema");
  return {
    db: {
      insert: () => ({
        values: mockDbInsertValues,
      }),
    },
    schema: realSchema,
  };
});

describe("POST /api/disputes (Phase 1c Task 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authed user — most disputes will come from authed sessions.
    mockAuth.mockResolvedValue({ userId: "user_abc" });
    mockDbInsertValues.mockResolvedValue(undefined);
  });

  it("inserts a dispute row and returns { id } for a valid payload", async () => {
    const { POST } = await import("@/app/api/disputes/route");
    const res = await POST(
      new Request("http://localhost/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "sess_test",
          claimId: "claim_1",
          disputerEmail: "user@example.com",
          evidenceUrl: "https://example.com/source",
          correctionRequested:
            "The figure is from 2023, not 2024 — please re-check the source.",
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toMatch(/^dispute_/);
    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
  });

  it("allows anonymous disputes (no Clerk session)", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { POST } = await import("@/app/api/disputes/route");
    const res = await POST(
      new Request("http://localhost/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "sess_test",
          disputerEmail: "anon@example.com",
          correctionRequested: "Please double-check this clip — context missing.",
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(mockDbInsertValues).toHaveBeenCalledTimes(1);
  });

  it("rejects 400 when correctionRequested is too short", async () => {
    const { POST } = await import("@/app/api/disputes/route");
    const res = await POST(
      new Request("http://localhost/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "sess_test",
          disputerEmail: "user@example.com",
          correctionRequested: "wrong",
        }),
      }) as never,
    );
    expect(res.status).toBe(400);
    expect(mockDbInsertValues).not.toHaveBeenCalled();
  });

  it("rejects 400 when disputerEmail is malformed", async () => {
    const { POST } = await import("@/app/api/disputes/route");
    const res = await POST(
      new Request("http://localhost/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "sess_test",
          disputerEmail: "not-an-email",
          correctionRequested: "This claim is wrong because the year is off.",
        }),
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});
