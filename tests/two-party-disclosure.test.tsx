import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TwoPartyDisclosure } from "@/components/session/TwoPartyDisclosure";

const FLAG_KEY = "yentl.two_party_seen";

describe("TwoPartyDisclosure", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appears when localStorage flag is absent", () => {
    render(<TwoPartyDisclosure />);
    expect(
      screen.getByText(/Heads up — recording the people around you/i)
    ).toBeInTheDocument();
  });

  it("does not appear when localStorage flag is present", () => {
    localStorage.setItem(FLAG_KEY, "1");
    render(<TwoPartyDisclosure />);
    expect(
      screen.queryByText(/Heads up — recording the people around you/i)
    ).not.toBeInTheDocument();
  });

  it("dismissing sets the localStorage flag", () => {
    render(<TwoPartyDisclosure />);
    const dismissBtn = screen.getByRole("button", {
      name: /Dismiss consent reminder/i,
    });
    fireEvent.click(dismissBtn);
    expect(localStorage.getItem(FLAG_KEY)).toBe("1");
  });

  it("banner disappears after dismissal", () => {
    render(<TwoPartyDisclosure />);
    const dismissBtn = screen.getByRole("button", {
      name: /Dismiss consent reminder/i,
    });
    fireEvent.click(dismissBtn);
    expect(
      screen.queryByText(/Heads up — recording the people around you/i)
    ).not.toBeInTheDocument();
  });
});
