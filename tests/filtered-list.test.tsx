import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker } from "@/lib/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
let mockSearchParamsRaw = new URLSearchParams("view=claims");
const mockPathname = "/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParamsRaw,
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";
import { FilteredList } from "@/components/session/filtered-list";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "c-" + Math.random(),
    claim_text: "Some claim text",
    utterance_start: 10,
    utterance_end: 20,
    speaker_id: 0,
    topic: "politics",
    topic_secondary: null,
    primary_label: "FALSE",
    score: 20,
    annotations: [],
    explanation: "",
    status: "confirmed",
    sources: [],
    ...overrides,
  };
}

function makeMarker(overrides: Partial<RhetoricMarker> = {}): RhetoricMarker {
  return {
    id: "m-" + Math.random(),
    type: "fallacy",
    name: "slippery-slope",
    display: "Slippery Slope",
    excerpt: "If we allow X then...",
    speaker_id: 0,
    start_time: 15,
    end_time: 20,
    severity: "clear",
    explanation: "",
    ...overrides,
  };
}

// ─── Mock store helper ────────────────────────────────────────────────────────

function mockStore(state: {
  claims?: ClaimCard[];
  markers?: RhetoricMarker[];
  speakers?: { id: number; label: string }[];
}) {
  const data = {
    claims: state.claims ?? [],
    markers: state.markers ?? [],
    speakers: state.speakers ?? [],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: typeof data) => unknown) => selector(data),
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPush.mockReset();
  mockSearchParamsRaw = new URLSearchParams("view=claims");
  mockStore({});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FilteredList – claims view", () => {
  it("renders claim rows when view=claims with claims in store", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims");
    const claims = [
      makeClaim({ claim_text: "The sky is falling.", status: "confirmed" }),
    ];
    mockStore({ claims });

    render(<FilteredList />);
    expect(screen.getByText(/The sky is falling/)).toBeTruthy();
  });

  it("links claim rows to the real detail route and preserves filter context", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&verdict=false&speaker=0&sort=score");
    const claims = [
      makeClaim({
        id: "claim-123",
        claim_text: "The sky is falling.",
        primary_label: "FALSE",
        status: "confirmed",
      }),
    ];
    mockStore({
      claims,
      speakers: [{ id: 0, label: "Speaker 1" }],
    });

    render(<FilteredList />);
    const link = screen.getByText(/The sky is falling/).closest("a");
    expect(link?.getAttribute("href")).toBe(
      "/session/detail/claim/claim-123?from=verdict%3Afalse%7Cspeaker%3A0%7Csort%3Ascore",
    );
  });

  it("shows breadcrumb 'Claims' for claims view", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims");
    mockStore({});

    render(<FilteredList />);
    expect(screen.getByText("Claims")).toBeTruthy();
  });

  it("renders 'All claims' title when no filters", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims");
    mockStore({});

    render(<FilteredList />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "All claims",
    );
  });
});

describe("FilteredList – markers view", () => {
  it("renders marker rows when view=markers", () => {
    mockSearchParamsRaw = new URLSearchParams("view=markers");
    const markers = [
      makeMarker({ display: "Slippery Slope", excerpt: "If we allow X then..." }),
    ];
    mockStore({ markers });

    render(<FilteredList />);
    expect(screen.getByText("Slippery Slope")).toBeTruthy();
  });

  it("links marker rows to the real detail route and preserves filter context", () => {
    mockSearchParamsRaw = new URLSearchParams("view=markers&type=fallacy&severity=clear&sort=severity");
    const markers = [
      makeMarker({
        id: "marker-123",
        display: "Slippery Slope",
        type: "fallacy",
        severity: "clear",
      }),
    ];
    mockStore({ markers });

    render(<FilteredList />);
    const link = screen.getByText("Slippery Slope").closest("a");
    expect(link?.getAttribute("href")).toBe(
      "/session/detail/marker/marker-123?from=type%3Afallacy%7Cseverity%3Aclear%7Csort%3Aseverity",
    );
  });

  it("shows breadcrumb 'Markers' for markers view", () => {
    mockSearchParamsRaw = new URLSearchParams("view=markers");
    mockStore({});

    render(<FilteredList />);
    expect(screen.getByText("Markers")).toBeTruthy();
  });
});

describe("FilteredList – filtering", () => {
  it("shows only claims matching verdict filter", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&verdict=false");
    const claims = [
      makeClaim({
        id: "c1",
        claim_text: "False claim here.",
        primary_label: "FALSE",
        status: "confirmed",
      }),
      makeClaim({
        id: "c2",
        claim_text: "True claim here.",
        primary_label: "TRUE",
        status: "confirmed",
      }),
    ];
    mockStore({ claims });

    render(<FilteredList />);
    expect(screen.getByText(/False claim here/)).toBeTruthy();
    expect(screen.queryByText(/True claim here/)).toBeNull();
  });

  it("excludes checking claims always", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims");
    const claims = [
      makeClaim({
        claim_text: "Checking claim.",
        status: "checking",
      }),
    ];
    mockStore({ claims });

    render(<FilteredList />);
    expect(screen.queryByText(/Checking claim/)).toBeNull();
  });
});

describe("FilteredList – sort change → URL push", () => {
  it("sort dropdown change pushes URL with sort param", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims");
    mockStore({ claims: [makeClaim()] });

    render(<FilteredList />);

    // Find the Sort dropdown button (shows current sort label)
    const sortBtn = screen.getByText("Most recent");
    fireEvent.click(sortBtn);

    // Find "By score" option in the dropdown
    const scoreOpt = screen.getByText("By score");
    fireEvent.click(scoreOpt);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("sort=score"),
    );
  });
});

describe("FilteredList – filter chip interactions", () => {
  it("active verdict filter shows chip without key prefix and X removes it", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&verdict=false");
    mockStore({});

    render(<FilteredList />);

    // Chip shows just the value, no "Verdict:" prefix
    const chip = screen.getByText("FALSE");
    expect(chip).toBeTruthy();

    // Find remove button (aria-label still references the label text)
    const removeBtn = screen.getByLabelText(/Remove FALSE/i);
    fireEvent.click(removeBtn);

    // Should push URL without verdict
    expect(mockPush).toHaveBeenCalledWith(
      expect.not.stringContaining("verdict"),
    );
  });
});

describe("FilteredList – empty state", () => {
  it("renders empty state when no claims match filters", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&verdict=false");
    // Only TRUE claims — none match FALSE filter
    const claims = [
      makeClaim({ primary_label: "TRUE", status: "confirmed" }),
    ];
    mockStore({ claims });

    render(<FilteredList />);
    expect(screen.getByText("No matches.")).toBeTruthy();
    expect(screen.getByText(/Try removing a filter/)).toBeTruthy();
  });

  it("renders empty state when 0 markers match filters", () => {
    mockSearchParamsRaw = new URLSearchParams("view=markers&type=rhetoric");
    // Only fallacy markers — none match rhetoric filter
    const markers = [makeMarker({ type: "fallacy" })];
    mockStore({ markers });

    render(<FilteredList />);
    expect(screen.getByText("No matches.")).toBeTruthy();
  });
});

describe("FilteredList – title reflects active filters", () => {
  it("shows 'All FALSE claims' with verdict=false", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&verdict=false");
    mockStore({});

    render(<FilteredList />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "All FALSE claims",
    );
  });

  it("shows 'All claims by Speaker 1' with speaker=0 filter", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&speaker=0");
    mockStore({
      speakers: [{ id: 0, label: "Speaker 1" }],
    });

    render(<FilteredList />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "All claims by Speaker 1",
    );
  });
});
