import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ClaimCard } from "@/components/session/ClaimCard";
import type { ClaimCard as ClaimCardT } from "@/lib/types";

function makeClaim(overrides: Partial<ClaimCardT> = {}): ClaimCardT {
  return {
    id: "claim_1",
    claim_text: "Test claim.",
    utterance_start: 0,
    utterance_end: 5,
    speaker_id: 0,
    topic: "Other",
    topic_secondary: null,
    primary_label: "TRUE",
    score: 80,
    annotations: [],
    explanation: "Test explanation.",
    status: "confirmed",
    sources: [],
    ...overrides,
  };
}

describe("ClaimCard OPINION shape distinction (Phase 1b Task 6)", () => {
  it("renders the colored stripe for non-OPINION verdicts", () => {
    const { container } = render(<ClaimCard card={makeClaim({ primary_label: "TRUE" })} />);
    expect(container.querySelector('[data-verdict-shape="stripe"]')).toBeInTheDocument();
    expect(container.querySelector('[data-verdict-shape="diamond"]')).not.toBeInTheDocument();
  });

  it("renders the diamond glyph instead of the stripe for OPINION", () => {
    const { container } = render(<ClaimCard card={makeClaim({ primary_label: "OPINION" })} />);
    expect(container.querySelector('[data-verdict-shape="diamond"]')).toBeInTheDocument();
    expect(container.querySelector('[data-verdict-shape="stripe"]')).not.toBeInTheDocument();
  });

  it("FALSE renders the stripe (color-distinct but same shape family as TRUE)", () => {
    const { container } = render(<ClaimCard card={makeClaim({ primary_label: "FALSE" })} />);
    expect(container.querySelector('[data-verdict-shape="stripe"]')).toBeInTheDocument();
    expect(container.querySelector('[data-verdict-shape="diamond"]')).not.toBeInTheDocument();
  });
});
