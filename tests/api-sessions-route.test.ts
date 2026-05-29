import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Hoist mock fns so vi.mock() factories can reference them.

const {
  mockAuth,
  mockDbInsertValuesReturning,
  mockDbQuerySessionsFindFirst,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbInsertValuesReturning: vi.fn(),
  mockDbQuerySessionsFindFirst: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db/client", async () => {
  // Re-export real schema so route handlers can reference column refs that
  // get fed to drizzle's eq()/etc — the mocked db methods ignore the predicate
  // and return whatever the test arranges.
  const realSchema = await import("@/lib/db/schema");
  return {
    db: {
      insert: () => ({
        values: () => ({
          returning: mockDbInsertValuesReturning,
        }),
      }),
      query: {
        sessions: {
          findFirst: mockDbQuerySessionsFindFirst,
        },
      },
    },
    schema: realSchema,
  };
});

// Import under test AFTER mocks are registered
import type { Session } from "@/lib/types";

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeSessionFixture(): Session {
  return {
    title: "Test fixture",
    started_at: "2026-05-29T00:00:00.000Z",
    ended_at: "2026-05-29T00:05:00.000Z",
    transcript: [
      {
        text: "Hello world.",
        start: 0,
        end: 1.5,
        is_final: true,
        speaker_id: null,
        provider: "deepgram",
      },
    ],
    claims: [],
    markers: [],
    speakers: [],
    source: { kind: "mic" },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Clerk session is present", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { POST } = await import("@/app/api/sessions/route");
    const req = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: makeSessionFixture() }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
    expect(mockDbInsertValuesReturning).not.toHaveBeenCalled();
  });

  it("returns 200 + { id } when authed; writes row to sessions table", async () => {
    mockAuth.mockResolvedValue({ userId: "user_abc123" });
    mockDbInsertValuesReturning.mockResolvedValue([{ id: "sess_ulid_abc" }]);

    const { POST } = await import("@/app/api/sessions/route");
    const req = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: makeSessionFixture() }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("sess_ulid_abc");
    expect(mockDbInsertValuesReturning).toHaveBeenCalledTimes(1);
  });

  it("returns 400 on missing session body", async () => {
    mockAuth.mockResolvedValue({ userId: "user_abc123" });

    const { POST } = await import("@/app/api/sessions/route");
    const req = new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    expect(mockDbInsertValuesReturning).not.toHaveBeenCalled();
  });
});

describe("GET /api/sessions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 + session payload when id exists", async () => {
    const fixture = makeSessionFixture();
    mockDbQuerySessionsFindFirst.mockResolvedValue({
      id: "sess_ulid_abc",
      title: fixture.title,
      startedAt: new Date(fixture.started_at),
      endedAt: fixture.ended_at ? new Date(fixture.ended_at) : null,
      sourceKind: "mic",
      sourceMeta: { kind: "mic" },
      data: fixture,
    });

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const req = new Request("http://localhost/api/sessions/sess_ulid_abc");
    const res = await GET(req as never, { params: Promise.resolve({ id: "sess_ulid_abc" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("sess_ulid_abc");
    expect(json.title).toBe(fixture.title);
    expect(json.transcript).toHaveLength(1);
    expect(json.transcript[0].text).toBe("Hello world.");
  });

  it("returns 404 when id is missing", async () => {
    mockDbQuerySessionsFindFirst.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const req = new Request("http://localhost/api/sessions/nonexistent");
    const res = await GET(req as never, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
  });
});
