import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveSession,
  listSessions,
  loadSession,
  renameSession,
  deleteSession,
  clearAllSessions,
} from "@/lib/client/session-storage";
import type { Session } from "@/lib/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  const base: Session = {
    title: "Test session",
    started_at: new Date(Date.now() - 60_000).toISOString(),
    ended_at: new Date().toISOString(),
    transcript: [
      { text: "Hello world.", start: 0, end: 2, is_final: true, speaker_id: 0 },
      { text: "Indeed.", start: 2, end: 4, is_final: true, speaker_id: 1 },
    ],
    claims: [
      {
        id: "claim-1",
        claim_text: "The Earth is flat.",
        utterance_start: 0,
        utterance_end: 2,
        speaker_id: 0,
        topic: "science",
        topic_secondary: null,
        primary_label: "FALSE",
        score: 5,
        annotations: [],
        explanation: "It is round.",
        status: "confirmed",
        sources: [],
      },
      {
        id: "claim-2",
        claim_text: "The sun is a star.",
        utterance_start: 2,
        utterance_end: 4,
        speaker_id: 1,
        topic: "science",
        topic_secondary: null,
        primary_label: "TRUE",
        score: 99,
        annotations: [],
        explanation: "Yes.",
        status: "confirmed",
        sources: [],
      },
    ],
    markers: [
      {
        id: "marker-1",
        type: "fallacy",
        name: "straw-man",
        display: "Straw Man",
        excerpt: "...",
        speaker_id: 0,
        start_time: 0,
        end_time: 2,
        severity: "clear",
        explanation: "Misrepresentation.",
      },
    ],
    speakers: [
      { id: 0, label: "Speaker 1" },
      { id: 1, label: "Speaker 2" },
      { id: 2, label: "Speaker 3" },
    ],
    source: { kind: "mic" },
    ...overrides,
  };
  return base;
}

// ─── Reset IDB between tests ──────────────────────────────────────────────────

beforeEach(async () => {
  // fake-indexeddb/auto replaces the global indexedDB per-module import.
  // For test isolation, delete the DB each time.
  await clearAllSessions();
});

// ─── saveSession ─────────────────────────────────────────────────────────────

describe("saveSession", () => {
  it("with no id — returns metadata with new ulid, creates record", async () => {
    const session = makeSession();
    const meta = await saveSession(session);
    expect(meta.id).toBeTruthy();
    expect(meta.id.length).toBeGreaterThan(10); // ulid is 26 chars
    expect(meta.name).toBe("Test session");
    expect(meta.source_kind).toBe("mic");
  });

  it("default name falls back to 'Session @ ...' when title is empty", async () => {
    const session = makeSession({ title: "" });
    const meta = await saveSession(session);
    expect(meta.name).toMatch(/^Session @ /);
  });

  it("custom name option overrides default", async () => {
    const session = makeSession();
    const meta = await saveSession(session, { name: "My custom name" });
    expect(meta.name).toBe("My custom name");
  });

  it("with existing id — updates that record", async () => {
    const session = makeSession();
    const meta1 = await saveSession(session);
    const id = meta1.id;

    const updated = makeSession({ title: "Updated title" });
    const meta2 = await saveSession(updated, { id, name: "New name" });
    expect(meta2.id).toBe(id);
    expect(meta2.name).toBe("New name");

    // Only one record should exist
    const list = await listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(id);
    expect(list[0].name).toBe("New name");
  });

  it("derives claim_count from the saved session", async () => {
    const session = makeSession();
    const meta = await saveSession(session);
    expect(meta.claim_count).toBe(session.claims.length);
  });

  it("derives marker_count from the saved session", async () => {
    const session = makeSession();
    const meta = await saveSession(session);
    expect(meta.marker_count).toBe(session.markers.length);
  });

  it("derives speaker_count from the saved session", async () => {
    const session = makeSession();
    const meta = await saveSession(session);
    expect(meta.speaker_count).toBe(session.speakers.length);
  });

  it("derives source evidence counts from saved claims", async () => {
    const session = makeSession({
      claims: [
        {
          id: "claim-with-sources",
          claim_text: "The audit was hidden.",
          utterance_start: 0,
          utterance_end: 2,
          speaker_id: 0,
          topic: "accountability",
          topic_secondary: null,
          primary_label: "UNVERIFIABLE",
          score: 40,
          annotations: [],
          explanation: "Needs source-backed verification.",
          status: "confirmed",
          sources: [
            {
              url: "https://audit.example/report",
              domain: "audit.example",
              title: "Audit Report",
              reputation_tier: "high",
              stance: "supports",
              excerpt: "The audit was hidden from the public file.",
            },
            {
              url: "https://blog.example/no-excerpt",
              domain: "blog.example",
              title: "No Excerpt Blog",
              reputation_tier: "low",
              stance: "mixed",
            },
          ],
        },
      ],
    });

    const meta = await saveSession(session);

    expect(meta.source_count).toBe(2);
    expect(meta.source_linked_count).toBe(1);
    expect(meta.high_source_count).toBe(1);
  });
});

// ─── listSessions ─────────────────────────────────────────────────────────────

describe("listSessions", () => {
  it("returns empty array when no sessions exist", async () => {
    const list = await listSessions();
    expect(list).toHaveLength(0);
  });

  it("returns metadata only — no session transcript in list items", async () => {
    await saveSession(makeSession());
    const list = await listSessions();
    expect(list).toHaveLength(1);
    // The SavedSessionMeta type does not have a `session` field
    // but TypeScript alone won't prevent runtime presence; verify it's absent:
    expect((list[0] as Record<string, unknown>)["session"]).toBeUndefined();
  });

  it("enriches listed metadata with source evidence counts", async () => {
    await saveSession(makeSession({
      claims: [
        {
          id: "claim-with-source",
          claim_text: "The sun is the central star in the solar system.",
          utterance_start: 0,
          utterance_end: 2,
          speaker_id: 0,
          topic: "science",
          topic_secondary: null,
          primary_label: "TRUE",
          score: 99,
          annotations: [],
          explanation: "Yes.",
          status: "confirmed",
          sources: [
            {
              url: "https://nasa.gov/sun",
              domain: "nasa.gov",
              title: "NASA Sun",
              reputation_tier: "high",
              stance: "supports",
              excerpt: "The sun is a star at the center of the solar system.",
            },
          ],
        },
      ],
    }));

    const list = await listSessions();

    expect(list[0].source_count).toBe(1);
    expect(list[0].source_linked_count).toBe(1);
    expect(list[0].high_source_count).toBe(1);
  });

  it("returns desc-by-saved_at order", async () => {
    // Save 3 sessions; fake-indexeddb is synchronous so each gets a distinct timestamp
    // but we can control the saved_at via the internal clock. Since Date.now() might
    // resolve to the same ms in a fast test, we save them sequentially and rely on
    // the sort being stable.
    const a = makeSession({ title: "A" });
    const b = makeSession({ title: "B" });
    const c = makeSession({ title: "C" });

    const metaA = await saveSession(a);
    await new Promise((r) => setTimeout(r, 2)); // ensure distinct timestamps
    const metaB = await saveSession(b);
    await new Promise((r) => setTimeout(r, 2));
    const metaC = await saveSession(c);

    const list = await listSessions();
    expect(list).toHaveLength(3);
    // Most recent first
    expect(list[0].id).toBe(metaC.id);
    expect(list[1].id).toBe(metaB.id);
    expect(list[2].id).toBe(metaA.id);
  });
});

// ─── loadSession ─────────────────────────────────────────────────────────────

describe("loadSession", () => {
  it("returns full session including transcript", async () => {
    const session = makeSession();
    const meta = await saveSession(session);
    const saved = await loadSession(meta.id);
    expect(saved.session.transcript).toHaveLength(session.transcript.length);
    expect(saved.session.transcript[0].text).toBe("Hello world.");
    expect(saved.session.claims).toHaveLength(session.claims.length);
    expect(saved.session.markers).toHaveLength(session.markers.length);
    expect(saved.session.speakers).toHaveLength(session.speakers.length);
  });

  it("with bad id — throws", async () => {
    await expect(loadSession("nonexistent-id")).rejects.toThrow(
      "Session not found: nonexistent-id",
    );
  });
});

// ─── renameSession ────────────────────────────────────────────────────────────

describe("renameSession", () => {
  it("updates only the name field", async () => {
    const session = makeSession();
    const meta = await saveSession(session, { name: "Original" });

    await renameSession(meta.id, "Renamed");

    const loaded = await loadSession(meta.id);
    expect(loaded.name).toBe("Renamed");
    // Session body is unchanged
    expect(loaded.session.transcript).toHaveLength(session.transcript.length);
    expect(loaded.claim_count).toBe(meta.claim_count);
  });

  it("throws when id not found", async () => {
    await expect(renameSession("bad-id", "new name")).rejects.toThrow(
      "Session not found: bad-id",
    );
  });
});

// ─── deleteSession ────────────────────────────────────────────────────────────

describe("deleteSession", () => {
  it("removes the record", async () => {
    const meta = await saveSession(makeSession());
    await deleteSession(meta.id);
    const list = await listSessions();
    expect(list).toHaveLength(0);
  });

  it("does not throw when deleting a non-existent id", async () => {
    // IndexedDB delete is a no-op for missing keys
    await expect(deleteSession("ghost-id")).resolves.toBeUndefined();
  });
});

// ─── clearAllSessions ─────────────────────────────────────────────────────────

describe("clearAllSessions", () => {
  it("empties the store", async () => {
    await saveSession(makeSession({ title: "A" }));
    await saveSession(makeSession({ title: "B" }));
    await saveSession(makeSession({ title: "C" }));

    const before = await listSessions();
    expect(before).toHaveLength(3);

    await clearAllSessions();

    const after = await listSessions();
    expect(after).toHaveLength(0);
  });
});
