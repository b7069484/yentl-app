import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    promises: fsMocks,
    default: {
      ...actual,
      promises: fsMocks,
    },
  };
});

function request(body: unknown = { comments: [] }): Request {
  return new Request("http://localhost/api/project-flow-comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validComment = {
  id: "c1",
  nodeId: "route-project-flows",
  nodeTitle: "Project flows",
  screenshot: "/visual-evidence/flow-screenshots/current/route-project-flows.png",
  sourcePath: "components/session/az-flow-dashboard.tsx",
  xPct: 42,
  yPct: 17,
  text: "Tighten this label.",
  createdAt: "2026-06-20T00:00:00.000Z",
};

describe("POST /api/project-flow-comments", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fsMocks.readFile.mockRejectedValue(new Error("not found"));
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.writeFile.mockResolvedValue(undefined);
    fsMocks.appendFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 in production before parsing or writing to the filesystem", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await import("@/app/api/project-flow-comments/route");

    const res = await POST(new Request("http://localhost/api/project-flow-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }) as never);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
    expect(fsMocks.mkdir).not.toHaveBeenCalled();
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
    expect(fsMocks.appendFile).not.toHaveBeenCalled();
  });

  it("persists filtered comments outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { POST } = await import("@/app/api/project-flow-comments/route");

    const res = await POST(request({
      comments: [
        validComment,
        { ...validComment, id: 123 },
      ],
    }) as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, count: 1 });
    expect(fsMocks.mkdir).toHaveBeenCalledWith(
      expect.stringContaining(".project/review-comments"),
      { recursive: true },
    );
    expect(fsMocks.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("yentl-flow-review-latest.json"),
      expect.stringContaining('"id": "c1"'),
      "utf8",
    );
    expect(fsMocks.appendFile).toHaveBeenCalledWith(
      expect.stringContaining("yentl-flow-review-rounds.jsonl"),
      expect.stringContaining('"comments":[{"id":"c1"'),
      "utf8",
    );
  });
});

describe("GET /api/project-flow-comments", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 in production before reading local review files", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("@/app/api/project-flow-comments/route");

    const res = await GET();

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
    expect(fsMocks.readFile).not.toHaveBeenCalled();
  });
});
