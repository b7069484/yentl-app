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

import { TextIngestPane } from "@/components/session/ingest-panes/text-ingest-pane";
import { AudioIngestPane } from "@/components/session/ingest-panes/audio-ingest-pane";
import { YoutubeIngestPane } from "@/components/session/ingest-panes/youtube-ingest-pane";
import { MediaUrlIngestPane } from "@/components/session/ingest-panes/media-url-ingest-pane";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Parametrized stub pane tests ─────────────────────────────────────────────

const panes = [
  { name: "TextIngestPane", Component: TextIngestPane, comingText: "Coming in T3" },
  { name: "AudioIngestPane", Component: AudioIngestPane, comingText: "Coming in T4" },
  { name: "YoutubeIngestPane", Component: YoutubeIngestPane, comingText: "Coming in T5" },
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
