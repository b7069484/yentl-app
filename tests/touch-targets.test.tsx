import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button touch targets", () => {
  it("default size button has h-11 class (44px height)", () => {
    const { container } = render(<Button>Click me</Button>);
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("h-11");
  });

  it("default size button has px-4 class (width ≥44px)", () => {
    const { container } = render(<Button>Click me</Button>);
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("px-4");
  });
});
