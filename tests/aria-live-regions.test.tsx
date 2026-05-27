import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ClaimsLiveRegion } from "@/components/session/ClaimsLiveRegion";
import { TranscriptView } from "@/components/session/TranscriptView";

vi.mock("@/lib/client/session-store", () => {
  const state = {
    transcript: [] as unknown[],
    interim: "",
    claims: [] as unknown[],
    speakers: [] as unknown[],
  };
  return {
    useSession: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

describe("aria-live regions", () => {
  it("ClaimsLiveRegion has aria-live=polite, aria-atomic=false, role=status", () => {
    const { container } = render(<ClaimsLiveRegion />);
    const region = container.firstElementChild;
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "false");
    expect(region).toHaveAttribute("role", "status");
  });

  it("TranscriptView container has aria-live=polite", () => {
    const { container } = render(<TranscriptView />);
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("TranscriptView uses a constrained reading measure", () => {
    const { container } = render(<TranscriptView />);
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion?.className).toContain("max-w-3xl");
    expect(liveRegion?.className).toContain("px-5");
  });
});
