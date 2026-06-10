import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mock session store ───────────────────────────────────────────────────────

let mockPrerecordStage: "picker" | "selected" = "picker";
let mockSource: { kind: string; intent?: string } = { kind: "mic" };
let mockSearchParamsRaw = new URLSearchParams("");

const mockSetPrerecordStage = vi.fn();
const mockSetSource = vi.fn();
const mockStartSession = vi.fn();

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      prerecordStage: mockPrerecordStage,
      source: mockSource,
      setPrerecordStage: mockSetPrerecordStage,
      setSource: mockSetSource,
      startSession: mockStartSession,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParamsRaw,
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

vi.mock("@/components/session/ingest-panes/claim-quick-check-pane", () => ({
  ClaimQuickCheckPane: () => <div data-testid="claim-quick-check-pane">ClaimQuickCheckPane</div>,
}));

vi.mock("@/components/session/ingest-panes/browser-tab-ingest-pane", () => ({
  BrowserTabIngestPane: () => <div data-testid="browser-tab-ingest-pane">BrowserTabIngestPane</div>,
}));

vi.mock("@/components/session/ingest-panes/audio-ingest-pane", () => ({
  AudioIngestPane: () => <div data-testid="audio-ingest-pane">AudioIngestPane</div>,
}));

vi.mock("@/components/session/ingest-panes/youtube-ingest-pane", () => ({
  YoutubeIngestPane: ({ initialUrlOverride }: { initialUrlOverride?: string }) => (
    <div data-testid="youtube-ingest-pane" data-initial-url={initialUrlOverride}>
      YoutubeIngestPane
    </div>
  ),
}));

vi.mock("@/components/session/ingest-panes/media-url-ingest-pane", () => ({
  MediaUrlIngestPane: () => <div data-testid="media-url-ingest-pane">MediaUrlIngestPane</div>,
}));

vi.mock("@/components/session/ingest-panes/web-url-ingest-pane", () => ({
  WebUrlIngestPane: () => <div data-testid="web-url-ingest-pane">WebUrlIngestPane</div>,
}));

import { SourceRouter } from "@/lib/client/source-router";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockPrerecordStage = "picker";
  mockSource = { kind: "mic" };
  mockSearchParamsRaw = new URLSearchParams("");
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
    expect(screen.queryByTestId("browser-tab-ingest-pane")).toBeNull();
    expect(screen.queryByTestId("audio-ingest-pane")).toBeNull();
    expect(screen.queryByTestId("youtube-ingest-pane")).toBeNull();
    expect(screen.queryByTestId("media-url-ingest-pane")).toBeNull();
  });

  it("renders the YouTube pane directly for source=youtube deep links", () => {
    mockPrerecordStage = "picker";
    mockSearchParamsRaw = new URLSearchParams(
      "source=youtube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DIDC8PrZQHts",
    );

    render(<SourceRouter />);

    expect(screen.queryByTestId("source-picker")).toBeNull();
    expect(screen.getByTestId("youtube-ingest-pane")).toHaveAttribute(
      "data-initial-url",
      "https://www.youtube.com/watch?v=IDC8PrZQHts",
    );
  });

  it("renders the blank YouTube pane directly for source=youtube validation links", () => {
    mockPrerecordStage = "picker";
    mockSearchParamsRaw = new URLSearchParams("source=youtube");

    render(<SourceRouter />);

    expect(screen.queryByTestId("source-picker")).toBeNull();
    expect(screen.getByTestId("youtube-ingest-pane")).not.toHaveAttribute(
      "data-initial-url",
    );
  });
});

// ─── 2. Stage: selected + mic ─────────────────────────────────────────────────

describe("SourceRouter – selected stage + mic", () => {
  it("renders mic PreRecord button when source.kind is 'mic'", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "mic" };
    render(<SourceRouter />);
    expect(screen.getByRole("button", { name: /Start a session/i })).toBeTruthy();
  });

  it("does NOT render SourcePicker when prerecordStage is 'selected'", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "mic" };
    render(<SourceRouter />);
    expect(screen.queryByTestId("source-picker")).toBeNull();
  });
});

// ─── 3. Stage: selected + browser_tab ────────────────────────────────────────

describe("SourceRouter – selected + browser_tab", () => {
  it("renders BrowserTabIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "browser_tab" };
    render(<SourceRouter />);
    expect(screen.getByTestId("browser-tab-ingest-pane")).toBeTruthy();
  });
});

// ─── 4. Stage: selected + text_doc ───────────────────────────────────────────

describe("SourceRouter – selected + text_doc", () => {
  it("renders TextIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "text_doc" };
    render(<SourceRouter />);
    expect(screen.getByTestId("text-ingest-pane")).toBeTruthy();
  });

  it("renders ClaimQuickCheckPane for text_doc claim-only intent", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "text_doc", intent: "claim_only" };
    render(<SourceRouter />);
    expect(screen.getByTestId("claim-quick-check-pane")).toBeTruthy();
    expect(screen.queryByTestId("text-ingest-pane")).toBeNull();
  });

  it("renders WebUrlIngestPane for text_doc web-url intent", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "text_doc", intent: "web_url" };
    render(<SourceRouter />);
    expect(screen.getByTestId("web-url-ingest-pane")).toBeTruthy();
    expect(screen.queryByTestId("text-ingest-pane")).toBeNull();
  });
});

// ─── 5. Stage: selected + audio_file ─────────────────────────────────────────

describe("SourceRouter – selected + audio_file", () => {
  it("renders AudioIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "audio_file" };
    render(<SourceRouter />);
    expect(screen.getByTestId("audio-ingest-pane")).toBeTruthy();
  });
});

// ─── 6. Stage: selected + youtube ────────────────────────────────────────────

describe("SourceRouter – selected + youtube", () => {
  it("renders YoutubeIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "youtube" };
    render(<SourceRouter />);
    expect(screen.getByTestId("youtube-ingest-pane")).toBeTruthy();
  });
});

// ─── 7. Stage: selected + media_url ──────────────────────────────────────────

describe("SourceRouter – selected + media_url", () => {
  it("renders MediaUrlIngestPane", () => {
    mockPrerecordStage = "selected";
    mockSource = { kind: "media_url" };
    render(<SourceRouter />);
    expect(screen.getByTestId("media-url-ingest-pane")).toBeTruthy();
  });
});
