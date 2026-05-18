import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIDisclosureFooter } from "@/components/session/AIDisclosureFooter";

describe("AIDisclosureFooter", () => {
  it("renders verbatim disclosure text", () => {
    render(<AIDisclosureFooter />);
    expect(
      screen.getByText(
        "Verdicts are AI-generated. Sources may be incomplete. Use your head."
      )
    ).toBeInTheDocument();
  });

  it("renders a footer element", () => {
    const { container } = render(<AIDisclosureFooter />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });
});
