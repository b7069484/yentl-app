import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import SignInPage from "@/app/signin/[[...rest]]/page";
import SignUpPage from "@/app/signup/[[...rest]]/page";
import { sanitizeAuthReturnHref } from "@/lib/auth-return";

describe("auth route fallbacks", () => {
  it("renders a visible sign-in fallback when accounts are not configured", async () => {
    render(await SignInPage({}));
    expect(screen.getByText(/Accounts are not enabled/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start checking" })).toBeTruthy();
  });

  it("renders a visible sign-up fallback when accounts are not configured", async () => {
    render(await SignUpPage({}));
    expect(screen.getByText(/Account creation is not enabled/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy();
  });

  it("preserves safe return context through the sign-in fallback", async () => {
    render(
      await SignInPage({
        searchParams: Promise.resolve({ redirect_url: "/session?source=audio-file" }),
      }),
    );

    expect(screen.getByText(/Return to your Yentl flow/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Return to flow" })).toHaveAttribute(
      "href",
      "/session?source=audio-file",
    );
  });

  it("preserves safe return context through the sign-up fallback", async () => {
    render(
      await SignUpPage({
        searchParams: Promise.resolve({ return_to: "/sessions?filter=cloud" }),
      }),
    );

    expect(screen.getByText(/Return to your Yentl flow/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Return to flow" })).toHaveAttribute(
      "href",
      "/sessions?filter=cloud",
    );
  });

  it("ignores unsafe external and auth-loop return targets", () => {
    expect(sanitizeAuthReturnHref("https://evil.example/session")).toBeNull();
    expect(sanitizeAuthReturnHref("//evil.example/session")).toBeNull();
    expect(sanitizeAuthReturnHref("/signin?redirect_url=/session")).toBeNull();
    expect(sanitizeAuthReturnHref("/session?source=text-doc")).toBe("/session?source=text-doc");
    expect(sanitizeAuthReturnHref("/tv?restore=abc")).toBe("/tv?restore=abc");
  });
});
