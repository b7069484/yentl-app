import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import SignInPage from "@/app/signin/[[...rest]]/page";
import SignUpPage from "@/app/signup/[[...rest]]/page";

describe("auth route fallbacks", () => {
  it("renders a visible sign-in fallback when accounts are not configured", () => {
    render(<SignInPage />);
    expect(screen.getByText(/Accounts are not enabled/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start checking" })).toBeTruthy();
  });

  it("renders a visible sign-up fallback when accounts are not configured", () => {
    render(<SignUpPage />);
    expect(screen.getByText(/Account creation is not enabled/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy();
  });
});
