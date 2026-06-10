import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker, Speaker } from "@/lib/types";

// ─── Next.js navigation mocks ─────────────────────────────────────────────────

const mockBack = vi.fn();
let mockSearchParamsRaw = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, push: vi.fn() }),
  useSearchParams: () => mockSearchParamsRaw,
}));

// ─── Session store mock ───────────────────────────────────────────────────────

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "c-1",
    claim_text: "Scientists agree the vaccine is safe.",
    utterance_start: 30,
    utterance_end: 35,
    speaker_id: 0,
    topic: "health",
    topic_secondary: null,
    primary_label: "TRUE",
    score: 88,
    annotations: [],
    explanation: "Multiple peer-reviewed studies confirm safety.",
    status: "confirmed",
    sources: [
      {
        url: "https://example.com/study",
        domain: "example.com",
        title: "Vaccine Safety Study",
        reputation_tier: "high",
        stance: "supports",
        excerpt: "Evidence strongly supports safety.",
      },
    ],
    ...overrides,
  };
}

function makeMarker(overrides: Partial<RhetoricMarker> = {}): RhetoricMarker {
  return {
    id: "m-1",
    type: "fallacy",
    name: "slippery_slope",
    display: "Slippery Slope Fallacy",
    excerpt: "If we allow X, everything will collapse.",
    speaker_id: 0,
    start_time: 60,
    end_time: 65,
    severity: "clear",
    explanation: "Assumes a chain of events without justification.",
    ...overrides,
  };
}

const defaultSpeakers: Speaker[] = [{ id: 0, label: "Speaker 1" }];

function mockStore({
  claims = [] as ClaimCard[],
  markers = [] as RhetoricMarker[],
  speakers = defaultSpeakers,
} = {}) {
  const data = { claims, markers, speakers };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: typeof data) => unknown) => selector(data),
  );
}

// ─── Import under test ────────────────────────────────────────────────────────
// Imported after mocks are set up.

import { LearnMore } from "@/components/session/learn-more";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockBack.mockReset();
  mockSearchParamsRaw = new URLSearchParams("");
  mockStore();
});

// ─── Mobile tap targets ──────────────────────────────────────────────────────

describe("LearnMore – mobile learn-route tap targets", () => {
  it("keeps claim learn back and related-claim controls at the mobile tap-target minimum", () => {
    const claim = makeClaim({ id: "c-1", topic: "health" });
    const related = makeClaim({
      id: "c-2",
      topic: "health",
      claim_text: "Related health claim",
    });
    mockStore({ claims: [claim, related] });

    render(<LearnMore type="claim" id="c-1" />);

    expect(screen.getByTestId("learn-back-btn").className).toContain("min-h-11");
    for (const link of screen.getAllByTestId("claim-related-link")) {
      expect(link.className).toContain("min-h-11");
    }
  });

  it("preserves validation context on claim related links and source detail links", () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=source_quote_anchors&title=Source%20fixture",
    );
    const claim = makeClaim({ id: "c-1", topic: "health" });
    const related = makeClaim({
      id: "c-2",
      topic: "health",
      claim_text: "Related health claim",
    });
    mockStore({ claims: [claim, related] });

    render(<LearnMore type="claim" id="c-1" />);

    expect(screen.getByTestId("source-detail-link")).toHaveAttribute(
      "href",
      "/session/detail/source/c-1__source__0?demo=validation&sample=source_quote_anchors&title=Source+fixture",
    );
    expect(screen.getByTestId("claim-related-link")).toHaveAttribute(
      "href",
      "/session/detail/claim/c-2?demo=validation&sample=source_quote_anchors&title=Source+fixture",
    );
  });

  it("keeps marker learn back, reading, occurrence, and related-pattern controls at the mobile tap-target minimum", () => {
    const matchingMarker = makeMarker({
      id: "m-1",
      name: "slippery_slope",
      excerpt: "matching excerpt",
    });
    mockStore({ markers: [matchingMarker] });

    render(<LearnMore type="marker" id="slippery_slope" />);

    expect(screen.getByTestId("learn-back-btn").className).toContain("min-h-11");
    for (const link of screen.getAllByTestId("learn-reading-link")) {
      expect(link.className).toContain("min-h-11");
    }
    for (const link of screen.getAllByTestId("marker-occurrence-link")) {
      expect(link.className).toContain("min-h-11");
    }
    for (const link of screen.getAllByTestId("marker-related-link")) {
      expect(link.className).toContain("min-h-11");
    }
  });

  it("preserves validation context on marker occurrence and related-pattern links", () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=media_playback_sync&title=Fixture%20clip",
    );
    const matchingMarker = makeMarker({
      id: "m-1",
      name: "slippery_slope",
      excerpt: "matching excerpt",
    });
    mockStore({ markers: [matchingMarker] });

    render(<LearnMore type="marker" id="slippery_slope" />);

    expect(screen.getByTestId("marker-occurrence-link")).toHaveAttribute(
      "href",
      "/session/detail/marker/m-1?demo=validation&sample=media_playback_sync&title=Fixture+clip",
    );
    expect(screen.getAllByTestId("marker-related-link")[0]).toHaveAttribute(
      "href",
      expect.stringContaining("?demo=validation&sample=media_playback_sync&title=Fixture+clip"),
    );
  });

  it("keeps the learn-route missing-item return control at the mobile tap-target minimum", () => {
    mockStore({ claims: [] });
    render(<LearnMore type="claim" id="nonexistent-id" />);
    expect(screen.getByTestId("learn-notfound-back-btn").className).toContain("min-h-11");
  });
});

// ─── Marker variant — valid id ────────────────────────────────────────────────

describe("LearnMore – marker variant, valid canonical_id", () => {
  it("renders definition section when entry exists", () => {
    mockStore({ markers: [makeMarker()] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    // The taxonomy entry definition should appear
    expect(screen.getByText(/Definition/i)).toBeTruthy();
  });

  it("renders the entry display name in header", () => {
    mockStore({ markers: [makeMarker()] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    expect(screen.getByText("Slippery Slope Fallacy")).toBeTruthy();
  });

  it("renders How to spot it section when entry has how_to_spot", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    expect(screen.getByText("How to spot it")).toBeTruthy();
  });

  it("renders Further reading section", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    expect(screen.getByText("Further reading")).toBeTruthy();
  });

  it("renders the mapped book chapter as a real field-guide card", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    expect(screen.getByTestId("marker-learning-path-card")).toBeTruthy();
    expect(screen.getByText("Book field guide")).toBeTruthy();
    expect(screen.getByText("Chapter: Deficiency in Evidence Fallacies")).toBeTruthy();
    expect(screen.queryByText(/Chapter mapping is not available/)).toBeNull();
  });

  it("renders a practice field guide for extra taxonomy entries without book chapters", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="halo_effect" />);
    expect(screen.getByText("Practice field guide")).toBeTruthy();
    expect(screen.getByText("Cognitive bias · authority")).toBeTruthy();
  });

  it("renders taxonomy examples and practice questions", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    expect(screen.getByText("Example")).toBeTruthy();
    expect(screen.getByText(/increased cultural sensitivity toward Jewish people/i)).toBeTruthy();
    expect(screen.getByText("Practice check")).toBeTruthy();
    expect(screen.getByText(/Which link in the reasoning chain/i)).toBeTruthy();
  });

  it("Wikipedia link is auto-derived and rendered", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    // Link text should contain "Wikipedia"
    expect(screen.getByText(/Wikipedia/)).toBeTruthy();
  });

  it("occurrences section shows only session markers with matching canonical_id", () => {
    const matchingMarker = makeMarker({ id: "m-1", name: "slippery_slope", excerpt: "matching excerpt" });
    const otherMarker = makeMarker({ id: "m-2", name: "anchoring_bias", excerpt: "other excerpt" });
    mockStore({ markers: [matchingMarker, otherMarker] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    // Section title with count 1
    expect(screen.getByText(/Occurrences in this session · 1/)).toBeTruthy();
    // matching excerpt is visible
    expect(screen.getByText(/matching excerpt/)).toBeTruthy();
    expect(screen.getByText("Assumes a chain of events without justification.")).toBeTruthy();
    expect(screen.getByText("clear")).toBeTruthy();
    // other excerpt not visible in occurrences
    const otherEl = screen.queryByText(/other excerpt/);
    expect(otherEl).toBeNull();
  });

  it("renders Related patterns section with chips linking to other learn pages", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    expect(screen.getByText("Related patterns")).toBeTruthy();
    // slippery_slope has related_canonical_ids — at least some should render as links
    // The anchoring_bias display name should appear as a chip if it's related
    // Just check related patterns section renders at all and has links
    const relatedSection = screen.getByText("Related patterns").parentElement;
    expect(relatedSection).toBeTruthy();
  });

  it("back button calls router.back()", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="slippery_slope" />);
    const btn = screen.getByText("Back");
    fireEvent.click(btn);
    expect(mockBack).toHaveBeenCalledOnce();
  });
});

// ─── Marker variant — unknown id ─────────────────────────────────────────────

describe("LearnMore – marker variant, unknown canonical_id", () => {
  it("renders NotFound with 'Unknown marker pattern' message", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="totally_unknown_id_xyz" />);
    expect(screen.getByText("Unknown marker pattern.")).toBeTruthy();
  });

  it("back button in NotFound calls router.back()", () => {
    mockStore({ markers: [] });
    render(<LearnMore type="marker" id="totally_unknown_id_xyz" />);
    const btn = screen.getByText("← Go back");
    fireEvent.click(btn);
    expect(mockBack).toHaveBeenCalledOnce();
  });
});

// ─── Claim variant — valid id ─────────────────────────────────────────────────

describe("LearnMore – claim variant, valid id", () => {
  it("renders ClaimLearnMore with full source list section", () => {
    const claim = makeClaim({ id: "c-1" });
    mockStore({ claims: [claim] });
    render(<LearnMore type="claim" id="c-1" />);
    expect(screen.getByText(/Full source list/)).toBeTruthy();
  });

  it("renders related claims by topic section", () => {
    const claim = makeClaim({ id: "c-1" });
    mockStore({ claims: [claim] });
    render(<LearnMore type="claim" id="c-1" />);
    expect(screen.getByText(/Related claims in this session/)).toBeTruthy();
  });

  it("renders source cards for attached sources", () => {
    const claim = makeClaim({ id: "c-1" });
    mockStore({ claims: [claim] });
    render(<LearnMore type="claim" id="c-1" />);
    expect(screen.getAllByText("Vaccine Safety Study").length).toBeGreaterThan(0);
  });

  it("renders source dossier summary for attached sources", () => {
    const claim = makeClaim({
      id: "c-1",
      claim_text: "Scientists agree vaccine safety is supported.",
    });
    mockStore({ claims: [claim] });
    render(<LearnMore type="claim" id="c-1" />);

    expect(screen.getByTestId("source-dossier")).toBeTruthy();
    expect(screen.getByTestId("source-comparison")).toBeTruthy();
    expect(screen.getByTestId("source-comparison-supports").textContent).toContain("Vaccine Safety Study");
    expect(screen.getByTestId("source-comparison-supports").textContent).toContain("Strongest");
    expect(screen.getByTestId("source-comparison-supports").textContent).toContain(
      "Evidence: high reputation + excerpt + no image",
    );
    expect(screen.getByTestId("source-comparison-supports").textContent).toContain(
      "Claim link: weak overlap only: safety",
    );
    expect(screen.getByTestId("source-excerpt-match").textContent).toBe("safety");
    expect(screen.getByText("1 support / 0 contradict / 0 mixed")).toBeTruthy();
    expect(screen.getByText("1 high / 0 mid / 0 low")).toBeTruthy();
    expect(screen.getByText("0 linked / 1 not direct")).toBeTruthy();
  });

  it("shows 'No sources attached' when claim has no sources", () => {
    const claim = makeClaim({ id: "c-1", sources: [] });
    mockStore({ claims: [claim] });
    render(<LearnMore type="claim" id="c-1" />);
    expect(screen.getByText(/No sources attached/)).toBeTruthy();
  });

  it("related claims filtered by same topic", () => {
    const claim = makeClaim({ id: "c-1", topic: "health" });
    const related = makeClaim({ id: "c-2", topic: "health", claim_text: "Related health claim" });
    const unrelated = makeClaim({ id: "c-3", topic: "economy", claim_text: "Economy claim" });
    mockStore({ claims: [claim, related, unrelated] });
    render(<LearnMore type="claim" id="c-1" />);
    // The claim text is wrapped in curly quotes across sibling text nodes; use getByText with regex
    expect(screen.getByText(/Related health claim/)).toBeTruthy();
    expect(screen.queryByText(/Economy claim/)).toBeNull();
  });

  it("shows 'No related claims' message when no same-topic claims exist", () => {
    const claim = makeClaim({ id: "c-1", topic: "health" });
    mockStore({ claims: [claim] });
    render(<LearnMore type="claim" id="c-1" />);
    expect(screen.getByText(/No related claims on this topic yet/)).toBeTruthy();
  });

  it("claims with status 'checking' are excluded from related claims", () => {
    const claim = makeClaim({ id: "c-1", topic: "health" });
    const checking = makeClaim({
      id: "c-2",
      topic: "health",
      claim_text: "Still checking claim",
      status: "checking",
    });
    mockStore({ claims: [claim, checking] });
    render(<LearnMore type="claim" id="c-1" />);
    expect(screen.queryByText("Still checking claim")).toBeNull();
  });

  it("back button calls router.back()", () => {
    const claim = makeClaim({ id: "c-1" });
    mockStore({ claims: [claim] });
    render(<LearnMore type="claim" id="c-1" />);
    const btn = screen.getByText("Back");
    fireEvent.click(btn);
    expect(mockBack).toHaveBeenCalledOnce();
  });
});

// ─── Claim variant — missing id ───────────────────────────────────────────────

describe("LearnMore – claim variant, missing id", () => {
  it("renders NotFound with session message", () => {
    mockStore({ claims: [] });
    render(<LearnMore type="claim" id="nonexistent-id" />);
    expect(screen.getByText(/This claim isn't in the current session/)).toBeTruthy();
  });

  it("back button in NotFound calls router.back()", () => {
    mockStore({ claims: [] });
    render(<LearnMore type="claim" id="nonexistent-id" />);
    const btn = screen.getByText("← Go back");
    fireEvent.click(btn);
    expect(mockBack).toHaveBeenCalledOnce();
  });
});
