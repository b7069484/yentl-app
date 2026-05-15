import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mock session store ───────────────────────────────────────────────────────

let mockPrerecordStage: "picker" | "selected" = "picker";
let mockSourceKind = "mic";

const mockSetPrerecordStage = vi.fn();
const mockSetSource = vi.fn();
const mockStartSession = vi.fn();

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      prerecordStage: mockPrerecordStage,
      source: { kind: mockSourceKind },
      setPrerecordStage: mockSetPrerecordStage,
      setSource: mockSetSource,
      startSession: mockStartSession,
    };
    return selector ? selector(state) : state;
  }),
}));

// ─── Mock SourcePicker ────────────────────────────────────────────────────────

vi.mock("@/components/session/source-picker", () => ({
  SourcePicker: () => <div data-testid="source-picker">SourcePicker</div>,
}));

// ─── Mock ingest panes ────────────────────────────────────────────────────────

vi.mock("@/components/session/ingest-panes/mic-prerecord-pane", () => ({
  MicPreRecordPane: () => (
    <div data-testid="mic-prerecord-pane">
      <button type="button">Start a session</button>
    </div>
  ),
}));

vi.mock("@/components/session/ingest-panes/text-ingest-pane", () => ({
  TextIngestPane: () => <div data-testid="text-ingest-pane">TextIngestPane</div>,
}));

vi.mock("@/components/session/ingest-panes/audio-ingest-pane", () => ({
  AudioIngestPane: () => <div data-testid="audio-ingest-pane">AudioIngestPane</div>,
}));

vi.mock("@/components/session/ingest-panes/youtube-ingest-pane", () => ({
  YoutubeIngestPane: () => <div data-testid="youtube-ingest-pane">YoutubeIngestPane</div>,
}));

vi.mock("@/components/session/ingest-panes/media-url-ingest-pane", () => ({
  MediaUrlIngestPane: () => <div data-testid="media-url-ingest-pane">MediaUrlIngestPane</div>,
}));

import { SourceRouter } from "@/lib/client/source-router";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockPrerecordStage = "picker";
  mockSourceKind = "mic";
});

// ─── 1. Stage: picker ─────────────────────────────────────────────────────────

describe("SourceRouter – picker stage", () => {
  it("renders SourcePicker when prerecordStage is 'picker'", () => {
    mockPrerecordStage = "picker";
    render(<SourceRouter />);
    expect(screen.getByTestId("source-picker")).toBeTruthy();
  });

  it("does NOT render any pane when prerecordStage is 'picker'", () => {
    mockPrerecordStage = "picker";
    render(<SourceRouter />);
    expect(screen.queryByTestId("text-ingest-pane")).toBeNull();
    expect(screen.queryByTestId("audio-ingest-pane")).toBeNull();
    expect(screen.queryByTestId("youtube-ingest-pane")).toBeNull();
    expect(screen.queryByTestId("media-url-ingest-pane")).toBeNull();
  });
});

// ─── 2. Stage: selected + mic ─────────────────────────────────────────────────

describe("SourceRouter – selected stage + mic", () => {
  it("renders mic PreRecord button when source.kind is 'mic'", () => {
    mockPrerecordStage = "selected";
    mockSourceKind = "mic";
    render(<SourceRouter />);
    expect(screen.getByRole("button", { name: /Start a session/i })).toBeTruthy();
  });

  it("does NOT render SourcePicker when prerecordStage is 'selected'", () => {
    mockPrerecordStage = "selected";
    mockSourceKind = "mic";
    render(<SourceRouter />);
    expect(screen.queryByTestId("source-picker")).toBeNull();
  });
});

// ─── 3. Stage: selected + text_doc ───────────────────────────────────────────

describe("SourceRouter – selected + text_doc", () => {
  it("renders TextIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSourceKind = "text_doc";
    render(<SourceRouter />);
    expect(screen.getByTestId("text-ingest-pane")).toBeTruthy();
  });
});

// ─── 4. Stage: selected + audio_file ─────────────────────────────────────────

describe("SourceRouter – selected + audio_file", () => {
  it("renders AudioIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSourceKind = "audio_file";
    render(<SourceRouter />);
    expect(screen.getByTestId("audio-ingest-pane")).toBeTruthy();
  });
});

// ─── 5. Stage: selected + youtube ────────────────────────────────────────────

describe("SourceRouter – selected + youtube", () => {
  it("renders YoutubeIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSourceKind = "youtube";
    render(<SourceRouter />);
    expect(screen.getByTestId("youtube-ingest-pane")).toBeTruthy();
  });
});

// ─── 6. Stage: selected + media_url ──────────────────────────────────────────

describe("SourceRouter – selected + media_url", () => {
  it("renders MediaUrlIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSourceKind = "media_url";
    render(<SourceRouter />);
    expect(screen.getByTestId("media-url-ingest-pane")).toBeTruthy();
  });
});
