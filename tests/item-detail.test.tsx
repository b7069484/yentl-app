import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker, SessionSource, Speaker } from "@/lib/types";
import type { DevilAdvocateState } from "@/lib/client/session-store";

// ─── Next.js navigation mocks ─────────────────────────────────────────────────

const mockPush = vi.fn();
const mockBack = vi.fn();
let mockSearchParamsRaw = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useSearchParams: () => mockSearchParamsRaw,
  usePathname: () => "/session/detail/claim/c-1",
}));

// ─── Session store mock ───────────────────────────────────────────────────────

const mockUpdateClaim = vi.fn();
const mockUpdateMarker = vi.fn();

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";

// ─── Clipboard mock ───────────────────────────────────────────────────────────

const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
});

// ─── fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "c-1",
    claim_text: "The earth is flat.",
    utterance_start: 60,
    utterance_end: 65,
    speaker_id: 0,
    topic: "science",
    topic_secondary: null,
    primary_label: "FALSE",
    score: 12,
    annotations: ["Contradicts NASA data.", "No credible sources support this."],
    explanation: "This is directly refuted by satellite imagery.",
    status: "confirmed",
    sources: [
      {
        url: "https://nasa.gov/article",
        domain: "nasa.gov",
        title: "Earth is Round: NASA Evidence",
        reputation_tier: "high",
        stance: "contradicts",
        excerpt: "Decades of satellite data confirm spherical Earth.",
      },
    ],
    ...overrides,
  };
}

function makeMarker(overrides: Partial<RhetoricMarker> = {}): RhetoricMarker {
  return {
    id: "m-1",
    type: "fallacy",
    name: "slippery-slope",
    display: "Slippery Slope",
    excerpt: "If we allow X, everything will collapse.",
    speaker_id: 0,
    start_time: 90,
    end_time: 95,
    severity: "clear",
    explanation:
      "The speaker assumes a chain of events without justification.",
    ...overrides,
  };
}

const defaultSpeakers: Speaker[] = [{ id: 0, label: "Speaker 1" }];
const defaultSource: SessionSource = { kind: "mic" };
const defaultDevilAdvocate: DevilAdvocateState = null;

// ─── Store mock helper ────────────────────────────────────────────────────────

function mockStore({
  title = "Yentl test session",
  startedAt = "2026-06-09T04:00:00.000Z",
  transcript = [] as Array<{ text: string }>,
  claims = [] as ClaimCard[],
  markers = [] as RhetoricMarker[],
  speakers = defaultSpeakers,
  source = defaultSource,
  devilAdvocate = defaultDevilAdvocate,
  synthesis = null,
  updateClaim = mockUpdateClaim,
  updateMarker = mockUpdateMarker,
} = {}) {
  const data = {
    title,
    startedAt,
    transcript,
    claims,
    markers,
    speakers,
    source,
    synthesis,
    devilAdvocate,
    updateClaim,
    updateMarker,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: typeof data) => unknown) => selector(data),
  );
}

// ─── Imports under test ───────────────────────────────────────────────────────
// Import after mocks are in place.

import { ItemDetail } from "@/components/session/item-detail";
import { sourceDetailId } from "@/components/session/source-detail";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPush.mockReset();
  mockBack.mockReset();
  mockUpdateClaim.mockReset();
  mockUpdateMarker.mockReset();
  mockFetch.mockReset();
  mockWriteText.mockReset();
  mockSearchParamsRaw = new URLSearchParams("");
  mockWriteText.mockResolvedValue(undefined);
  mockStore();
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("ItemDetail – rendering", () => {
  it("renders ClaimDetail content when type=claim and claim exists", () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    expect(screen.getByText(/The earth is flat/)).toBeTruthy();
  });

  it("renders claim document source position when present", () => {
    const claim = makeClaim({
      document_anchor: {
        kind: "paragraph",
        block_index: 1,
        paragraph_index: 1,
        line_start: 4,
        line_end: 6,
      },
    });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);

    expect(screen.getByText("Source position")).toBeTruthy();
    expect(screen.getByText("Paragraph 2 · lines 4-6")).toBeTruthy();
  });

  it("renders unresolved claim ownership without a said-by speaker shortcut", () => {
    const claim = makeClaim({
      ownership: {
        owner_speaker_id: null,
        attribution_status: "uncertain",
        attribution_reasons: ["quoted_or_reported_speech"],
        stance: "reported",
        confidence: 0.35,
        source_turn_ids: ["turn-1"],
        source_segment_ids: ["seg-1"],
      },
    });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);

    expect(
      screen.getAllByText((_, node) => node?.textContent === "Ownership uncertain · 01:00").length,
    ).toBeTruthy();
    expect(screen.queryByText("Said by")).toBeNull();
  });

  it("renders unsafe marker attribution without a said-by speaker shortcut", () => {
    const marker = makeMarker({
      attribution_status: "unsafe_overlap",
      attribution_reasons: ["competitive_interruption"],
      overlap_class: "competitive_interruption",
    });
    mockStore({ markers: [marker] });
    render(<ItemDetail type="marker" id="m-1" />);

    expect(
      screen.getByText((_, node) => node?.textContent === "Attribution unsafe overlap · 01:30"),
    ).toBeTruthy();
    expect(screen.queryByText("Said by")).toBeNull();
  });

  it("renders Devil's Advocate brief on populated claim detail", () => {
    const claim = makeClaim();
    mockStore({
      claims: [claim],
      devilAdvocate: {
        state: "fresh",
        at: 1_717_000_000_000,
        brief: {
          stance: "This conclusion is strong, but the source set may still be narrow.",
          strongest_counterarguments: [
            "The claim may depend on a local definition not captured by national sources.",
            "A newer correction could change the apparent contradiction.",
            "The wording may be imprecise rather than intentionally false.",
          ],
          weakest_assumption: "The weakest assumption is that the cited source fully captures the claim context.",
          questions: [
            "Was the original claim paraphrased?",
            "Is there a primary local record?",
          ],
          confidence: "medium",
          model: "xai/grok-4.1-fast-reasoning",
        },
      },
    });
    render(<ItemDetail type="claim" id="c-1" />);

    expect(screen.getByText("Devil's Advocate")).toBeTruthy();
    expect(screen.getByText(/source set may still be narrow/i)).toBeTruthy();
    expect(screen.getByText(/local definition not captured/i)).toBeTruthy();
    expect(screen.getByText(/Weakest assumption:/)).toBeTruthy();
    expect(screen.getByText(/primary local record/i)).toBeTruthy();
  });

  it("renders a comparative source dossier on claim detail", () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);

    expect(screen.getByTestId("source-dossier")).toBeTruthy();
    expect(screen.getByText("1 cited")).toBeTruthy();
    expect(screen.getByText("0 support / 1 contradict / 0 mixed")).toBeTruthy();
    expect(screen.getByText("1 high / 0 mid / 0 low")).toBeTruthy();
    expect(screen.getByText("0 validated / 1 missing")).toBeTruthy();
    expect(screen.getByText("0 linked / 1 not direct")).toBeTruthy();
    expect(screen.getByTestId("source-detail-link")).toHaveAttribute(
      "href",
      `/session/detail/source/${sourceDetailId("c-1", 0)}`,
    );
  });

  it("groups cited sources by stance with excerpt previews", () => {
    const claim = makeClaim({
      claim_text: "Large cohort data supports the vaccine safety finding.",
      sources: [
        {
          url: "https://blog.example/claim",
          domain: "blog.example",
          title: "Weak Blog Claim",
          reputation_tier: "low",
          stance: "supports",
          excerpt: "",
        },
        {
          url: "https://cdc.gov/study",
          domain: "cdc.gov",
          title: "CDC Safety Study",
          reputation_tier: "high",
          stance: "supports",
          excerpt: "Large cohort data supports the safety finding.",
          preview: {
            image_url: "https://cdc.gov/image.jpg",
            image_alt: "CDC chart",
            title: "CDC Safety Study",
            description: "Safety evidence",
            fetched_at: 1,
            image_status: "validated",
            image_source: "open_graph",
            image_final_url: "https://cdc.gov/image.jpg",
            image_content_type: "image/jpeg",
            image_dimensions: { width: 1200, height: 800 },
            validated_at: 1,
            unavailable_reason: null,
          },
        },
        {
          url: "https://audit.example/correction",
          domain: "audit.example",
          title: "Audit Correction",
          reputation_tier: "mid",
          stance: "contradicts",
          excerpt: "The correction disputes the date in the claim.",
        },
        {
          url: "https://local.example/context",
          domain: "local.example",
          title: "Local Context",
          reputation_tier: "low",
          stance: "mixed",
          excerpt: "Local notes support one part and complicate another.",
        },
      ],
    });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);

    const supports = screen.getByTestId("source-comparison-supports");
    const contradicts = screen.getByTestId("source-comparison-contradicts");
    const mixed = screen.getByTestId("source-comparison-mixed");
    const supportsText = supports.textContent ?? "";
    const highlightedTerms = Array.from(
      supports.querySelectorAll('[data-testid="source-excerpt-match"]'),
    ).map((node) => node.textContent);

    expect(supportsText).toContain("CDC Safety Study");
    expect(supportsText).toContain("Strongest");
    expect(supportsText).toContain("score 42");
    expect(supportsText).toContain("Large cohort data supports the safety finding.");
    expect(supportsText).toContain("image validated");
    expect(supportsText).toContain("Evidence: high reputation + excerpt + validated image");
    expect(supportsText).toContain("Evidence: low reputation + no excerpt + no image");
    expect(supportsText).toContain("Claim link: large, cohort, data, supports, safety");
    expect(supportsText).toContain("Claim link: no source excerpt to compare");
    expect(screen.getByText("1 linked / 3 not direct")).toBeTruthy();
    expect(highlightedTerms).toEqual(["Large", "cohort", "data", "supports", "safety"]);
    expect(supportsText.indexOf("CDC Safety Study")).toBeLessThan(
      supportsText.indexOf("Weak Blog Claim"),
    );
    expect(contradicts.textContent).toContain("Audit Correction");
    expect(contradicts.textContent).toContain("correction disputes the date");
    expect(mixed.textContent).toContain("Local Context");
    expect(mixed.textContent).toContain("complicate another");
  });

  it("renders MarkerDetail content when type=marker and marker exists", () => {
    const marker = makeMarker();
    mockStore({ markers: [marker] });
    render(<ItemDetail type="marker" id="m-1" />);
    expect(screen.getByText("Slippery Slope")).toBeTruthy();
  });

  it("renders SourceDetail content for a cited source", () => {
    const claim = makeClaim({
      claim_text: "Large cohort data supports the vaccine safety finding.",
      sources: [
        {
          url: "https://cdc.gov/study",
          domain: "cdc.gov",
          title: "CDC Safety Study",
          reputation_tier: "high",
          stance: "supports",
          excerpt: "Large cohort data supports the safety finding.",
          preview: {
            image_url: "https://cdc.gov/image.jpg",
            image_alt: "CDC chart",
            title: "CDC Safety Study",
            description: "Safety evidence",
            fetched_at: 1,
            image_status: "validated",
            image_source: "open_graph",
            image_final_url: "https://cdc.gov/image.jpg",
            image_content_type: "image/jpeg",
            image_dimensions: { width: 1200, height: 800 },
            validated_at: 1,
            unavailable_reason: null,
          },
        },
      ],
    });
    mockStore({ claims: [claim] });

    render(<ItemDetail type="source" id={sourceDetailId("c-1", 0)} />);

    const sourceDetail = screen.getByTestId("source-detail");
    expect(sourceDetail).toBeTruthy();
    expect(screen.getByText("Source detail 1")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "CDC Safety Study" })).toBeTruthy();
    expect(screen.getByText("Supports")).toBeTruthy();
    expect(screen.getByText("High reputation")).toBeTruthy();
    expect(screen.getByText("Evidence score 42")).toBeTruthy();
    expect(screen.getByText("high reputation + excerpt + validated image")).toBeTruthy();
    expect(screen.getByText("large, cohort, data, supports, safety")).toBeTruthy();
    expect(sourceDetail.textContent).toContain("Large cohort data supports the safety finding.");
    expect(sourceDetail.textContent).toContain("Large cohort data supports the vaccine safety finding.");
    expect(screen.getByAltText("CDC chart")).toBeTruthy();
    expect(screen.getByTestId("source-parent-claim-link")).toHaveAttribute(
      "href",
      "/session/detail/claim/c-1",
    );
  });

  it("navigates source detail back to its parent claim and across source siblings", () => {
    const claim = makeClaim({
      sources: [
        {
          url: "https://primary.example/study",
          domain: "primary.example",
          title: "Primary study",
          reputation_tier: "high",
          stance: "supports",
          excerpt: "Primary source excerpt.",
        },
        {
          url: "https://audit.example/correction",
          domain: "audit.example",
          title: "Audit correction",
          reputation_tier: "mid",
          stance: "mixed",
          excerpt: "Correction source excerpt.",
        },
      ],
    });
    mockStore({ claims: [claim] });

    render(<ItemDetail type="source" id={sourceDetailId("c-1", 0)} />);

    expect(screen.getByText("Parent claim")).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy();

    fireEvent.click(screen.getByTestId("detail-back-btn"));
    expect(mockPush).toHaveBeenCalledWith("/session/detail/claim/c-1");

    fireEvent.click(screen.getByTestId("detail-next-btn"));
    expect(mockPush).toHaveBeenCalledWith(
      `/session/detail/source/${sourceDetailId("c-1", 1)}`,
    );
  });

  it("renders NotFound when claim id is not in store", () => {
    mockStore({ claims: [] });
    render(<ItemDetail type="claim" id="nonexistent" />);
    expect(screen.getByText(/This item isn/)).toBeTruthy();
  });

  it("renders NotFound when marker id is not in store", () => {
    mockStore({ markers: [] });
    render(<ItemDetail type="marker" id="nonexistent" />);
    expect(screen.getByText(/This item isn/)).toBeTruthy();
  });

  it("renders NotFound when source detail id is not in store", () => {
    mockStore({ claims: [makeClaim({ sources: [] })] });
    render(<ItemDetail type="source" id={sourceDetailId("c-1", 0)} />);
    expect(screen.getByText(/This item isn/)).toBeTruthy();
  });

  it("NotFound back button calls router.back()", () => {
    mockStore({ claims: [] });
    render(<ItemDetail type="claim" id="nonexistent" />);
    const btn = screen.getByText("← Go back");
    fireEvent.click(btn);
    expect(mockBack).toHaveBeenCalledOnce();
  });

  it("returns source-block claim details to the exact source review block", () => {
    mockSearchParamsRaw = new URLSearchParams("from=source%3Ablock%3A1");
    const c1 = makeClaim({
      id: "c-1",
      utterance_start: 30,
      document_anchor: { kind: "paragraph", block_index: 1, paragraph_index: 1 },
    });
    const c2 = makeClaim({
      id: "c-2",
      utterance_start: 20,
      document_anchor: { kind: "paragraph", block_index: 1, paragraph_index: 1 },
    });
    const c3 = makeClaim({
      id: "c-3",
      utterance_start: 10,
      document_anchor: { kind: "paragraph", block_index: 0, paragraph_index: 0 },
    });

    mockStore({ claims: [c1, c2, c3] });
    render(<ItemDetail type="claim" id="c-1" />);

    expect(screen.getByText("Source block 2")).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy();

    fireEvent.click(screen.getByTestId("detail-back-btn"));
    expect(mockPush).toHaveBeenCalledWith("/session?view=source&block=1");
    expect(mockBack).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(mockPush).toHaveBeenCalledWith(
      "/session/detail/claim/c-2?from=source%3Ablock%3A1",
    );
  });
});

// ─── Mobile tap targets ──────────────────────────────────────────────────────

describe("ItemDetail – mobile detail tap targets", () => {
  it("keeps claim detail chrome, actions, and footer links at the mobile tap-target minimum", () => {
    const c1 = makeClaim({ id: "c-1", utterance_start: 20 });
    const c2 = makeClaim({ id: "c-2", utterance_start: 10 });
    mockStore({ claims: [c1, c2] });

    render(<ItemDetail type="claim" id="c-1" />);

    expect(screen.getByTestId("detail-back-btn").className).toContain("min-h-11");
    expect(screen.getByTestId("detail-next-btn").className).toContain("min-h-11");

    for (const button of screen.getAllByTestId("detail-action-btn")) {
      expect(button.className).toContain("min-h-11");
    }

    expect(screen.getByTestId("claim-transcript-link").className).toContain("min-h-11");
    expect(screen.getByTestId("claim-learn-link").className).toContain("min-h-11");
  });

  it("keeps marker detail chrome, actions, and footer link at the mobile tap-target minimum", () => {
    const m1 = makeMarker({ id: "m-1", start_time: 90 });
    const m2 = makeMarker({ id: "m-2", start_time: 30 });
    mockStore({ markers: [m1, m2] });

    render(<ItemDetail type="marker" id="m-1" />);

    expect(screen.getByTestId("detail-back-btn").className).toContain("min-h-11");
    expect(screen.getByTestId("detail-next-btn").className).toContain("min-h-11");

    for (const button of screen.getAllByTestId("detail-action-btn")) {
      expect(button.className).toContain("min-h-11");
    }

    expect(screen.getByTestId("marker-learn-link").className).toContain("min-h-11");
  });

  it("keeps the missing-item return control at the mobile tap-target minimum", () => {
    mockStore({ claims: [] });
    render(<ItemDetail type="claim" id="nonexistent" />);
    expect(screen.getByTestId("detail-notfound-back-btn").className).toContain("min-h-11");
  });
});

// ─── Keyboard navigation ──────────────────────────────────────────────────────

describe("ItemDetail – keyboard navigation", () => {
  it("ArrowUp key calls router.push for prev sibling", () => {
    const c1 = makeClaim({ id: "c-1", utterance_start: 20 });
    const c2 = makeClaim({ id: "c-2", utterance_start: 10 });
    // "recent" sort: [c-1, c-2]; c-1 is first (prev=null), c-2 has prev=c-1
    mockStore({ claims: [c1, c2] });
    render(<ItemDetail type="claim" id="c-2" />);
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/session/detail/claim/c-1"),
    );
  });

  it("ArrowDown key calls router.push for next sibling", () => {
    const c1 = makeClaim({ id: "c-1", utterance_start: 20 });
    const c2 = makeClaim({ id: "c-2", utterance_start: 10 });
    // pool: [c-1, c-2]; c-1 has next=c-2
    mockStore({ claims: [c1, c2] });
    render(<ItemDetail type="claim" id="c-1" />);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/session/detail/claim/c-2"),
    );
  });

  it("Escape key calls router.back()", () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockBack).toHaveBeenCalledOnce();
  });

  it("ArrowUp does nothing when at first sibling (no prev)", () => {
    const claim = makeClaim({ id: "c-1" });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ArrowDown does nothing when at last sibling (no next)", () => {
    const claim = makeClaim({ id: "c-1" });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ─── ConfBar ─────────────────────────────────────────────────────────────────

describe("ClaimDetail – ConfBar", () => {
  it("uses locked user-facing verdict copy", () => {
    const claim = makeClaim({ primary_label: "UNVERIFIABLE" });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    expect(screen.getByText("No reliable backing")).toBeTruthy();
  });

  it("fills proportionally to score", () => {
    const claim = makeClaim({ score: 75 });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeTruthy();
    // The inner fill div carries the width style
    const inner = bar.firstElementChild as HTMLElement;
    expect(inner?.style.width).toBe("75%");
  });

  it("clamps score at 100%", () => {
    const claim = makeClaim({ score: 150 });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    const bar = screen.getByRole("progressbar");
    const inner = bar.firstElementChild as HTMLElement;
    expect(inner?.style.width).toBe("100%");
  });

  it("clamps score at 0%", () => {
    const claim = makeClaim({ score: -20 });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    const bar = screen.getByRole("progressbar");
    const inner = bar.firstElementChild as HTMLElement;
    expect(inner?.style.width).toBe("0%");
  });
});

// ─── Evidence status panel ───────────────────────────────────────────────────

describe("ClaimDetail – evidence status", () => {
  it("explains no reliable backing without treating the claim as false", () => {
    const claim = makeClaim({
      primary_label: "UNVERIFIABLE",
      score: 50,
      sources: [],
    });
    mockStore({ claims: [claim] });

    render(<ItemDetail type="claim" id="c-1" />);

    const panel = screen.getByTestId("evidence-status-panel");
    expect(panel.textContent).toContain("Evidence status");
    expect(panel.textContent).toContain("No reliable backing found");
    expect(panel.textContent).toContain("did not return reliable source backing");
    expect(panel.textContent).toContain("not the same as saying the claim is false");
    expect(panel.textContent).toContain("0 cited sources");
  });

  it("shows a still-checking evidence state before source verification finishes", () => {
    const claim = makeClaim({
      status: "checking",
      primary_label: "UNVERIFIABLE",
      sources: [],
    });
    mockStore({ claims: [claim] });

    render(<ItemDetail type="claim" id="c-1" />);

    const panel = screen.getByTestId("evidence-status-panel");
    expect(panel.textContent).toContain("Still checking sources");
    expect(panel.textContent).toContain("In progress");
    expect(panel.textContent).toContain("source verification has not finished");
  });

  it("shows a retry recovery state for interrupted verification", () => {
    const claim = makeClaim({
      status: "provisional",
      primary_label: "UNVERIFIABLE",
      score: 0,
      annotations: ["Verification interrupted"],
      explanation: "Wait about 9 seconds before trying again.",
      sources: [],
    });
    mockStore({ claims: [claim] });

    render(<ItemDetail type="claim" id="c-1" />);

    const panel = screen.getByTestId("evidence-status-panel");
    expect(panel.textContent).toContain("Verification needs retry");
    expect(panel.textContent).toContain("Recovery");
    expect(panel.textContent).toContain("verification call did not complete");
    expect(panel.textContent).toContain("0 cited sources");
    expect(screen.getByText("Wait about 9 seconds before trying again.")).toBeTruthy();
  });

  it("summarizes support, contradiction, and mixed cited-source balance", () => {
    const claim = makeClaim({
      primary_label: "PARTIAL",
      sources: [
        {
          url: "https://example.gov/support",
          domain: "example.gov",
          title: "Support source",
          reputation_tier: "high",
          stance: "supports",
        },
        {
          url: "https://example.org/contradict",
          domain: "example.org",
          title: "Contradiction source",
          reputation_tier: "mid",
          stance: "contradicts",
        },
        {
          url: "https://example.com/mixed",
          domain: "example.com",
          title: "Mixed source",
          reputation_tier: "low",
          stance: "mixed",
        },
      ],
    });
    mockStore({ claims: [claim] });

    render(<ItemDetail type="claim" id="c-1" />);

    const panel = screen.getByTestId("evidence-status-panel");
    expect(panel.textContent).toContain("Mixed or caveated evidence");
    expect(panel.textContent).toContain("3 cited sources: 1 support / 1 contradict / 1 mixed");
  });
});

// ─── Re-check button ──────────────────────────────────────────────────────────

describe("ClaimDetail – Re-check", () => {
  it("clicking Re-check sends source and claim context, then updates the claim", async () => {
    const claim = makeClaim({
      speaker_id: null,
      stance: "reported",
      ownership: {
        owner_speaker_id: 0,
        attribution_status: "probable",
        attribution_reasons: ["quoted_or_reported_speech"],
        stance: "reported",
        confidence: 0.74,
        source_turn_ids: ["turn-1"],
        source_segment_ids: ["seg-1"],
      },
      document_anchor: {
        kind: "paragraph",
        block_index: 2,
        paragraph_index: 2,
        line_start: 8,
        line_end: 9,
      },
      source_context: "The quick-check note says this claim is about Springfield, not Shelbyville.",
    });
    mockStore({
      claims: [claim],
      source: {
        kind: "text_doc",
        filename: "briefing.txt",
        mime: "text/plain",
        byte_count: 124,
        intent: "document",
        initial_text: "Opening paragraph about the subject.\n\nA second paragraph gives more source detail.",
      },
    });

    const patchData = {
      primary_label: "TRUE",
      score: 90,
      annotations: ["Updated annotation"],
      explanation: "Updated explanation",
      sources: [],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => patchData,
    });

    render(<ItemDetail type="claim" id="c-1" />);
    const btn = screen.getByText("Re-check");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/verify-confirmed",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body.claim_text).toBe(claim.claim_text);
    expect(body.source_context).toContain("source type: text_doc");
    expect(body.source_context).toContain("filename: briefing.txt");
    expect(body.source_context).toContain("document overview");
    expect(body.source_context).toContain("CLAIM_SOURCE_CONTEXT");
    expect(body.source_context).toContain("Springfield, not Shelbyville");
    expect(body.claim_context).toEqual({
      speaker_id: 0,
      topic: "science",
      stance: "reported",
      attribution_status: "probable",
      attribution_reasons: ["quoted_or_reported_speech"],
    });

    await waitFor(() => {
      expect(mockUpdateClaim).toHaveBeenCalledWith(
        "c-1",
        expect.objectContaining({ status: "confirmed" }),
      );
    });
  });

  it("Re-check button is disabled when claim.status is 'checking'", () => {
    const claim = makeClaim({ status: "checking" });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    const btn = screen.getByText("Re-check") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ─── Dispute buttons ──────────────────────────────────────────────────────────

describe("ClaimDetail – Dispute button", () => {
  it("marks a claim for human review", () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Dispute" }));

    expect(mockUpdateClaim).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({
        review: expect.objectContaining({
          status: "disputed",
          reason: "user_dispute",
          note: expect.stringContaining("User disputed this claim result"),
          at: expect.any(Number),
        }),
      }),
    );
  });

  it("shows an existing claim review flag and disables duplicate dispute", () => {
    const claim = makeClaim({
      review: {
        status: "disputed",
        reason: "user_dispute",
        note: "Needs human review before use.",
        at: 1_717_000_000_000,
      },
    });
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);

    const panel = screen.getByTestId("review-flag-panel");
    expect(panel.textContent).toContain("Human review");
    expect(panel.textContent).toContain("Claim disputed");
    expect(panel.textContent).toContain("Needs human review before use.");

    const button = screen.getByRole("button", { name: "Marked for review" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.title).toContain("already marked");
  });
});

describe("MarkerDetail – Dispute button", () => {
  it("marks a marker for human review", () => {
    const marker = makeMarker();
    mockStore({ markers: [marker] });
    render(<ItemDetail type="marker" id="m-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Dispute" }));

    expect(mockUpdateMarker).toHaveBeenCalledWith(
      "m-1",
      expect.objectContaining({
        review: expect.objectContaining({
          status: "disputed",
          reason: "user_dispute",
          note: expect.stringContaining("User disputed this marker"),
          at: expect.any(Number),
        }),
      }),
    );
  });

  it("shows an existing marker review flag and disables duplicate dispute", () => {
    const marker = makeMarker({
      review: {
        status: "disputed",
        reason: "user_dispute",
        note: "Pattern needs human review before use.",
        at: 1_717_000_000_000,
      },
    });
    mockStore({ markers: [marker] });
    render(<ItemDetail type="marker" id="m-1" />);

    const panel = screen.getByTestId("review-flag-panel");
    expect(panel.textContent).toContain("Marker disputed");
    expect(panel.textContent).toContain("Pattern needs human review before use.");

    const button = screen.getByRole("button", { name: "Marked for review" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});

// ─── Save / Export buttons ───────────────────────────────────────────────────

describe("ClaimDetail – save and export actions", () => {
  it("Save button opens the local snapshot dialog", async () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Save session snapshot")).toBeTruthy();
    expect(screen.getByText(/This snapshot includes/i)).toBeTruthy();
  });

  it("Export button opens the session export dialog", async () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByText("Export this session")).toBeTruthy();
    expect(screen.getByText("Preview report")).toBeTruthy();
  });
});

// ─── Share button ─────────────────────────────────────────────────────────────

describe("ClaimDetail – Share button", () => {
  it("Share button writes URL to clipboard", async () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    const btn = screen.getByText("Share");
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining("/session/detail/claim/c-1"),
      );
    });
  });

  it("Share button preserves validation context in claim URLs", async () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=media_playback_sync&title=Fixture%20clip",
    );
    const claim = makeClaim();
    mockStore({ claims: [claim] });

    render(<ItemDetail type="claim" id="c-1" />);
    fireEvent.click(screen.getByText("Share"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining(
          "/session/detail/claim/c-1?demo=validation&sample=media_playback_sync&title=Fixture+clip",
        ),
      );
    });
  });

  it("Share button preserves validation context in marker URLs", async () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=media_playback_sync&title=Fixture%20clip",
    );
    const marker = makeMarker({ id: "m-1" });
    mockStore({ markers: [marker] });

    render(<ItemDetail type="marker" id="m-1" />);
    fireEvent.click(screen.getByText("Share"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining(
          "/session/detail/marker/m-1?demo=validation&sample=media_playback_sync&title=Fixture+clip",
        ),
      );
    });
  });
});

// ─── Footer links ─────────────────────────────────────────────────────────────

describe("ClaimDetail – footer links", () => {
  it("'See in transcript context' link has correct href", () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    const link = screen.getByText("See in transcript context →") as HTMLAnchorElement;
    expect(link.href).toContain("/session");
    expect(link.href).toContain("claim-c-1");
  });

  it("preserves validation context on claim learn links", () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=media_playback_sync&title=Fixture%20clip",
    );
    const claim = makeClaim();
    mockStore({ claims: [claim] });

    render(<ItemDetail type="claim" id="c-1" />);

    expect(screen.getByTestId("claim-learn-link")).toHaveAttribute(
      "href",
      "/session/learn/claim/c-1?demo=validation&sample=media_playback_sync&title=Fixture+clip",
    );
  });

  it("preserves validation context on marker learn links", () => {
    mockSearchParamsRaw = new URLSearchParams(
      "demo=validation&sample=media_playback_sync&title=Fixture%20clip",
    );
    const marker = makeMarker({ id: "m-1", name: "slippery_slope" });
    mockStore({ markers: [marker] });

    render(<ItemDetail type="marker" id="m-1" />);

    expect(screen.getByTestId("marker-learn-link")).toHaveAttribute(
      "href",
      "/session/learn/marker/slippery_slope?demo=validation&sample=media_playback_sync&title=Fixture+clip",
    );
  });
});
