import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { HomeOverview } from "@/components/session/home-overview";
import type { ClaimCard, RhetoricMarker, Speaker, TranscriptSegment } from "@/lib/types";
import type { SynthesisState } from "@/lib/client/session-store";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

const mockPush = vi.fn();
let mockSearchParamsRaw = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParamsRaw,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} data-next-link="true" {...props}>
      {children}
    </a>
  ),
}));

// ─── Mock useSession store ────────────────────────────────────────────────────

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";

// ─── Mock ListeningEmptyState ─────────────────────────────────────────────────
// Avoids AudioContext/RAF in jsdom and gives us a stable test handle.

vi.mock("@/components/session/listening-empty-state", () => ({
  ListeningEmptyState: () => (
    <div data-testid="listening-empty-state">Listening for first words…</div>
  ),
}));

// ─── Fixture helpers ──────────────────────────────────────────────────────────

import type { SessionSource } from "@/lib/types";

function makeDefaultStoreState(overrides: {
  transcript?: TranscriptSegment[];
  claims?: ClaimCard[];
  markers?: RhetoricMarker[];
  speakers?: Speaker[];
  synthesis?: SynthesisState;
  startedAt?: string | null;
  source?: SessionSource;
  micStream?: MediaStream | null;
} = {}) {
  return {
    transcript: overrides.transcript ?? [],
    claims: overrides.claims ?? [],
    markers: overrides.markers ?? [],
    speakers: overrides.speakers ?? [],
    synthesis: overrides.synthesis ?? null,
    startedAt: overrides.startedAt ?? null,
    source: overrides.source ?? ({ kind: "mic" } as SessionSource),
    micStream: overrides.micStream ?? null,
  };
}

function makeClaim(
  overrides: Partial<ClaimCard> & Pick<ClaimCard, "primary_label" | "status">,
): ClaimCard {
  return {
    id: "c-" + Math.random(),
    claim_text: "Some claim text",
    utterance_start: 10,
    utterance_end: 20,
    speaker_id: 0,
    topic: "politics",
    topic_secondary: null,
    score: 50,
    annotations: [],
    explanation: "",
    sources: [],
    ...overrides,
  };
}

// ─── useSession mock helper ────────────────────────────────────────────────────

function mockStore(storeData: ReturnType<typeof makeDefaultStoreState>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: typeof storeData) => unknown) => selector(storeData),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPush.mockReset();
  mockSearchParamsRaw = new URLSearchParams("");
  mockStore(makeDefaultStoreState());
});

// 1. Renders without crashing when store is empty

describe("HomeOverview – empty store", () => {
  it("renders without crashing with all-empty store state", () => {
    expect(() => render(<HomeOverview />)).not.toThrow();
  });
});

// 2. SynthesisCard receives synthesis=null → renders nothing (no amber border card)

describe("HomeOverview – null synthesis", () => {
  it("does not render a SynthesisCard when synthesis is null", () => {
    mockStore(makeDefaultStoreState({ synthesis: null }));
    const { container } = render(<HomeOverview />);
    // The SynthesisCard with border-l-amber should be absent
    const amberCard = container.querySelector(".border-l-amber");
    expect(amberCard).toBeNull();
  });
});

// 3. Four tiles always render with their labels

describe("HomeOverview – tile labels", () => {
  it("renders the CLAIMS tile label", () => {
    render(<HomeOverview />);
    expect(screen.getByText("CLAIMS")).toBeTruthy();
  });

  it("renders the MARKERS tile label", () => {
    render(<HomeOverview />);
    expect(screen.getByText("MARKERS")).toBeTruthy();
  });

  it("renders the SPEAKERS tile label", () => {
    render(<HomeOverview />);
    expect(screen.getByText("SPEAKERS")).toBeTruthy();
  });

  it("renders the SESSION tile label", () => {
    render(<HomeOverview />);
    expect(screen.getByText("SESSION")).toBeTruthy();
  });
});

// 4. Headline click index 0 → routes to markers/fallacy

describe("HomeOverview – headline click routing", () => {
  it("headline click index 0 pushes /session?view=markers&type=fallacy", () => {
    const synthesis: SynthesisState = {
      state: "fresh",
      text: "Some synthesis text.",
      headlines: ["5 fallacies detected", "70% verified", "Climate dominates"],
      at: Date.now(),
    };
    mockStore(makeDefaultStoreState({ synthesis }));

    render(<HomeOverview />);

    // Find the first headline button (index 0)
    const buttons = screen.getAllByRole("button");
    const firstHeadlineBtn = buttons.find((b) =>
      b.textContent?.includes("5 fallacies detected"),
    );
    expect(firstHeadlineBtn).toBeTruthy();

    fireEvent.click(firstHeadlineBtn!);
    expect(mockPush).toHaveBeenCalledWith("/session?view=markers&type=fallacy");
  });

  it("headline click index 1 pushes /session?view=claims&verdict=true,mostly_true", () => {
    const synthesis: SynthesisState = {
      state: "fresh",
      text: "Some synthesis text.",
      headlines: ["5 fallacies detected", "70% verified", "Climate dominates"],
      at: Date.now(),
    };
    mockStore(makeDefaultStoreState({ synthesis }));

    render(<HomeOverview />);

    const buttons = screen.getAllByRole("button");
    const secondHeadlineBtn = buttons.find((b) =>
      b.textContent?.includes("70% verified"),
    );
    expect(secondHeadlineBtn).toBeTruthy();

    fireEvent.click(secondHeadlineBtn!);
    expect(mockPush).toHaveBeenCalledWith(
      "/session?view=claims&verdict=true%2Cmostly_true",
    );
  });

  it("headline click index 2 pushes /session?view=claims", () => {
    const synthesis: SynthesisState = {
      state: "fresh",
      text: "Some synthesis text.",
      headlines: ["5 fallacies detected", "70% verified", "Climate dominates"],
      at: Date.now(),
    };
    mockStore(makeDefaultStoreState({ synthesis }));

    render(<HomeOverview />);

    const buttons = screen.getAllByRole("button");
    const thirdHeadlineBtn = buttons.find((b) =>
      b.textContent?.includes("Climate dominates"),
    );
    expect(thirdHeadlineBtn).toBeTruthy();

    fireEvent.click(thirdHeadlineBtn!);
    expect(mockPush).toHaveBeenCalledWith("/session?view=claims");
  });
});

// 5. TopicStrip receives segments when claims have topics

describe("HomeOverview – topic strip", () => {
  it("renders a topic segment when claims have topics", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed", topic: "Climate" }),
      makeClaim({ primary_label: "FALSE", status: "confirmed", topic: "Climate" }),
    ];
    mockStore(makeDefaultStoreState({ claims }));

    render(<HomeOverview />);

    // "CLIMATE" should appear in the topic strip
    expect(screen.getByText("CLIMATE")).toBeTruthy();
  });

  it("renders 'No topics yet' when there are no claims", () => {
    render(<HomeOverview />);
    expect(screen.getByText("No topics yet")).toBeTruthy();
  });
});

// 6. ActivityFeed receives events sorted desc by time

describe("HomeOverview – activity feed events", () => {
  it("renders the 'Recent activity' heading from ActivityFeed", () => {
    render(<HomeOverview />);
    expect(screen.getByText("Recent activity")).toBeTruthy();
  });

  it("renders events sorted desc — most recent claim appears first", () => {
    const claims = [
      makeClaim({
        id: "early",
        primary_label: "TRUE",
        status: "confirmed",
        utterance_start: 5,
        claim_text: "Early claim",
      }),
      makeClaim({
        id: "late",
        primary_label: "FALSE",
        status: "confirmed",
        utterance_start: 100,
        claim_text: "Late claim",
      }),
    ];
    mockStore(makeDefaultStoreState({ claims }));

    render(<HomeOverview />);

    const earlyEl = screen.getByText(/Early claim/);
    const lateEl = screen.getByText(/Late claim/);

    // compareDocumentPosition: FOLLOWING = 4, PRECEDING = 2
    // lateEl should come before earlyEl in the DOM (sorted desc by ts)
    const position = lateEl.compareDocumentPosition(earlyEl);
    // DOCUMENT_POSITION_FOLLOWING means earlyEl follows lateEl → lateEl is first
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("excludes checking claims from the feed", () => {
    const claims = [
      makeClaim({
        primary_label: "TRUE",
        status: "checking",
        claim_text: "Checking claim that should not appear",
      }),
    ];
    mockStore(makeDefaultStoreState({ claims }));

    render(<HomeOverview />);
    expect(screen.queryByText(/Checking claim that should not appear/)).toBeNull();
  });
});

// 7. Tile values reflect store data

describe("HomeOverview – tile values", () => {
  it("CLAIMS tile shows count of terminal (non-checking) claims", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
      makeClaim({ primary_label: "FALSE", status: "provisional" }),
      makeClaim({ primary_label: "TRUE", status: "checking" }), // excluded
    ];
    mockStore(makeDefaultStoreState({ claims }));

    render(<HomeOverview />);

    // Claims tile value should be "2" (2 terminal, 1 checking)
    // The value "2" appears as the big serif number in the tile
    const allTwos = screen.getAllByText("2");
    expect(allTwos.length).toBeGreaterThan(0);
  });

  it("SPEAKERS tile shows count of speakers", () => {
    const speakers: Speaker[] = [
      { id: 0, label: "Alice" },
      { id: 1, label: "Bob" },
    ];
    mockStore(makeDefaultStoreState({ speakers }));

    render(<HomeOverview />);
    // "2" should appear as the speakers count
    const twoEls = screen.getAllByText("2");
    expect(twoEls.length).toBeGreaterThan(0);
  });
});

// 8. Source health card

describe("HomeOverview – source health", () => {
  it("renders waiting source health for an empty mic session", () => {
    render(<HomeOverview />);

    expect(screen.getByTestId("source-health-card")).toBeTruthy();
    expect(screen.getByText("Source health")).toBeTruthy();
    expect(screen.getByText("Microphone")).toBeTruthy();
    expect(screen.getByText("Waiting for transcript")).toBeTruthy();
  });

  it("shows source-backed health when reviewed claims have citations", () => {
    const claims = [
      makeClaim({
        primary_label: "TRUE",
        status: "confirmed",
        sources: [
          {
            url: "https://nasa.gov/fact",
            domain: "nasa.gov",
            title: "NASA fact",
            reputation_tier: "high",
            stance: "supports",
          },
        ],
      }),
    ];
    const transcript: TranscriptSegment[] = [
      { text: "The moon landing happened.", start: 0, end: 2, is_final: true, speaker_id: 0 },
    ];

    mockStore(
      makeDefaultStoreState({
        claims,
        transcript,
        source: {
          kind: "youtube",
          video_id: "abc",
          url: "https://youtu.be/abc",
          title: "Apollo clip",
          channel: "Archive",
        },
      }),
    );

    render(<HomeOverview />);

    expect(screen.getByText("YouTube")).toBeTruthy();
    expect(screen.getByText("Apollo clip")).toBeTruthy();
    expect(screen.getAllByText("Source-backed").length).toBeGreaterThan(0);
    expect(screen.getByText("1 total, 1 high-rep")).toBeTruthy();
  });

  it("keeps checking status visible while claims are still being sourced", () => {
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "checking" }),
    ];
    const transcript: TranscriptSegment[] = [
      { text: "Checking this now.", start: 0, end: 2, is_final: true, speaker_id: 0 },
    ];
    mockStore(makeDefaultStoreState({ claims, transcript }));

    render(<HomeOverview />);

    expect(screen.getByText("Checking sources")).toBeTruthy();
    expect(screen.getByText("Still checking")).toBeTruthy();
  });
});

// 9. Text/article source review card

describe("HomeOverview – text source review", () => {
  it("renders imported article text, outline, anchors, and review links", () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=source_quote_anchors&view=overview&t=17&block=3",
    );
    const source: SessionSource = {
      kind: "text_doc",
      filename: "",
      mime: "text/html",
      byte_count: 850,
      intent: "web_url",
      source_url: "https://example.com/story",
      initial_text:
        "Shared article headline. The first paragraph gives the user enough source context to audit the analysis without leaving the overview.",
      document_meta: {
        extraction_kind: "plain_text",
        outline: [
          {
            kind: "heading",
            label: "Shared article headline",
            preview: "The first paragraph gives the user enough source context.",
            line_start: 1,
          },
        ],
      },
    };
    const transcript: TranscriptSegment[] = [
      {
        text: "The first paragraph gives the user enough source context.",
        start: 0,
        end: 4,
        is_final: true,
        speaker_id: 0,
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      },
    ];
    const claims = [
      makeClaim({
        primary_label: "TRUE",
        status: "confirmed",
        document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0, line_start: 1 },
      }),
    ];

    mockStore(makeDefaultStoreState({ source, transcript, claims }));

    render(<HomeOverview />);

    const card = within(screen.getByTestId("text-source-review-card"));
    expect(card.getByText("Article source")).toBeTruthy();
    expect(card.getByText("example.com")).toBeTruthy();
    expect(card.getByText("Plain text")).toBeTruthy();
    expect(card.getAllByText(/Shared article headline/)).toHaveLength(2);
    expect(card.getAllByText("1").length).toBeGreaterThanOrEqual(2);
    expect(card.getByText("anchored transcript lines")).toBeTruthy();
    expect(card.getByText("anchored claims")).toBeTruthy();
    expect(card.getByRole("link", { name: "Review source" })).toHaveAttribute(
      "href",
      "/session?demo=validation&sample=source_quote_anchors&view=source&t=17",
    );
    expect(card.getByRole("link", { name: "Review source" })).toHaveAttribute(
      "data-next-link",
      "true",
    );
    expect(card.getByRole("link", { name: "Review transcript" })).toHaveAttribute(
      "href",
      "/session?demo=validation&sample=source_quote_anchors&view=transcript&t=17",
    );
    expect(card.getByRole("link", { name: "Review transcript" })).toHaveAttribute(
      "data-next-link",
      "true",
    );
    expect(card.getByRole("link", { name: "Review claims" })).toHaveAttribute(
      "href",
      "/session?demo=validation&sample=source_quote_anchors&view=claims&t=17",
    );
    expect(card.getByRole("link", { name: "Review claims" })).toHaveAttribute(
      "data-next-link",
      "true",
    );
    expect(card.getByRole("link", { name: /Open original/i })).toHaveAttribute(
      "href",
      "https://example.com/story",
    );
  });

  it("does not render the text source review card for microphone sessions", () => {
    mockStore(makeDefaultStoreState({ source: { kind: "mic" } }));

    render(<HomeOverview />);

    expect(screen.queryByTestId("text-source-review-card")).toBeNull();
  });
});

// 10. SpeakerLegend renders "No utterances yet" when no transcript

describe("HomeOverview – speaker legend empty", () => {
  it("renders 'No utterances yet' in speaker tile when no transcript segments", () => {
    const speakers: Speaker[] = [{ id: 0, label: "Alice" }];
    mockStore(makeDefaultStoreState({ speakers, transcript: [] }));

    render(<HomeOverview />);
    expect(screen.getByText(/No utterances yet/)).toBeTruthy();
  });
});

// 11. ListeningEmptyState conditional rendering

describe("HomeOverview – listening empty state", () => {
  it("shows ListeningEmptyState and hides MetricTiles when startedAt set, transcript empty, source=mic", () => {
    mockStore(
      makeDefaultStoreState({
        startedAt: new Date().toISOString(),
        transcript: [],
        source: { kind: "mic" },
      }),
    );

    render(<HomeOverview />);

    // ListeningEmptyState should be present
    expect(screen.getByTestId("listening-empty-state")).toBeTruthy();
    // MetricTiles should NOT be rendered
    expect(screen.queryByText("CLAIMS")).toBeNull();
    expect(screen.queryByText("MARKERS")).toBeNull();
  });

  it("hides ListeningEmptyState and shows MetricTiles when transcript has items", () => {
    mockStore(
      makeDefaultStoreState({
        startedAt: new Date().toISOString(),
        transcript: [
          {
            text: "Hello world",
            start: 0,
            end: 1,
            is_final: true,
            speaker_id: null,
          },
        ],
        source: { kind: "mic" },
      }),
    );

    render(<HomeOverview />);

    // ListeningEmptyState should be gone
    expect(screen.queryByTestId("listening-empty-state")).toBeNull();
    // MetricTiles should be present
    expect(screen.getByText("CLAIMS")).toBeTruthy();
  });

  it("does not show ListeningEmptyState when source is audio_file even with empty transcript", () => {
    mockStore(
      makeDefaultStoreState({
        startedAt: new Date().toISOString(),
        transcript: [],
        source: {
          kind: "audio_file",
          blob_url: "blob:x",
          duration_sec: 60,
          filename: "talk.mp3",
          mime: "audio/mp3",
        },
      }),
    );

    render(<HomeOverview />);

    expect(screen.queryByTestId("listening-empty-state")).toBeNull();
    // Normal content should render
    expect(screen.getByText("CLAIMS")).toBeTruthy();
  });
});
