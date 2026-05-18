import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIGeneratedBadge } from "@/components/ui/ai-generated-badge";

describe("AIGeneratedBadge", () => {
  it("renders with text label AI", () => {
    render(<AIGeneratedBadge />);
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("has aria-label for AI-generated content", () => {
    render(<AIGeneratedBadge />);
    expect(screen.getByLabelText("AI-generated content")).toBeInTheDocument();
  });

  it("sparkle icon is aria-hidden", () => {
    const { container } = render(<AIGeneratedBadge />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
