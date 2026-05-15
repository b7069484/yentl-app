import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

import { MediaUrlIngestPane } from "@/components/session/ingest-panes/media-url-ingest-pane";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Parametrized stub pane tests ─────────────────────────────────────────────

// AudioIngestPane is now fully implemented (T4) — its own test suite lives in
// tests/audio-ingest-pane.test.tsx.
// YoutubeIngestPane is now fully implemented (T5) — its own test suite lives in
// tests/youtube-ingest-pane.test.tsx.
// Only remaining stub panes are listed here.
const panes = [
  { name: "MediaUrlIngestPane", Component: MediaUrlIngestPane, comingText: "Coming in T6" },
] as const;

for (const { name, Component, comingText } of panes) {
  describe(`${name} – stub`, () => {
    it(`renders "${comingText}" text`, () => {
      render(<Component />);
      expect(screen.getByText(comingText)).toBeTruthy();
    });

    it("renders a Back to sources button", () => {
      render(<Component />);
      expect(
        screen.getByRole("button", { name: /Back to sources/i }),
      ).toBeTruthy();
    });

    it("Back button calls setPrerecordStage('picker')", () => {
      render(<Component />);
      fireEvent.click(screen.getByRole("button", { name: /Back to sources/i }));
      expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
    });
  });
}
