import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SynthesisCard, ageLabel } from "@/components/session/synthesis-card";
import type { SynthesisState } from "@/lib/client/session-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEADLINES = ["5 fallacies detected", "70% verified", "Climate dominates"];

function freshSynthesis(overrides?: Partial<{ at: number }>): SynthesisState {
  return {
    state: "fresh",
    text: "Yenta sees a pattern of misdirection here.",
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

  it('heading reads "Yenta is listening…"', () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(screen.getByText("Yenta is listening…")).toBeTruthy();
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
      screen.getByText("Yenta sees a pattern of misdirection here."),
    ).toBeTruthy();
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
    text: "Yenta sees a pattern of misdirection here.",
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
      screen.getByText("Yenta sees a pattern of misdirection here."),
    ).toBeTruthy();
  });
});

// ─── 7. error with prior text ─────────────────────────────────────────────────

describe("SynthesisCard – error state with prior text", () => {
  const synthesis: SynthesisState = {
    state: "error",
    text: "Yenta sees a pattern of misdirection here.",
    headlines: HEADLINES,
    at: Date.now(),
  };

  it("renders the prior paragraph text", () => {
    render(<SynthesisCard synthesis={synthesis} onHeadlineClick={noop} />);
    expect(
      screen.getByText("Yenta sees a pattern of misdirection here."),
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
      screen.getByText(/Yenta's read isn't loading/),
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
  it("clicking 'Read Yenta's take' toggles paragraph to block", () => {
    const { container } = render(
      <SynthesisCard synthesis={freshSynthesis()} onHeadlineClick={noop} />,
    );

    // Initially hidden
    let para = container.querySelector("p.font-serif");
    expect(para?.className).toContain("hidden");

    // Click the toggle button
    const toggleBtn = screen.getByText(/Read Yenta's take/);
    fireEvent.click(toggleBtn);

    // Now should be block, not hidden
    para = container.querySelector("p.font-serif");
    expect(para?.className).toContain("block");
    expect(para?.className).not.toContain("hidden");
  });
});
