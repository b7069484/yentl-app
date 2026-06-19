import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  mockSetPrerecordStage,
  mockSetSource,
  mockBulkIngest,
  mockParseArticleText,
  mockPush,
} = vi.hoisted(() => ({
  mockSetPrerecordStage: vi.fn(),
  mockSetSource: vi.fn(),
  mockBulkIngest: vi.fn().mockResolvedValue(undefined),
  mockParseArticleText: vi.fn(() => [
    { text: "Article text.", start: 0, end: 1, is_final: true, speaker_id: null },
  ]),
  mockPush: vi.fn(),
}));

let mockSource: {
  kind: string;
  intent?: string;
  source_url?: string;
} = { kind: "text_doc", intent: "web_url", source_url: "" };
let mockClipboardReadText = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setPrerecordStage: mockSetPrerecordStage,
      setSource: mockSetSource,
      source: mockSource,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/lib/client/ingest-orchestrator", () => ({
  bulkIngest: mockBulkIngest,
}));

vi.mock("@/lib/client/text-ingest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client/text-ingest")>();
  return {
    ...actual,
    parseArticleText: mockParseArticleText,
  };
});

import { WebUrlIngestPane } from "@/components/session/ingest-panes/web-url-ingest-pane";

const ARTICLE_URL = "https://example.com/story";
const PLAYER_PAGE_URL = "https://example.com/watch/live-event";

function articleErrorResponse(code: string, message: string) {
  return {
    ok: false,
    json: async () => ({
      error: { code, message },
    }),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSource = { kind: "text_doc", intent: "web_url", source_url: "" };
  mockClipboardReadText = vi.fn();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      readText: mockClipboardReadText,
    },
  });
});

describe("WebUrlIngestPane", () => {
  it("renders the article URL input and clipboard paste action", () => {
    render(<WebUrlIngestPane />);

    expect(screen.getByRole("heading", { name: "Paste a page URL" })).toBeTruthy();
    expect(screen.getByLabelText("Web page URL")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Paste URL from clipboard" })).toBeTruthy();
  });

  it("prefills a selected web URL source", () => {
    mockSource = { kind: "text_doc", intent: "web_url", source_url: ARTICLE_URL };

    render(<WebUrlIngestPane />);

    expect(screen.getByDisplayValue(ARTICLE_URL)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Analyze URL" })).not.toBeDisabled();
  });

  it("pastes the first copied URL into the article URL field", async () => {
    mockClipboardReadText.mockResolvedValue(`Read this now: ${ARTICLE_URL}.`);

    render(<WebUrlIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: "Paste URL from clipboard" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Web page URL")).toHaveValue(ARTICLE_URL);
      expect(screen.getByText("URL pasted from clipboard.")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Analyze URL" })).not.toBeDisabled();
    });
  });

  it("shows a clipboard error when copied text has no URL", async () => {
    mockClipboardReadText.mockResolvedValue("no link here");

    render(<WebUrlIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: "Paste URL from clipboard" }));

    await waitFor(() => {
      expect(screen.getByText("Clipboard did not contain an http or https URL.")).toBeTruthy();
    });
  });

  it("renders a local validation article loader in development", () => {
    render(<WebUrlIngestPane />);

    expect(screen.getByRole("button", { name: "Load validation article" })).toBeTruthy();
  });

  it("loads the validation article through the article ingest and session handoff path", async () => {
    const articleText =
      "The city library operating budget increased by 12 percent. The technology grant expired last year.";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        url: "http://localhost:3000/validation/yentl-synthetic-article.html",
        final_url: "http://localhost:3000/validation/yentl-synthetic-article.html",
        title: "Yentl Validation Article",
        description: "A local article fixture for Yentl URL ingest validation.",
        text: articleText,
        word_count: 13,
        source_word_count: 13,
        truncated: false,
        validation_fixture: true,
        validation_fixture_id: "yentl_synthetic_article_html",
      }),
    } as Response);

    render(<WebUrlIngestPane />);
    fireEvent.click(screen.getByRole("button", { name: "Load validation article" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/article-ingest",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-yentl-source-consent": "source-analysis-v1",
          }),
          body: JSON.stringify({
            url: "http://localhost:3000/validation/yentl-synthetic-article.html",
          }),
        }),
      );
      expect(screen.getByLabelText("Web page URL")).toHaveValue(
        "http://localhost:3000/validation/yentl-synthetic-article.html",
      );
      expect(mockParseArticleText).toHaveBeenCalledWith(articleText);
      expect(mockSetSource).toHaveBeenCalledWith({
        kind: "text_doc",
        filename: "Yentl Validation Article",
        mime: "text/html",
        byte_count: articleText.length,
        intent: "web_url",
        initial_text: articleText,
        source_url: "http://localhost:3000/validation/yentl-synthetic-article.html",
      });
      expect(mockBulkIngest).toHaveBeenCalledWith(
        [{ text: "Article text.", start: 0, end: 1, is_final: true, speaker_id: null }],
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(mockPush).toHaveBeenCalledWith("/session?view=overview");
    });

    fetchSpy.mockRestore();
  });

  it("shows recovery choices when article extraction has no readable text", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      articleErrorResponse(
        "NO_READABLE_TEXT",
        "Yentl could not extract enough readable text from this page.",
      ),
    );

    render(<WebUrlIngestPane />);
    fireEvent.change(screen.getByLabelText("Web page URL"), { target: { value: ARTICLE_URL } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze URL" }));

    await waitFor(() => {
      expect(screen.getByText("This URL needs a fallback")).toBeTruthy();
      expect(screen.getByText(/did not expose enough readable article text/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Use Chrome tab" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Try media URL" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Paste text" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Use Chrome tab" }));
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "browser_tab",
      url: ARTICLE_URL,
      title: "example.com",
    });
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");

    fireEvent.click(screen.getByRole("button", { name: "Paste text" }));
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "",
      mime: "",
      byte_count: 0,
    });
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");

    fetchSpy.mockRestore();
  });

  it("routes unsupported article URLs toward the media URL recovery path", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      articleErrorResponse(
        "UNSUPPORTED_PAGE",
        "This URL did not return readable text/html or text/plain content.",
      ),
    );

    render(<WebUrlIngestPane />);
    fireEvent.change(screen.getByLabelText("Web page URL"), { target: { value: PLAYER_PAGE_URL } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze URL" }));

    await waitFor(() => {
      expect(screen.getByText(/probably not a readable article page/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Try media URL" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Try media URL" }));
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "media_url",
      url: PLAYER_PAGE_URL,
    });
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");

    fetchSpy.mockRestore();
  });
});
