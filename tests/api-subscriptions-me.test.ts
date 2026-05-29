import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockDbQuerySubscriptionsFindFirst } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbQuerySubscriptionsFindFirst: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db/client", async () => {
  const realSchema = await import("@/lib/db/schema");
  return {
    db: {
      query: {
        subscriptions: {
          findFirst: mockDbQuerySubscriptionsFindFirst,
        },
      },
    },
    schema: realSchema,
  };
});

describe("GET /api/subscriptions/me (Phase 1c Task 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s when no Clerk session is present", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { GET } = await import("@/app/api/subscriptions/me/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the free-tier default snapshot when no subscription row exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_abc" });
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/subscriptions/me/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      tier: "free",
      audioSecondsUsed: 0,
      periodResetAt: null,
    });
  });

  it("returns the row snapshot when subscription exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_abc" });
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({
      clerkUserId: "user_abc",
      tier: "pro",
      audioSecondsUsed: 600,
      periodResetAt: new Date("2026-06-29T00:00:00.000Z"),
    });

    const { GET } = await import("@/app/api/subscriptions/me/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tier).toBe("pro");
    expect(json.audioSecondsUsed).toBe(600);
    expect(json.periodResetAt).toBe("2026-06-29T00:00:00.000Z");
  });

  it("coerces unknown tier strings to 'free' (defense in depth)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_abc" });
    mockDbQuerySubscriptionsFindFirst.mockResolvedValue({
      clerkUserId: "user_abc",
      tier: "enterprise", // not a known tier — should fall back to free
      audioSecondsUsed: 100,
      periodResetAt: null,
    });

    const { GET } = await import("@/app/api/subscriptions/me/route");
    const res = await GET();
    const json = await res.json();
    expect(json.tier).toBe("free");
  });
});
