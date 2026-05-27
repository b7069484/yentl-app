import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerdictCard } from "@/components/verdict/VerdictCard";

const baseProps = {
  claim: "The earth is flat.",
  summary: "Multiple lines of evidence confirm the earth is roughly spherical.",
  sources: [{ url: "https://nasa.gov", domain: "nasa.gov", reputation: "high" as const }],
  markers: [{ type: "Conspiracy Thinking", severity: "clear" as const }],
};

describe("VerdictCard", () => {
  it("renders TRUE state without errors", () => {
    render(<VerdictCard verdict="TRUE" {...baseProps} />);
    expect(screen.getByText(/✓ TRUE/i)).toBeInTheDocument();
  });

  it("renders FALSE state without errors", () => {
    render(<VerdictCard verdict="FALSE" {...baseProps} />);
    expect(screen.getByText(/✗ FALSE/i)).toBeInTheDocument();
  });

  it("renders MIXED state without errors", () => {
    render(<VerdictCard verdict="MIXED" {...baseProps} />);
    expect(screen.getByText(/◐ MIXED/i)).toBeInTheDocument();
  });

  it("renders UNVERIFIED state without errors", () => {
    render(<VerdictCard verdict="UNVERIFIED" {...baseProps} />);
    expect(screen.getByText(/NO RELIABLE BACKING/i)).toBeInTheDocument();
  });

  it("has aria-label for verdict state (accessible)", () => {
    const { container } = render(<VerdictCard verdict="FALSE" {...baseProps} />);
    const article = container.querySelector("article");
    expect(article).toHaveAttribute("aria-label", "Verdict: False");
  });

  it("shows AIGeneratedBadge", () => {
    render(<VerdictCard verdict="TRUE" {...baseProps} />);
    expect(screen.getByLabelText("AI-generated content")).toBeInTheDocument();
  });

  it("shows sources list", () => {
    render(<VerdictCard verdict="TRUE" {...baseProps} />);
    expect(screen.getByText("nasa.gov")).toBeInTheDocument();
  });

  it("shows marker chips", () => {
    render(<VerdictCard verdict="TRUE" {...baseProps} />);
    expect(screen.getByText("Conspiracy Thinking")).toBeInTheDocument();
  });

  it("verdict card color is not the sole encoding — text label present (WCAG 1.4.1)", () => {
    const { container } = render(<VerdictCard verdict="FALSE" {...baseProps} />);
    const colorStripe = container.querySelector(".bg-\\[\\#DC2626\\]");
    expect(colorStripe).toBeInTheDocument();
    expect(screen.getByText(/✗ FALSE/i)).toBeInTheDocument();
  });
});
