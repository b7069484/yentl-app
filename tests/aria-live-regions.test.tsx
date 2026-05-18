import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ClaimsLiveRegion } from "@/components/session/ClaimsLiveRegion";
import { TranscriptView } from "@/components/session/TranscriptView";

vi.mock("@/lib/client/session-store", () => ({
  useSession: () => ({ transcript: [], interim: "" }),
}));

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
});
