import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker, Speaker } from "@/lib/types";

// ─── Next.js navigation mocks ─────────────────────────────────────────────────

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/session/detail/claim/c-1",
}));

// ─── Session store mock ───────────────────────────────────────────────────────

const mockUpdateClaim = vi.fn();

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

// ─── Store mock helper ────────────────────────────────────────────────────────

function mockStore({
  claims = [] as ClaimCard[],
  markers = [] as RhetoricMarker[],
  speakers = defaultSpeakers,
  updateClaim = mockUpdateClaim,
} = {}) {
  const data = { claims, markers, speakers, updateClaim };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: typeof data) => unknown) => selector(data),
  );
}

// ─── Imports under test ───────────────────────────────────────────────────────
// Import after mocks are in place.

import { ItemDetail } from "@/components/session/item-detail";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPush.mockReset();
  mockBack.mockReset();
  mockUpdateClaim.mockReset();
  mockFetch.mockReset();
  mockWriteText.mockReset();
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

  it("renders MarkerDetail content when type=marker and marker exists", () => {
    const marker = makeMarker();
    mockStore({ markers: [marker] });
    render(<ItemDetail type="marker" id="m-1" />);
    expect(screen.getByText("Slippery Slope")).toBeTruthy();
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

  it("NotFound back button calls router.back()", () => {
    mockStore({ claims: [] });
    render(<ItemDetail type="claim" id="nonexistent" />);
    const btn = screen.getByText("← Go back");
    fireEvent.click(btn);
    expect(mockBack).toHaveBeenCalledOnce();
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

// ─── Re-check button ──────────────────────────────────────────────────────────

describe("ClaimDetail – Re-check", () => {
  it("clicking Re-check calls fetch /api/verify-confirmed and then updateClaim", async () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });

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
          body: JSON.stringify({ claim_text: claim.claim_text }),
        }),
      );
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

// ─── Dispute button ───────────────────────────────────────────────────────────

describe("ClaimDetail – Dispute button", () => {
  it("Dispute button is disabled", () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    const btn = screen.getByText("Dispute · coming soon") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("Dispute button has tooltip text about v2", () => {
    const claim = makeClaim();
    mockStore({ claims: [claim] });
    render(<ItemDetail type="claim" id="c-1" />);
    const btn = screen.getByTitle(/dispute workflow/i);
    expect(btn).toBeTruthy();
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
});
