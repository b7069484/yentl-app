import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttributionBadge } from "@/components/session/AttributionBadge";
import type { AttributionStatus } from "@/lib/types";

describe("AttributionBadge (Phase 1b Task 3)", () => {
  // Each status maps to a specific user-facing label per the Phase 1b plan.
  const cases: Array<{ status: AttributionStatus | null; expected: RegExp | null }> = [
    { status: "confident", expected: null }, // no badge — speaker name carries it
    { status: "manual_corrected", expected: null }, // user already corrected
    { status: "probable", expected: /probably/i },
    { status: "uncertain", expected: /speaker uncertain/i },
    { status: "unsafe_overlap", expected: /overlapping speech/i },
    { status: "quote_or_clip", expected: /clip|quoted audio/i },
    { status: "not_available", expected: /speaker unknown/i },
    { status: null, expected: /speaker unknown/i }, // null collapses to not_available
  ];

  for (const { status, expected } of cases) {
    it(`renders ${status === null ? "no" : ""} badge for status=${status}`, () => {
      const { container } = render(<AttributionBadge status={status} />);

      if (expected === null) {
        // No badge — empty render
        expect(container.firstChild).toBeNull();
      } else {
        expect(screen.getByText(expected)).toBeInTheDocument();
      }
    });
  }

  it("forwards a className prop so callers can adjust spacing", () => {
    const { container } = render(
      <AttributionBadge status="uncertain" className="ml-2" />,
    );
    expect(container.firstChild).toHaveClass("ml-2");
  });
});
