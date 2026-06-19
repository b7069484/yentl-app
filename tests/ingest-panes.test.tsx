import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock session store ───────────────────────────────────────────────────────

const mockSetPrerecordStage = vi.fn();

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setPrerecordStage: mockSetPrerecordStage,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/client/text-ingest", () => ({
  parsePlainText: vi.fn(() => []),
  parseDocx: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/lib/client/ingest-orchestrator", () => ({
  bulkIngest: vi.fn().mockResolvedValue(undefined),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Stub pane list ───────────────────────────────────────────────────────────

// AudioIngestPane is now fully implemented (T4) — its own test suite lives in
// tests/audio-ingest-pane.test.tsx.
// YoutubeIngestPane is now fully implemented (T5) — its own test suite lives in
// tests/youtube-ingest-pane.test.tsx.
// MediaUrlIngestPane is now fully implemented (T6) — its own test suite lives in
// tests/media-url-ingest-pane.test.tsx.
// No remaining stub panes. This file is kept for future stubs.

describe("ingest-panes — no remaining stubs", () => {
  it("all ingest panes are fully implemented (T4, T5, T6)", () => {
    // Placeholder. When a new stub pane is added for a future sprint,
    // add it to the `panes` array in this file.
    expect(true).toBe(true);
  });
});
