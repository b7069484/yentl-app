import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { confidenceTier } from "@/lib/client/confidence-tier";
import { ConfidenceTierBadge } from "@/components/session/ConfidenceTierBadge";

describe("confidenceTier(score) — Phase 1b Task 5", () => {
  it("returns 'high' for scores >= 85", () => {
    expect(confidenceTier(100)).toBe("high");
    expect(confidenceTier(90)).toBe("high");
    expect(confidenceTier(85)).toBe("high");
  });

  it("returns 'medium' for 65 <= score < 85", () => {
    expect(confidenceTier(84)).toBe("medium");
    expect(confidenceTier(75)).toBe("medium");
    expect(confidenceTier(65)).toBe("medium");
  });

  it("returns 'low' for scores < 65", () => {
    expect(confidenceTier(64)).toBe("low");
    expect(confidenceTier(50)).toBe("low");
    expect(confidenceTier(0)).toBe("low");
  });
});

describe("<ConfidenceTierBadge /> — Phase 1b Task 5", () => {
  it("renders 'High confidence' for high tier scores", () => {
    render(<ConfidenceTierBadge score={92} />);
    expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
  });

  it("renders 'Medium confidence' for medium tier scores", () => {
    render(<ConfidenceTierBadge score={70} />);
    expect(screen.getByText(/medium confidence/i)).toBeInTheDocument();
  });

  it("renders 'Low confidence' for low tier scores", () => {
    render(<ConfidenceTierBadge score={40} />);
    expect(screen.getByText(/low confidence/i)).toBeInTheDocument();
  });

  it("exposes data-tier attribute for analytics / styling hooks", () => {
    const { container } = render(<ConfidenceTierBadge score={92} />);
    expect(container.firstChild).toHaveAttribute("data-tier", "high");
  });

  it("forwards className", () => {
    const { container } = render(
      <ConfidenceTierBadge score={50} className="ml-1" />,
    );
    expect(container.firstChild).toHaveClass("ml-1");
  });
});
