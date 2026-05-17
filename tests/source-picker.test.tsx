import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mock session store ───────────────────────────────────────────────────────

const mockSetSource = vi.fn();
const mockSetPrerecordStage = vi.fn();

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setSource: mockSetSource,
      setPrerecordStage: mockSetPrerecordStage,
    };
    return selector ? selector(state) : state;
  }),
}));

import { SourcePicker } from "@/components/session/source-picker";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Renders all 5 cards ───────────────────────────────────────────────────

describe("SourcePicker – card rendering", () => {
  it("renders 5 cards with expected titles", () => {
    render(<SourcePicker />);
    expect(screen.getByText("Microphone")).toBeTruthy();
    expect(screen.getByText("Text doc")).toBeTruthy();
    expect(screen.getByText("Audio file")).toBeTruthy();
    expect(screen.getByText("YouTube")).toBeTruthy();
    expect(screen.getByText("Media URL")).toBeTruthy();
  });

  it("renders the brand Y-mark image", () => {
    render(<SourcePicker />);
    const img = screen.getByAltText("Yentl");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("/yentl-mark.svg");
  });

  it("renders the headline", () => {
    render(<SourcePicker />);
    expect(
      screen.getByText("How would you like to fact-check?"),
    ).toBeTruthy();
  });

  it("renders the subtitle", () => {
    render(<SourcePicker />);
    expect(
      screen.getByText(
        /Yentl works with live conversations, recordings, transcripts, and online media/i,
      ),
    ).toBeTruthy();
  });
});

// ─── 2. Click handlers call setSource with correct kind ──────────────────────

describe("SourcePicker – click handlers: setSource", () => {
  it("Microphone card calls setSource({ kind: 'mic' })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Microphone").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({ kind: "mic" });
  });

  it("Text doc card calls setSource({ kind: 'text_doc', ... })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Text doc").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "",
      mime: "",
      byte_count: 0,
    });
  });

  it("Audio file card calls setSource({ kind: 'audio_file', ... })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Audio file").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename: "",
      mime: "",
    });
  });

  it("YouTube card calls setSource({ kind: 'youtube', ... })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("YouTube").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "youtube",
      video_id: "",
      url: "",
    });
  });

  it("Media URL card calls setSource({ kind: 'media_url', ... })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Media URL").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "media_url",
      url: "",
    });
  });
});

// ─── 3. Click handlers call setPrerecordStage("selected") ────────────────────

describe("SourcePicker – click handlers: setPrerecordStage", () => {
  const cardTitles = ["Microphone", "Text doc", "Audio file", "YouTube", "Media URL"];

  for (const title of cardTitles) {
    it(`clicking "${title}" sets prerecordStage to "selected"`, () => {
      render(<SourcePicker />);
      fireEvent.click(screen.getByText(title).closest("button")!);
      expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
    });
  }
});
