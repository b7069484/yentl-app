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

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim();
}

// ─── 1. Renders all 6 cards ───────────────────────────────────────────────────

describe("SourcePicker – card rendering", () => {
  it("renders 6 cards with expected titles", () => {
    render(<SourcePicker />);
    expect(screen.getByText("Analyze a video I can play")).toBeTruthy();
    expect(screen.getByText("Use microphone")).toBeTruthy();
    expect(screen.getByText("Upload audio/video")).toBeTruthy();
    expect(screen.getByText("Paste transcript")).toBeTruthy();
    expect(screen.getByText("Paste YouTube link")).toBeTruthy();
    expect(screen.getByText("Use media URL")).toBeTruthy();
  });

  it("renders the full wordmark", () => {
    render(<SourcePicker />);
    expect(screen.getByText("yentl")).toBeTruthy();
  });

  it("renders the headline", () => {
    render(<SourcePicker />);
    expect(normalizeText(screen.getByRole("heading", { level: 1 }).textContent))
      .toBe("What do you want to analyze?");
  });

  it("renders the subtitle", () => {
    render(<SourcePicker />);
    expect(
      screen.getByText((_content, element) =>
        element?.tagName.toLowerCase() === "p" &&
        normalizeText(element.textContent) ===
          "Start with the media or text you already have. Yentl keeps the source, transcript, and analysis together.",
      ),
    ).toBeTruthy();
  });
});

// ─── 2. Click handlers call setSource with correct kind ──────────────────────

describe("SourcePicker – click handlers: setSource", () => {
  it("Microphone card calls setSource({ kind: 'mic' })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Use microphone").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({ kind: "mic" });
  });

  it("Text doc card calls setSource({ kind: 'text_doc', ... })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Paste transcript").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "",
      mime: "",
      byte_count: 0,
    });
  });

  it("Browser tab card calls setSource({ kind: 'browser_tab' })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Analyze a video I can play").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({ kind: "browser_tab" });
  });

  it("Audio file card calls setSource({ kind: 'audio_file', ... })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Upload audio/video").closest("button")!);
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
    fireEvent.click(screen.getByText("Paste YouTube link").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "youtube",
      video_id: "",
      url: "",
    });
  });

  it("Media URL card calls setSource({ kind: 'media_url', ... })", () => {
    render(<SourcePicker />);
    fireEvent.click(screen.getByText("Use media URL").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "media_url",
      url: "",
    });
  });
});

// ─── 3. Click handlers call setPrerecordStage("selected") ────────────────────

describe("SourcePicker – click handlers: setPrerecordStage", () => {
  const cardTitles = [
    "Analyze a video I can play",
    "Use microphone",
    "Upload audio/video",
    "Paste transcript",
    "Paste YouTube link",
    "Use media URL",
  ];

  for (const title of cardTitles) {
    it(`clicking "${title}" sets prerecordStage to "selected"`, () => {
      render(<SourcePicker />);
      fireEvent.click(screen.getByText(title).closest("button")!);
      expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
    });
  }
});
