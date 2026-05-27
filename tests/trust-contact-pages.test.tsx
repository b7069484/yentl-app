import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPage from "@/app/about/page";
import AccessibilityPage from "@/app/accessibility/page";
import ContactPage from "@/app/contact/page";
import FAQPage from "@/app/faq/page";
import PricingPage from "@/app/pricing/page";
import PrivacyPage from "@/app/privacy/page";
import SubprocessorsPage from "@/app/subprocessors/page";

describe("trust contact pages", () => {
  it("publishes support, privacy, and accessibility contacts", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { name: "Contact Yentl" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "support@yentl.it" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:support@yentl.it"),
    );
    expect(screen.getByRole("link", { name: "privacy@yentl.it" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:privacy@yentl.it"),
    );
    expect(screen.getByRole("link", { name: "accessibility@yentl.it" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:accessibility@yentl.it"),
    );
  });

  it("does not leave public trust pages pointing at a missing contact route", () => {
    render(
      <>
        <AboutPage />
        <AccessibilityPage />
        <FAQPage />
        <PricingPage />
        <PrivacyPage />
        <SubprocessorsPage />
      </>,
    );

    expect(screen.getAllByRole("link", { name: /contact page/i }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("link", { name: "privacy@yentl.it" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Use the accessibility contact/i })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getAllByText(/no published paid plan/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/How is pricing handled right now/i)).toBeTruthy();
    expect(screen.queryByText(/contact page is not enabled/i)).toBeNull();
    expect(screen.queryByText(/contact is not enabled/i)).toBeNull();
  });
});
