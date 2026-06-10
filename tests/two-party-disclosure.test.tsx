import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TwoPartyDisclosure } from "@/components/session/TwoPartyDisclosure";

const FLAG_KEY = "yentl.two_party_seen";

describe("TwoPartyDisclosure", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appears when localStorage flag is absent", async () => {
    render(<TwoPartyDisclosure />);
    expect(
      await screen.findByText(/Heads up — recording the people around you/i)
    ).toBeInTheDocument();
  });

  it("does not appear when localStorage flag is present", () => {
    localStorage.setItem(FLAG_KEY, "1");
    render(<TwoPartyDisclosure />);
    expect(
      screen.queryByText(/Heads up — recording the people around you/i)
    ).not.toBeInTheDocument();
  });

  it("dismissing sets the localStorage flag", async () => {
    render(<TwoPartyDisclosure />);
    const dismissBtn = await screen.findByRole("button", {
      name: /Dismiss consent reminder/i,
    });
    fireEvent.click(dismissBtn);
    expect(localStorage.getItem(FLAG_KEY)).toBe("1");
  });

  it("uses a mobile-sized dismiss touch target", async () => {
    render(<TwoPartyDisclosure />);
    const dismissBtn = await screen.findByRole("button", {
      name: /Dismiss consent reminder/i,
    });

    expect(dismissBtn).toHaveClass("min-h-11", "min-w-11");
  });

  it("banner disappears after dismissal", async () => {
    render(<TwoPartyDisclosure />);
    const dismissBtn = await screen.findByRole("button", {
      name: /Dismiss consent reminder/i,
    });
    fireEvent.click(dismissBtn);
    expect(
      screen.queryByText(/Heads up — recording the people around you/i)
    ).not.toBeInTheDocument();
  });
});
