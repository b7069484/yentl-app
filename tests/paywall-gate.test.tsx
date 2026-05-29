import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PaywallGate } from "@/components/paywall/PaywallGate";

describe("PaywallGate (Phase 1c Task 4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockSubscriptionMe(body: {
    tier: "free" | "pro" | "studio";
    audioSecondsUsed: number;
    periodResetAt: string | null;
  }) {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );
  }

  it("renders nothing while the snapshot is loading", () => {
    vi.spyOn(global, "fetch").mockReturnValue(new Promise(() => undefined));
    const { container } = render(<PaywallGate />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the CapReachedSheet when free tier is over cap", async () => {
    mockSubscriptionMe({
      tier: "free",
      audioSecondsUsed: 30 * 60, // exactly at cap
      periodResetAt: "2026-06-29T00:00:00.000Z",
    });

    render(<PaywallGate />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /used your free 30 minutes/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not render the sheet when free tier is under cap", async () => {
    mockSubscriptionMe({
      tier: "free",
      audioSecondsUsed: 60, // 1 minute used
      periodResetAt: null,
    });

    const { container } = render(<PaywallGate />);
    await waitFor(() => {
      // fetch has resolved by now — give state machine a beat
    });
    expect(container.textContent).not.toMatch(/used your free 30 minutes/i);
  });

  it("never renders the sheet for pro tier regardless of usage", async () => {
    mockSubscriptionMe({
      tier: "pro",
      audioSecondsUsed: 100 * 60 * 60, // 100 hours
      periodResetAt: null,
    });

    const { container } = render(<PaywallGate />);
    await waitFor(() => undefined);
    expect(container.textContent).not.toMatch(/used your free 30 minutes/i);
  });

  it("fails open on fetch error (no sheet — better than blocking a session)", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network"));

    const { container } = render(<PaywallGate />);
    await waitFor(() => undefined);
    expect(container.textContent).not.toMatch(/used your free 30 minutes/i);
  });
});
