import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClaimStanceBadge } from "@/components/session/ClaimStanceBadge";
import type { ClaimStance } from "@/lib/types";

describe("ClaimStanceBadge (Phase 1b Task 4)", () => {
  // The default stance is asserted — showing a label for it would be noise,
  // so the badge renders null. Every non-asserted stance surfaces a label.
  const cases: Array<{ stance: ClaimStance | undefined; expected: RegExp | null }> = [
    { stance: undefined, expected: null }, // missing field = treat as asserted
    { stance: "asserted", expected: null },
    { stance: "denied", expected: /denied/i },
    { stance: "quoted", expected: /quoted/i },
    { stance: "reported", expected: /reported/i },
    { stance: "mocked", expected: /mocked/i },
    { stance: "questioned", expected: /questioned/i },
    { stance: "corrected", expected: /corrected/i },
    { stance: "hedged", expected: /hedged/i },
    { stance: "unclear", expected: /unclear/i },
  ];

  for (const { stance, expected } of cases) {
    it(`renders ${expected === null ? "no" : ""} badge for stance=${stance ?? "undefined"}`, () => {
      const { container } = render(<ClaimStanceBadge stance={stance} />);

      if (expected === null) {
        expect(container.firstChild).toBeNull();
      } else {
        expect(screen.getByText(expected)).toBeInTheDocument();
      }
    });
  }

  it("forwards a className prop", () => {
    const { container } = render(
      <ClaimStanceBadge stance="denied" className="mt-2" />,
    );
    expect(container.firstChild).toHaveClass("mt-2");
  });
});
