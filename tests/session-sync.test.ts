import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listCloudSessions,
  loadCloudSession,
  mergeSavedSessionMetas,
  saveCloudSession,
} from "@/lib/client/session-sync";
import type { SavedSessionMeta } from "@/lib/client/session-storage";
import type { Session } from "@/lib/types";

function makeMeta(overrides: Partial<SavedSessionMeta> = {}): SavedSessionMeta {
  return {
    id: "sess-1",
    name: "Local save",
    source_kind: "mic",
    saved_at: "2026-06-09T12:00:00.000Z",
    started_at: "2026-06-09T11:00:00.000Z",
    ended_at: null,
    claim_count: 1,
    marker_count: 0,
    speaker_count: 1,
    source_count: 0,
    source_linked_count: 0,
    high_source_count: 0,
    duration_sec: 60,
    ...overrides,
  };
}

function makeSession(): Session {
  return {
    title: "Local save",
    started_at: "2026-06-09T11:00:00.000Z",
    transcript: [],
    claims: [],
    markers: [],
    speakers: [],
    source: { kind: "mic" },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("session-sync client adapter", () => {
  it("skips network calls when account sync is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await saveCloudSession(makeSession(), { id: "same-id", name: "Synced" });

    expect(result).toEqual({
      ok: false,
      status: "unavailable",
      message: "Account sync is not configured for this Yentl environment.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps signed-out API responses into a non-throwing fallback result", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: { code: "signed_out", message: "Sign in to sync saved sessions across devices." },
        }),
        { status: 401 },
      ),
    ));

    const result = await listCloudSessions();

    expect(result).toEqual({
      ok: false,
      status: "signed_out",
      message: "Sign in to sync saved sessions across devices.",
      httpStatus: 401,
    });
  });

  it("posts the local save id so account sync and IndexedDB share one identity", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    const fetchMock = vi.fn(async () =>
      Response.json({ session: makeMeta({ id: "same-id", name: "Synced" }) }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await saveCloudSession(makeSession(), { id: "same-id", name: "Synced" });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: expect.stringContaining('"id":"same-id"'),
      }),
    );
  });

  it("loads cloud-only sessions through the per-session API", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({ session: { ...makeMeta({ id: "cloud-only" }), session: makeSession() } }),
    ));

    const result = await loadCloudSession("cloud-only");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("cloud-only");
      expect(result.data.session.title).toBe("Local save");
    }
  });

  it("merges local and cloud metadata by id and prefers the newer cloud copy", () => {
    const local = makeMeta({ id: "same", name: "Local", saved_at: "2026-06-09T10:00:00.000Z" });
    const cloud = makeMeta({ id: "same", name: "Cloud", saved_at: "2026-06-09T12:00:00.000Z" });
    const cloudOnly = makeMeta({ id: "cloud-only", name: "Remote", saved_at: "2026-06-09T11:00:00.000Z" });

    const merged = mergeSavedSessionMetas([local], [cloud, cloudOnly]);

    expect(merged.map((session) => session.id)).toEqual(["same", "cloud-only"]);
    expect(merged[0].name).toBe("Cloud");
  });
});
