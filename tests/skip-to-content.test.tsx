import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SkipToContent } from "@/components/ui/skip-to-content";

describe("SkipToContent", () => {
  it("renders as the first focusable element linking to main-content", () => {
    const { container } = render(
      <div>
        <SkipToContent />
        <a href="/other">Other link</a>
      </div>
    );
    const links = container.querySelectorAll("a");
    expect(links[0]).toHaveAttribute("href", "#main-content");
    expect(links[0]).toHaveTextContent("Skip to main content");
  });

  it("has sr-only class by default (visually hidden)", () => {
    const { container } = render(<SkipToContent />);
    const link = container.querySelector("a");
    expect(link?.className).toContain("sr-only");
  });
});
