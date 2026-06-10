import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SynthesisCard, ageLabel } from "@/components/session/synthesis-card";
import type { SynthesisState } from "@/lib/client/session-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEADLINES = ["5 fallacies detected", "70% verified", "Climate dominates"];

function freshSynthesis(overrides?: Partial<{ at: number }>): SynthesisState {
  return {
    state: "fresh",
    text: "Yentl sees a pattern of misdirection here.",
    headlines: HEADLINES,
    at: overrides?.at ?? Date.now(),
  };
}

function noop() {}

// ─── 1. null → renders nothing ────────────────────────────────────────────────

describe("SynthesisCard – null state", () => {
  it("returns null when synthesis is null", () => {
    const { container } = render(
      <SynthesisCard synthesis={null} onHeadlineClick={noop} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

// ─── 2. warming → skeleton ────────────────────────────────────────────────────

describe("SynthesisCard – warming state", () => {
  const synthesis: SynthesisState = { state: "warming", at: Date.now() };

  it("renders the card with animate-pulse shimmer lines", () => {
    const { container } = render(
      <SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />,
    );
    const pulseEls = container.querySelectorAll(".animate-pulse");
    expect(pulseEls.length).toBeGreaterThan(0);
  });

  it('heading reads "Yentl is building the read…"', () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Yentl is building the read…")).toBeTruthy();
  });

  it("does NOT render a refresh button", () => {
    render(
      <SynthesisCard
        synthesis={synthesis}
        onHeadlineClick={noop}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /refresh/i })).toBeNull();
  });
});

// ─── 3. fresh → paragraph + 3 headlines + refresh button ─────────────────────

describe("SynthesisCard – fresh state", () => {
  it("renders the synthesis paragraph text", () => {
    render(<SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={noop} />);
    expect(
      screen.getByText("Yentl sees a pattern of misdirection here."),
    ).toBeTruthy();
  });

  it("labels the card as Yentl Opinion", () => {
    render(<SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={noop} />);
    expect(screen.getByText(/Yentl Opinion/)).toBeTruthy();
  });

  it("renders 3 headline buttons", () => {
    render(
      <SynthesisCard
        synthesis={freshSynthesis()}
        onHeadlineClick={noop}
        onRefresh={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    // headline buttons + refresh button + mobile toggle = 5; at least 3 are headlines
    const headlineButtons = buttons.filter((b) =>
      HEADLINES.some((h) => b.textContent?.includes(h)),
    );
    expect(headlineButtons.length).toBe(3);
  });

  it("renders a refresh button when onRefresh is provided", () => {
    render(
      <SynthesisCard
        synthesis={freshSynthesis()}
        onHeadlineClick={noop}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /refresh/i })).toBeTruthy();
  });
});

// ─── 4. headline button click ─────────────────────────────────────────────────

describe("SynthesisCard – headline click", () => {
  it("calls onHeadlineClick with the headline string and index 0", () => {
    const onHeadlineClick = vi.fn();
    render(
      <SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={onHeadlineClick} />,
    );
    const headlineBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes(HEADLINES[0]))!;
    fireEvent.click(headlineBtn);
    expect(onHeadlineClick).toHaveBeenCalledWith(HEADLINES[0], 0);
  });
});

// ─── 5. refresh button click ──────────────────────────────────────────────────

describe("SynthesisCard – refresh click", () => {
  it("calls onRefresh when the refresh button is clicked", () => {
    const onRefresh = vi.fn();
    render(
      <SynthesisCard
        synthesis={freshSynthesis()}
        onHeadlineClick={noop}
        onRefresh={onRefresh}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

// ─── 6. refreshing → animate-spin on icon + prior text visible ───────────────

describe("SynthesisCard – refreshing state", () => {
  const synthesis: SynthesisState = {
    state: "refreshing",
    text: "Yentl sees a pattern of misdirection here.",
    headlines: HEADLINES,
    at: Date.now(),
  };

  it("refresh icon has animate-spin class", () => {
    const { container } = render(
      <SynthesisCard synthesis={synthesis} onHeadlineClick={noop} onRefresh={vi.fn()} />,
    );
    const spinIcon = container.querySelector(".animate-spin");
    expect(spinIcon).not.toBeNull();
  });

  it("still shows the prior paragraph text", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(
      screen.getByText("Yentl sees a pattern of misdirection here."),
    ).toBeTruthy();
  });

  it("marks the meta-read as updating while checking when verdicts exist", () => {
    render(
      <SynthesisCard
        synthesis={{
          ...synthesis,
          per_speaker_verdicts: [
            {
              speaker_id: 0,
              label: "Alice",
              factual_grade: "mostly_factual",
              faith_grade: "good_faith",
              one_liner: "Alice stays close to the sourced claims.",
            },
          ],
        }}
        onHeadlineClick={noop}
      />,
    );
    expect(screen.getByText("Updating while checking")).toBeTruthy();
  });
});

// ─── 7. error with prior text ─────────────────────────────────────────────────

describe("SynthesisCard – error state with prior text", () => {
  const synthesis: SynthesisState = {
    state: "error",
    text: "Yentl sees a pattern of misdirection here.",
    headlines: HEADLINES,
    at: Date.now(),
  };

  it("renders the prior paragraph text", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(
      screen.getByText("Yentl sees a pattern of misdirection here."),
    ).toBeTruthy();
  });

  it("renders the 'Couldn't refresh' notice", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText(/Couldn't refresh/)).toBeTruthy();
  });
});

// ─── 8. error without prior text ─────────────────────────────────────────────

describe("SynthesisCard – error state without prior text", () => {
  const synthesis: SynthesisState = {
    state: "error",
    at: Date.now(),
    // text and headlines intentionally omitted
  };

  it("renders the italic fallback message", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(
      screen.getByText(/Yentl's read isn't loading/),
    ).toBeTruthy();
  });

  it("does NOT crash", () => {
    // Simply rendering without throwing is the assertion
    expect(() =>
      render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />),
    ).not.toThrow();
  });
});

// ─── 9. ageLabel ─────────────────────────────────────────────────────────────

describe("ageLabel", () => {
  let now: number;

  beforeEach(() => {
    now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'just now' for 3000ms ago", () => {
    expect(ageLabel(now - 3000)).toBe("just now");
  });

  it("returns '35s ago' for 35000ms ago", () => {
    expect(ageLabel(now - 35_000)).toBe("35s ago");
  });

  it("returns '2 min ago' for 130000ms ago", () => {
    expect(ageLabel(now - 130_000)).toBe("2 min ago");
  });
});

// ─── 10. Mobile collapse — class-based check ─────────────────────────────────

describe("SynthesisCard – mobile collapse classes", () => {
  it("paragraph has 'hidden' class by default (mobile collapsed)", () => {
    const { container } = render(
      <SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={noop} />,
    );
    const para = container.querySelector("p.font-serif");
    expect(para?.className).toContain("hidden");
  });

  it("paragraph also has 'md:block' class so desktop always shows it", () => {
    const { container } = render(
      <SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={noop} />,
    );
    const para = container.querySelector("p.font-serif");
    expect(para?.className).toContain("md:block");
  });
});

// ─── 11. Mobile toggle expands paragraph ─────────────────────────────────────

describe("SynthesisCard – mobile toggle", () => {
  it("clicking 'Read Yentl's take' toggles paragraph to block", () => {
    const { container } = render(
      <SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={noop} />,
    );

    // Initially hidden
    let para = container.querySelector("p.font-serif");
    expect(para?.className).toContain("hidden");

    // Click the toggle button
    const toggleBtn = screen.getByText(/Read Yentl's take/);
    fireEvent.click(toggleBtn);

    // Now should be block, not hidden
    para = container.querySelector("p.font-serif");
    expect(para?.className).toContain("block");
    expect(para?.className).not.toContain("hidden");
  });
});

// ─── 12. per_speaker_verdicts: undefined → no per-speaker block ───────────────

describe("SynthesisCard – per_speaker_verdicts absent", () => {
  it("renders no per-speaker block when per_speaker_verdicts is undefined", () => {
    render(<SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={noop} />);
    expect(screen.queryByTestId("per-speaker-verdicts")).toBeNull();
  });

  it("renders no meta-read panel when per_speaker_verdicts is undefined", () => {
    render(<SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={noop} />);
    expect(screen.queryByTestId("synthesis-meta-read")).toBeNull();
  });
});

// ─── 13. per_speaker_verdicts: empty array → no per-speaker block ─────────────

describe("SynthesisCard – per_speaker_verdicts empty", () => {
  it("renders no per-speaker block when per_speaker_verdicts is empty", () => {
    const synthesis: SynthesisState = {
      state: "fresh",
      text: "Text.",
      headlines: HEADLINES,
      per_speaker_verdicts: [],
      at: Date.now(),
    };
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.queryByTestId("per-speaker-verdicts")).toBeNull();
  });
});

// ─── 14. per_speaker_verdicts: 1 speaker ─────────────────────────────────────

describe("SynthesisCard – per_speaker_verdicts single speaker", () => {
  const synthesis: SynthesisState = {
    state: "fresh",
    text: "Text.",
    headlines: HEADLINES,
    per_speaker_verdicts: [
      {
        speaker_id: 0,
        label: "Alice",
        factual_grade: "mostly_factual",
        faith_grade: "good_faith",
        one_liner: "Alice made well-sourced, accurate claims throughout.",
      },
    ],
    at: Date.now(),
  };

  it("renders the per-speaker verdicts block", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByTestId("per-speaker-verdicts")).toBeTruthy();
  });

  it("renders one speaker card", () => {
    const { container } = render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    const cards = container.querySelectorAll("[data-testid^='speaker-verdict-card-']");
    expect(cards.length).toBe(1);
  });

  it("shows the speaker label", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("shows the factual grade chip label", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Mostly Factual")).toBeTruthy();
  });

  it("shows the faith grade chip label", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Good Faith")).toBeTruthy();
  });

  it("shows the one-liner", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Alice made well-sourced, accurate claims throughout.")).toBeTruthy();
  });

  it("renders a good-faith meta-read with caveat language", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByTestId("synthesis-meta-read")).toBeTruthy();
    expect(screen.getByText("Good-faith read")).toBeTruthy();
    expect(screen.getByText("Good-faith: 1")).toBeTruthy();
    expect(screen.getByText(/Keep checking source-backed claims/)).toBeTruthy();
  });
});

// ─── 15. per_speaker_verdicts: 2 speakers ────────────────────────────────────

describe("SynthesisCard – per_speaker_verdicts two speakers", () => {
  const synthesis: SynthesisState = {
    state: "fresh",
    text: "Text.",
    headlines: HEADLINES,
    per_speaker_verdicts: [
      {
        speaker_id: 0,
        label: "Alice",
        factual_grade: "mostly_factual",
        faith_grade: "good_faith",
        one_liner: "Alice backed claims with solid evidence.",
      },
      {
        speaker_id: 1,
        label: "Bob",
        factual_grade: "mostly_inaccurate",
        faith_grade: "bad_faith",
        one_liner: "Bob repeatedly used fallacies and misleading statistics.",
      },
    ],
    at: Date.now(),
  };

  it("renders two speaker verdict cards", () => {
    const { container } = render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    const cards = container.querySelectorAll("[data-testid^='speaker-verdict-card-']");
    expect(cards.length).toBe(2);
  });

  it("renders both speaker labels", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("renders red chip for mostly_inaccurate grade", () => {
    const { container } = render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    const card1 = container.querySelector("[data-testid='speaker-verdict-card-1']")!;
    const chips = card1.querySelectorAll("span.bg-red-soft");
    expect(chips.length).toBeGreaterThan(0);
  });

  it("renders red chip for bad_faith grade", () => {
    const { container } = render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    const card1 = container.querySelector("[data-testid='speaker-verdict-card-1']")!;
    const chips = card1.querySelectorAll("span.bg-red-soft");
    expect(chips.length).toBeGreaterThan(1);
  });

  it("renders green chips for Alice's good grades", () => {
    const { container } = render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    const card0 = container.querySelector("[data-testid='speaker-verdict-card-0']")!;
    const greenChips = card0.querySelectorAll("span.bg-green-soft");
    expect(greenChips.length).toBe(2);
  });

  it("summarizes the mixed speaker set as a mixed-faith read", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Mixed-faith read")).toBeTruthy();
    expect(screen.getByText("Good-faith: 1")).toBeTruthy();
    expect(screen.getByText("Bad-faith risk: 1")).toBeTruthy();
    expect(screen.getByText(/Review the speaker cards/)).toBeTruthy();
  });
});

// ─── 16. bad-faith meta-read ─────────────────────────────────────────────────

describe("SynthesisCard – bad-faith meta-read", () => {
  it("summarizes a bad-faith majority without claiming final intent", () => {
    const synthesis: SynthesisState = {
      state: "fresh",
      text: "Text.",
      headlines: HEADLINES,
      per_speaker_verdicts: [
        {
          speaker_id: 0,
          label: "A",
          factual_grade: "mostly_inaccurate",
          faith_grade: "bad_faith",
          one_liner: "A leans on unsupported framing.",
        },
        {
          speaker_id: 1,
          label: "B",
          factual_grade: "mixed",
          faith_grade: "bad_faith",
          one_liner: "B repeatedly evades the direct question.",
        },
        {
          speaker_id: 2,
          label: "C",
          factual_grade: "mixed",
          faith_grade: "mixed",
          one_liner: "C has mixed evidence and rhetoric.",
        },
      ],
      at: Date.now(),
    };
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Bad-faith risk")).toBeTruthy();
    expect(screen.getByText("Bad-faith risk: 2")).toBeTruthy();
    expect(screen.getByText(/not a final judgment about intent/)).toBeTruthy();
  });
});

// ─── 17. grade chip colors for all grades ────────────────────────────────────

describe("SynthesisCard – grade chip colors", () => {
  function renderSingleVerdict(
    factual_grade: "mostly_factual" | "mixed" | "mostly_inaccurate" | "insufficient",
    faith_grade: "good_faith" | "mixed" | "bad_faith" | "insufficient",
  ) {
    const synthesis: SynthesisState = {
      state: "fresh",
      text: "T.",
      headlines: HEADLINES,
      per_speaker_verdicts: [{ speaker_id: 0, label: "X", factual_grade, faith_grade, one_liner: "Short." }],
      at: Date.now(),
    };
    const { container } = render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    return container.querySelector("[data-testid='speaker-verdict-card-0']")!;
  }

  it("mixed factual_grade uses amber chip", () => {
    const card = renderSingleVerdict("mixed", "good_faith");
    const amberChip = card.querySelector("span.bg-amber-soft");
    expect(amberChip).not.toBeNull();
  });

  it("insufficient grades use slate chip", () => {
    const card = renderSingleVerdict("insufficient", "insufficient");
    const slateChips = card.querySelectorAll("span.bg-slate-soft");
    expect(slateChips.length).toBe(2);
  });
});
