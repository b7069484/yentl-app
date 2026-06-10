import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker } from "@/lib/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
let mockSearchParamsRaw = new URLSearchParams("view=claims");
const mockPathname = "/session";
const mockDownloadFile = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParamsRaw,
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/lib/client/export-actions", () => ({
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
  fileSafe: (value: string) => (value || "yentl-session").replace(/[^\w-]+/g, "_").slice(0, 60),
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
  title?: string;
  source?: { kind: "mic" | "youtube" | "text_doc"; title?: string; url?: string; filename?: string };
  claims?: ClaimCard[];
  markers?: RhetoricMarker[];
  speakers?: { id: number; label: string }[];
}) {
  const data = {
    title: state.title ?? "Council clip",
    source: state.source ?? { kind: "mic" as const },
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
  mockDownloadFile.mockReset();
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
      makeMarker({ name: "slippery_slope", display: "Slippery Slope", excerpt: "If we allow X then..." }),
    ];
    mockStore({ markers });

    render(<FilteredList />);
    expect(screen.getByText("Slippery Slope")).toBeTruthy();
    expect(screen.getByText("Fallacy")).toBeTruthy();
    expect(screen.getByText("Watch for:")).toBeTruthy();
    expect(screen.getByText(/next it'll be Y/)).toBeTruthy();
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

  it("excludes checking claims by default", () => {
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

  it("shows checking claims when the status filter asks for them", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&status=checking");
    const claims = [
      makeClaim({
        claim_text: "Checking claim visible.",
        status: "checking",
      }),
      makeClaim({
        claim_text: "Confirmed claim hidden by status filter.",
        status: "confirmed",
      }),
    ];
    mockStore({ claims });

    render(<FilteredList />);
    expect(screen.getByText(/Checking claim visible/)).toBeTruthy();
    expect(screen.getByText("Status: Still checking")).toBeTruthy();
    expect(screen.queryByText(/Confirmed claim hidden/)).toBeNull();
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

describe("FilteredList – export current list", () => {
  it("exports the filtered claims list as Markdown", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&verdict=false");
    mockStore({
      title: "Budget hearing",
      source: { kind: "youtube", title: "Council hearing", url: "https://youtu.be/abc" },
      claims: [
        makeClaim({
          id: "false-claim",
          claim_text: "The city doubled transit spending.",
          primary_label: "FALSE",
          score: 12,
          status: "confirmed",
          sources: [
            {
              title: "Budget table",
              url: "https://example.com/budget",
              domain: "example.com",
              reputation_tier: "high",
              stance: "contradicts",
            },
          ],
        }),
        makeClaim({
          id: "true-claim",
          claim_text: "This true claim should not export.",
          primary_label: "TRUE",
          status: "confirmed",
        }),
      ],
    });

    render(<FilteredList />);

    fireEvent.click(screen.getByRole("button", { name: "Export filtered claims" }));
    fireEvent.click(screen.getByRole("button", { name: "Markdown" }));

    expect(mockDownloadFile).toHaveBeenCalledOnce();
    const [filename, content, type] = mockDownloadFile.mock.calls[0];
    expect(filename).toBe("Budget_hearing-claims.md");
    expect(type).toBe("text/markdown");
    expect(content).toContain("# All FALSE claims");
    expect(content).toContain("The city doubled transit spending.");
    expect(content).toContain("Review status: Confirmed");
    expect(content).toContain("Budget table");
    expect(content).toContain("Methodology: https://yentl.it/methodology");
    expect(content).not.toContain("This true claim should not export.");
  });

  it("exports the filtered markers list as JSON", () => {
    mockSearchParamsRaw = new URLSearchParams("view=markers&type=fallacy");
    mockStore({
      title: "Debate analysis",
      markers: [
        makeMarker({
          id: "fallacy-marker",
          type: "fallacy",
          display: "False Dilemma",
        }),
        makeMarker({
          id: "rhetoric-marker",
          type: "rhetoric",
          display: "Loaded language",
        }),
      ],
    });

    render(<FilteredList />);

    fireEvent.click(screen.getByRole("button", { name: "Export filtered markers" }));
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));

    expect(mockDownloadFile).toHaveBeenCalledOnce();
    const [filename, content, type] = mockDownloadFile.mock.calls[0];
    expect(filename).toBe("Debate_analysis-markers.json");
    expect(type).toBe("application/json");
    const payload = JSON.parse(content as string);
    expect(payload.view).toBe("markers");
    expect(payload.filter_title).toBe("All Fallacy markers");
    expect(payload.item_count).toBe(1);
    expect(payload.items[0].id).toBe("fallacy-marker");
    expect(JSON.stringify(payload)).not.toContain("rhetoric-marker");
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

  it("shows 'Provisional claims' with status=provisional", () => {
    mockSearchParamsRaw = new URLSearchParams("view=claims&status=provisional");
    mockStore({});

    render(<FilteredList />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Provisional claims",
    );
  });
});
