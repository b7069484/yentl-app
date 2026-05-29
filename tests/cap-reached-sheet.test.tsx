import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CapReachedSheet,
  isOverCap,
  FREE_TIER_AUDIO_SECONDS,
} from "@/components/paywall/CapReachedSheet";

describe("isOverCap (Phase 1b Task 8)", () => {
  it("returns true when free-tier usage meets or exceeds the cap", () => {
    expect(isOverCap({ tier: "free", audioSecondsUsed: FREE_TIER_AUDIO_SECONDS })).toBe(true);
    expect(isOverCap({ tier: "free", audioSecondsUsed: FREE_TIER_AUDIO_SECONDS + 1 })).toBe(true);
  });

  it("returns false when free-tier usage is below the cap", () => {
    expect(isOverCap({ tier: "free", audioSecondsUsed: 0 })).toBe(false);
    expect(isOverCap({ tier: "free", audioSecondsUsed: FREE_TIER_AUDIO_SECONDS - 1 })).toBe(false);
  });

  it("returns false for pro/studio regardless of usage", () => {
    expect(isOverCap({ tier: "pro", audioSecondsUsed: 100 * 60 * 60 })).toBe(false);
    expect(isOverCap({ tier: "studio", audioSecondsUsed: 9999 * 60 * 60 })).toBe(false);
  });
});

describe("CapReachedSheet (Phase 1b Task 8)", () => {
  it("renders the cap-reached message + upgrade CTA when open", () => {
    render(
      <CapReachedSheet
        open
        onClose={() => undefined}
        audioSecondsUsed={FREE_TIER_AUDIO_SECONDS}
        periodResetAt="2026-06-29T00:00:00.000Z"
      />,
    );

    expect(
      screen.getByRole("heading", { name: /used your free 30 minutes/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upgrade to pro/i })).toBeInTheDocument();
    expect(screen.getByText(/free quota resets/i)).toBeInTheDocument();
  });

  it("calls onUpgradeIntent when the upgrade button is clicked", () => {
    const onUpgradeIntent = vi.fn();
    render(
      <CapReachedSheet
        open
        onClose={() => undefined}
        audioSecondsUsed={FREE_TIER_AUDIO_SECONDS}
        periodResetAt={null}
        onUpgradeIntent={onUpgradeIntent}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));
    expect(onUpgradeIntent).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when open=false", () => {
    const { queryByRole } = render(
      <CapReachedSheet
        open={false}
        onClose={() => undefined}
        audioSecondsUsed={FREE_TIER_AUDIO_SECONDS}
        periodResetAt={null}
      />,
    );
    expect(
      queryByRole("heading", { name: /used your free 30 minutes/i }),
    ).not.toBeInTheDocument();
  });
});
