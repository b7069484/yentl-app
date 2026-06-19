import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DemoPage from "@/app/demo/page";
import FAQPage from "@/app/faq/page";
import HomePage from "@/app/page";
import MobilePage from "@/app/mobile/page";
import PricingPage from "@/app/pricing/page";

describe("public entry pages", () => {
  it("publishes a full product homepage with anchors, trust, pricing, FAQ, and guest demo paths", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Yentl checks what is being said." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Try guest demo" })).toHaveAttribute("href", "/demo");
    expect(screen.getByRole("link", { name: "Room mode" })).toHaveAttribute("href", "/tv");
    expect(screen.getByRole("link", { name: "Mobile app" })).toHaveAttribute("href", "/mobile");
    expect(screen.getByRole("link", { name: "Pricing details" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Full FAQ" })).toHaveAttribute("href", "/faq");
    expect(screen.getByText("Room display")).toBeTruthy();
    expect(screen.getByText("Share links or text into Yentl from iOS, Android, or mobile web.")).toBeTruthy();
    expect(screen.getByText("Start from the source you actually have.")).toBeTruthy();
    expect(screen.getByText("The trust layer is part of the product surface.")).toBeTruthy();
  });

  it("publishes a mobile app entry hub with working product links", () => {
    const { container } = render(<MobilePage />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((link) => link.getAttribute("href"));

    expect(screen.getByRole("heading", { name: "Yentl on iOS, Android, and mobile web." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Yentl home" })).toHaveClass("min-h-11");
    expect(screen.getByRole("link", { name: /Pick source/i })).toHaveAttribute("href", "/session");
    expect(hrefs).toContain("/sessions");
    expect(hrefs).toContain("/tv");
    expect(hrefs.some((href) => href?.startsWith("/session?title=Shared%20article&url="))).toBe(true);
    expect(screen.getByText("iOS")).toBeTruthy();
    expect(screen.getByText("Android")).toBeTruthy();
    expect(screen.getByText("Mobile web")).toBeTruthy();
    expect(screen.getByText(/Open-tab audio capture is not exposed by mobile Safari/i)).toBeTruthy();
    expect(screen.getByText(/installed app can also open supported files/i)).toBeTruthy();
    expect(screen.getByText(/installed-app file opens/i)).toBeTruthy();
    expect(screen.getByText("Native shell status")).toBeTruthy();
    expect(screen.getByText("Installable web app first; store shells after proof.")).toBeTruthy();
    expect(screen.getByText("Native shells later")).toBeTruthy();
    expect(screen.getByText(/Native iOS and Android store shells are not shipped in v1/i)).toBeTruthy();
  });

  it("publishes the honest v1 pricing posture", () => {
    render(<PricingPage />);

    expect(screen.getByRole("heading", { name: "Yentl has no published paid plan in v1." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveClass("min-h-11");
    expect(screen.getByText("Free public preview")).toBeTruthy();
    expect(screen.getByText("Responsible partner pilot")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Start checking/i })).toHaveAttribute("href", "/session");
  });

  it("publishes expanded FAQ rows for launch questions", () => {
    render(<FAQPage />);

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveClass("min-h-11");
    expect(screen.getByText("Is Yentl a final authority?")).toBeTruthy();
    expect(screen.getByText("What can I check?")).toBeTruthy();
    expect(screen.getByText("Do I need an account?")).toBeTruthy();
    expect(screen.getByText("How is pricing handled right now?")).toBeTruthy();
  });

  it("publishes a guest demo path with a prepared text sample", () => {
    render(<DemoPage />);

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveClass("min-h-11");
    const sampleLink = screen.getByRole("link", { name: /Open sample text/i });
    expect(sampleLink).toHaveAttribute("href", expect.stringContaining("/session?title="));
    expect(sampleLink).toHaveAttribute("href", expect.stringContaining("&text="));
    expect(screen.getByText("Guest expectations")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Choose another source/i })).toHaveAttribute("href", "/session");
  });
});
