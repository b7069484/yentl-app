import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ClaimCard, SessionSource, TranscriptSegment } from "@/lib/types";

let mockSearchParamsRaw = new URLSearchParams("");

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParamsRaw,
}));

import { useSession } from "@/lib/client/session-store";
import { SourceReviewView } from "@/components/session/source-review-view";

const scrollIntoViewMock = vi.fn();

type StoreState = {
  source: SessionSource;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
};

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "claim-1",
    claim_text: "The release log was public.",
    utterance_start: 0,
    utterance_end: 4,
    speaker_id: 0,
    topic: "records",
    topic_secondary: null,
    primary_label: "TRUE",
    score: 86,
    annotations: [],
    explanation: "The document supports the claim.",
    status: "confirmed",
    sources: [],
    ...overrides,
  };
}

function mockStore(overrides: Partial<StoreState> = {}) {
  const data: StoreState = {
    source: { kind: "mic" },
    transcript: [],
    claims: [],
    ...overrides,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: StoreState) => unknown) => selector(data),
  );
}

describe("SourceReviewView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsRaw = new URLSearchParams("");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
    mockStore();
  });

  it("renders imported source text with anchored transcript and claim map", () => {
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Investigation notes",
      mime: "text/plain",
      byte_count: 220,
      intent: "web_url",
      source_url: "https://example.com/investigation",
      initial_text:
        "The city published the release log on Friday.\n\nThe council member said the report was hidden from the public.",
      document_meta: {
        extraction_kind: "plain_text",
        outline: [
          {
            kind: "paragraph",
            label: "Release log",
            preview: "The city published the release log on Friday.",
            paragraph_index: 0,
          },
          {
            kind: "paragraph",
            label: "Public claim",
            preview: "The council member said the report was hidden.",
            paragraph_index: 1,
          },
        ],
      },
    };
    const transcript: TranscriptSegment[] = [
      {
        text: "The city published the release log on Friday.",
        start: 0,
        end: 4,
        is_final: true,
        speaker_id: 0,
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      },
      {
        text: "The council member said the report was hidden from the public.",
        start: 4,
        end: 8,
        is_final: true,
        speaker_id: 0,
        document_anchor: { kind: "paragraph", block_index: 1, paragraph_index: 1, line_start: 3 },
      },
    ];
    const claims = [
      makeClaim({
        id: "claim-release-log",
        claim_text: "The release log was public.",
        sources: [
          {
            url: "https://example.com/investigation",
            domain: "example.com",
            title: "Investigation",
            reputation_tier: "high",
            stance: "supports",
          },
        ],
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      }),
      makeClaim({
        id: "claim-hidden",
        claim_text: "The report was hidden from the public.",
        primary_label: "MISLEADING",
        score: 42,
        sources: [],
        document_anchor: { kind: "paragraph", block_index: 1, paragraph_index: 1, line_start: 3 },
      }),
    ];

    mockStore({ source, transcript, claims });

    render(<SourceReviewView />);

    expect(screen.getByTestId("source-review-view")).toBeTruthy();
    expect(screen.getByText("Investigation notes")).toBeTruthy();
    expect(screen.getByText("Plain text")).toBeTruthy();
    expect(screen.getByText("2 blocks")).toBeTruthy();
    expect(screen.getByText("2 anchored lines")).toBeTruthy();
    expect(screen.getByText("2 anchored claims")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Original/ })).toHaveAttribute(
      "href",
      "https://example.com/investigation",
    );

    const blocks = screen.getAllByTestId("source-review-block");
    expect(blocks).toHaveLength(2);
    expect(within(blocks[0]).getByText("Release log")).toBeTruthy();
    expect(within(blocks[0]).getByText("The release log was public.")).toBeTruthy();
    expect(within(blocks[0]).getByRole("link", { name: /The release log was public/ })).toHaveAttribute(
      "href",
      "/session/detail/claim/claim-release-log?from=source%3Ablock%3A0",
    );
    expect(within(screen.getByText("Claim map").closest("section")!).getByText("Paragraph 1 · line 1")).toBeTruthy();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getByText("sourced")).toBeTruthy();

    const focused = screen.getByTestId("source-review-focused-block");
    expect(within(focused).getByText("Focused source block")).toBeTruthy();
    expect(within(focused).getByRole("heading", { name: "Release log" })).toBeTruthy();
    expect(within(focused).getAllByText("The city published the release log on Friday.").length).toBeGreaterThan(0);
    expect(within(focused).getByText("The release log was public.")).toBeTruthy();
  });

  it("focuses a selected source block and updates the transcript and claim context rail", () => {
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Investigation notes",
      mime: "text/plain",
      byte_count: 220,
      initial_text:
        "The city published the release log on Friday.\n\nThe council member said the report was hidden from the public.",
      document_meta: {
        extraction_kind: "plain_text",
        outline: [
          {
            kind: "paragraph",
            label: "Release log",
            preview: "The city published the release log on Friday.",
            paragraph_index: 0,
          },
          {
            kind: "paragraph",
            label: "Public claim",
            preview: "The council member said the report was hidden.",
            paragraph_index: 1,
          },
        ],
      },
    };
    const transcript: TranscriptSegment[] = [
      {
        text: "The city published the release log on Friday.",
        start: 0,
        end: 4,
        is_final: true,
        speaker_id: 0,
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      },
      {
        text: "The council member said the report was hidden from the public.",
        start: 4,
        end: 8,
        is_final: true,
        speaker_id: 0,
        document_anchor: { kind: "paragraph", block_index: 1, paragraph_index: 1, line_start: 3 },
      },
    ];
    const claims = [
      makeClaim({
        id: "claim-release-log",
        claim_text: "The release log was public.",
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      }),
      makeClaim({
        id: "claim-hidden",
        claim_text: "The report was hidden from the public.",
        primary_label: "MISLEADING",
        score: 42,
        document_anchor: { kind: "paragraph", block_index: 1, paragraph_index: 1, line_start: 3 },
      }),
    ];

    mockStore({ source, transcript, claims });
    render(<SourceReviewView />);

    let focused = screen.getByTestId("source-review-focused-block");
    expect(within(focused).getByRole("heading", { name: "Release log" })).toBeTruthy();
    expect(within(focused).queryByText("The report was hidden from the public.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Focus Paragraph 2" }));

    focused = screen.getByTestId("source-review-focused-block");
    expect(within(focused).getByRole("heading", { name: "Paragraph 2" })).toBeTruthy();
    expect(within(focused).getAllByText("The council member said the report was hidden from the public.").length).toBeGreaterThan(0);
    expect(within(focused).getByText("The report was hidden from the public.")).toBeTruthy();
    expect(within(focused).queryByText("The release log was public.")).toBeNull();

    fireEvent.click(within(focused).getByRole("button", { name: "Jump to block" }));

    const blocks = screen.getAllByTestId("source-review-block");
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(blocks[1]).toHaveAttribute("data-source-block-focused", "true");
    expect(blocks[1]).toHaveAttribute("data-source-block-jumped", "true");
    expect(document.activeElement).toBe(blocks[1]);
  });

  it("highlights the best matching source sentence for a selected claim", () => {
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Investigation notes",
      mime: "text/plain",
      byte_count: 220,
      initial_text:
        "The city published the release log on Friday. The audit timeline showed the report was added to the public archive before the meeting started.",
    };
    const claims = [
      makeClaim({
        id: "claim-release-log",
        claim_text: "The release log was public.",
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      }),
      makeClaim({
        id: "claim-audit",
        claim_text: "The audit timeline showed the report was added to the public archive before the meeting started.",
        primary_label: "TRUE",
        score: 92,
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      }),
    ];

    mockStore({ source, transcript: [], claims });
    render(<SourceReviewView />);

    const block = screen.getByTestId("source-review-block");
    expect(screen.getByTestId("source-quote-highlight").textContent).toBe(
      "The city published the release log on Friday.",
    );

    fireEvent.click(
      within(block).getByRole("button", {
        name: "Highlight source quote for The audit timeline showed the report was added to the public archive before the meeting started.",
      }),
    );

    expect(screen.getByTestId("source-quote-highlight").textContent).toBe(
      "The audit timeline showed the report was added to the public archive before the meeting started.",
    );
    expect(
      within(block).getByRole("button", {
        name: "Highlight source quote for The audit timeline showed the report was added to the public archive before the meeting started.",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("prefers persisted quote offsets over fuzzy sentence matching", () => {
    const quote = "The audit timeline showed the report was added to the public archive before the meeting started.";
    const initialText = `Opening setup sentence. ${quote}`;
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Investigation notes",
      mime: "text/plain",
      byte_count: initialText.length,
      initial_text: initialText,
    };
    const claims = [
      makeClaim({
        id: "claim-persisted-quote",
        claim_text: "A weakly worded claim that would not match the audit sentence by itself.",
        document_anchor: {
          kind: "paragraph",
          block_index: 0,
          paragraph_index: 0,
          char_start: initialText.indexOf(quote),
          char_end: initialText.indexOf(quote) + quote.length,
          quote_text: quote,
        },
      }),
    ];

    mockStore({ source, transcript: [], claims });
    render(<SourceReviewView />);

    expect(screen.getByTestId("source-quote-highlight").textContent).toBe(quote);
    expect(screen.getAllByTestId("source-quote-preview").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId("source-quote-preview").every((preview) => preview.textContent?.includes(quote))).toBe(true);
  });

  it("restores the focused source block from the route block param", async () => {
    mockSearchParamsRaw = new URLSearchParams("view=source&block=1");
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Investigation notes",
      mime: "text/plain",
      byte_count: 220,
      initial_text:
        "The city published the release log on Friday.\n\nThe council member said the report was hidden from the public.",
    };
    const transcript: TranscriptSegment[] = [
      {
        text: "The city published the release log on Friday.",
        start: 0,
        end: 4,
        is_final: true,
        speaker_id: 0,
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      },
      {
        text: "The council member said the report was hidden from the public.",
        start: 4,
        end: 8,
        is_final: true,
        speaker_id: 0,
        document_anchor: { kind: "paragraph", block_index: 1, paragraph_index: 1, line_start: 3 },
      },
    ];

    mockStore({ source, transcript, claims: [] });
    render(<SourceReviewView />);

    const blocks = screen.getAllByTestId("source-review-block");
    await waitFor(() => {
      expect(blocks[1]).toHaveAttribute("data-source-block-focused", "true");
      expect(blocks[1]).toHaveAttribute("data-source-block-jumped", "true");
    });
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(document.activeElement).toBe(blocks[1]);
  });

  it("shows an empty source-review state when the session has no imported text", () => {
    mockStore({ source: { kind: "mic" }, transcript: [], claims: [] });

    render(<SourceReviewView />);

    expect(screen.getByTestId("source-review-empty")).toBeTruthy();
    expect(screen.getByText("No imported source text")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/session?view=overview");
  });

  it("renders paragraphs when persisted outline metadata is malformed", () => {
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Recovered notes",
      mime: "text/plain",
      byte_count: 140,
      initial_text:
        "The city published the release log on Friday.\n\nThe clerk pointed to the release log during the hearing.",
      document_meta: {
        extraction_kind: "plain_text",
        outline: { blocks: "legacy bad shape" } as never,
      },
    };
    const claims = [
      makeClaim({
        id: "claim-release-log",
        claim_text: "The clerk pointed to the release log during the hearing.",
        document_anchor: { kind: "paragraph", block_index: 1, paragraph_index: 1, line_start: 3 },
      }),
    ];

    mockStore({ source, transcript: [], claims });

    render(<SourceReviewView />);

    const blocks = screen.getAllByTestId("source-review-block");
    expect(blocks).toHaveLength(2);
    expect(within(blocks[0]).getByText("Paragraph 1")).toBeTruthy();
    expect(within(blocks[1]).getByText("Paragraph 2")).toBeTruthy();
    expect(
      within(blocks[1]).getAllByText("The clerk pointed to the release log during the hearing.").length,
    ).toBeGreaterThan(0);
  });

  it("shows the empty state instead of crashing when restored initial_text is not a string", () => {
    const source = {
      kind: "text_doc",
      filename: "Corrupt restored source",
      mime: "text/plain",
      byte_count: 0,
      initial_text: { text: "bad restored payload" },
      document_meta: { extraction_kind: "plain_text" },
    } as unknown as SessionSource;

    mockStore({ source, transcript: [], claims: [] });

    render(<SourceReviewView />);

    expect(screen.getByTestId("source-review-empty")).toBeTruthy();
    expect(screen.getByText("No imported source text")).toBeTruthy();
  });

  it("does not apply the first body outline item to a short shared title", () => {
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Shared text",
      mime: "text/plain",
      byte_count: 180,
      initial_text:
        "Yentl source review proof\n\nThe city published the release log on Friday. The clerk pointed to the release log during the hearing.",
      document_meta: {
        extraction_kind: "plain_text",
        outline: [
          {
            kind: "paragraph",
            label: "Release log paragraph",
            preview: "The city published the release log on Friday.",
            paragraph_index: 0,
          },
        ],
      },
    };

    mockStore({ source, transcript: [], claims: [] });

    render(<SourceReviewView />);

    const blocks = screen.getAllByTestId("source-review-block");
    expect(blocks).toHaveLength(2);
    expect(within(blocks[0]).getByText("Title")).toBeTruthy();
    expect(within(blocks[0]).getAllByText("Yentl source review proof")).toHaveLength(2);
    expect(within(blocks[1]).getByText("Release log paragraph")).toBeTruthy();
  });

  it("places a claim with a weak title anchor beside the matching body text", () => {
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Shared text",
      mime: "text/plain",
      byte_count: 180,
      initial_text:
        "Yentl source review proof\n\nThe city published the release log on Friday. The clerk pointed to the release log during the hearing.",
      document_meta: {
        extraction_kind: "plain_text",
        outline: [
          {
            kind: "paragraph",
            label: "Release log paragraph",
            preview: "The city published the release log on Friday.",
            paragraph_index: 0,
          },
        ],
      },
    };
    const claims = [
      makeClaim({
        id: "claim-release-log",
        claim_text: "The clerk pointed to the release log during the hearing.",
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      }),
    ];

    mockStore({ source, transcript: [], claims });

    render(<SourceReviewView />);

    const blocks = screen.getAllByTestId("source-review-block");
    expect(within(blocks[0]).queryByText("The clerk pointed to the release log during the hearing.")).toBeNull();
    expect(within(blocks[1]).getAllByText("The clerk pointed to the release log during the hearing.").length).toBeGreaterThan(0);
  });

  it("places a claim with a poor paragraph anchor beside the stronger matching paragraph", () => {
    const source: SessionSource = {
      kind: "text_doc",
      filename: "Shared text",
      mime: "text/plain",
      byte_count: 260,
      initial_text:
        "The city published the release log on Friday. The clerk pointed to the release log during the hearing.\n\nThe audit timeline showed the report was added to the public archive before the meeting started.",
      document_meta: {
        extraction_kind: "plain_text",
        outline: [
          {
            kind: "paragraph",
            label: "Release log paragraph",
            preview: "The city published the release log on Friday.",
            paragraph_index: 0,
          },
          {
            kind: "paragraph",
            label: "Audit timeline paragraph",
            preview: "The audit timeline showed the report was added to the public archive.",
            paragraph_index: 1,
          },
        ],
      },
    };
    const claims = [
      makeClaim({
        id: "claim-audit",
        claim_text: "The audit timeline showed the report was added to the public archive before the meeting started.",
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      }),
    ];

    mockStore({ source, transcript: [], claims });

    render(<SourceReviewView />);

    const blocks = screen.getAllByTestId("source-review-block");
    expect(within(blocks[0]).queryByText("The audit timeline showed the report was added to the public archive before the meeting started.")).toBeNull();
    expect(within(blocks[1]).getAllByText("The audit timeline showed the report was added to the public archive before the meeting started.").length).toBeGreaterThan(0);
  });
});
