import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UxFlowDashboard } from "@/components/session/ux-flow-dashboard";

const DASHBOARD_TEST_TIMEOUT = 25_000;
const POINT_COMMENT_TEST_TIMEOUT = 60_000;

describe("UxFlowDashboard", () => {
  it("renders the current implementation flow inventory", () => {
    render(<UxFlowDashboard />);

    expect(screen.getByRole("heading", { name: "UX flow map" })).toBeTruthy();
    expect(screen.getByText("Current implementation critique")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "A-to-Z Flow" })).toBeTruthy();
    expect(screen.getByText("Commentable screenshots")).toBeTruthy();
    expect(screen.getAllByText("Home / Product Page").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Screen Atlas/i }));
    expect(screen.getByText("Screen atlas index")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "12 product flows · 40 desktop/mobile screens" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "YouTube Captions" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Browser Tab Capture" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Audio File" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Text / Document" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Microphone" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Media URL" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Session Workspace" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Drill-down / Learning" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Session Management" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Public / Trust / Account" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Chrome Extension" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mobile App Prep" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /A-to-Z Flow/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Visual Evidence System/i })).toBeTruthy();
  }, DASHBOARD_TEST_TIMEOUT);

  it("shows the successful YouTube branch and the fallback branch", () => {
    render(<UxFlowDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Screen Atlas/i }));
    expect(screen.getByText(/When captions exist, Yentl redirects to Watch/i)).toBeTruthy();
    expect(screen.getByText(/If YouTube has no captions or blocks access/i)).toBeTruthy();
    expect(screen.getAllByText(/Continue without leaving the flow/i).length).toBeGreaterThan(0);
  }, DASHBOARD_TEST_TIMEOUT);

  it("shows design critique and paired desktop/mobile wireframes", () => {
    render(<UxFlowDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Screen Atlas/i }));
    expect(screen.getAllByText("Why this is weak").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Good design target").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Desktop").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1440 x 900 simulation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mobile").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "Screenshot: desktop youtube success" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Screenshot: mobile youtube success" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Screenshot: desktop overview" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Screenshot: desktop claim detail" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Screenshot: desktop export dialog" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Screenshot: mobile extension popup" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Screenshot: mobile mobile live" })).toBeTruthy();
    expect(screen.getAllByText("Yentl's take").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Screen atlas index").length).toBeGreaterThan(0);
  }, DASHBOARD_TEST_TIMEOUT);

  it("renders the screenshot-backed A-to-Z flow tab", () => {
    render(<UxFlowDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /A-to-Z Flow/i }));

    expect(screen.getByRole("heading", { name: "A-to-Z Flow" })).toBeTruthy();
    expect(screen.getAllByText("Promo / Product Page").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sell and explain Yentl/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("YouTube URL Entry").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Post-Auth Redirect").length).toBeGreaterThan(0);
    expect(screen.getAllByText("YouTube Preview Shell").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Valid URL Preview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Link Resolving").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fetching Captions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verifying Sources").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Video Ready").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Caption Fallback").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Auth Errors / Recovery").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mobile Share / Import").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Home / Product Page").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pricing Page").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FAQ Page").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Guest Demo Page").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign In Fallback").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign Up Fallback").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Saved Sessions Page").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Project Flow Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marker Learn Page").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Home / Product Page Mobile").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Claim Detail Populated").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marker Learn Populated Mobile").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Open Home \/ Product Page screenshot/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Open Project Flow Dashboard screenshot/i })).toBeTruthy();
    expect(screen.getAllByText("Extension Claims Tab").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Extension Export Menu").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mic Consent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Live Claim Hit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PDF Upload").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Source / Citation Drawer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Claim-Only Quick Check").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Claim-Only Verification").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Yentl Opinion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Devil's Advocate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Validated Source Thumbnail").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No-Thumbnail Fallback").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Claim Source Gallery").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marker Icon States").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Archetype Motion / Reduced Motion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Save Dialog").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Report Preview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Report Preview Mobile").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Clear All Confirmation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Target UI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rendered target").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Current capture").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reference only").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stale / failure capture").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Target missing").length).toBeGreaterThan(0);
    expect(screen.getByText("Missing states to capture")).toBeTruthy();
    expect(screen.getByText("Essential Video Review")).toBeTruthy();
    expect(screen.getByText("Essential Live Mic Review")).toBeTruthy();
    expect(screen.getByText(/nodes and branches/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Save comments/i })).toBeTruthy();
  }, DASHBOARD_TEST_TIMEOUT);

  it("opens rendered target UI actuals for the first batch", () => {
    render(<UxFlowDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /A-to-Z Flow/i }));
    fireEvent.click(screen.getByRole("button", { name: /Open YouTube URL Entry target UI/i }));

    expect(screen.getByText("Target UI review")).toBeTruthy();
    expect(screen.getByRole("img", { name: "YouTube URL Entry target UI" })).toBeTruthy();
    expect(screen.getByText("Target UI actual")).toBeTruthy();
    expect(screen.getByText("Paste a YouTube link")).toBeTruthy();
    expect(screen.getByText(/not a bare utility hallway/i)).toBeTruthy();
    expect(screen.getAllByText("Target UI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stale / failure capture").length).toBeGreaterThan(0);
  }, DASHBOARD_TEST_TIMEOUT);

  it("opens the committee-backed extension target hierarchy", () => {
    render(<UxFlowDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /A-to-Z Flow/i }));
    fireEvent.click(screen.getByRole("button", { name: /Open Extension Claims Tab target UI/i }));

    expect(screen.getByText("Target UI review")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Extension Claims Tab target UI" })).toBeTruthy();
    expect(screen.getByText("Yentl's Read")).toBeTruthy();
    expect(screen.getByText("Claim risk")).toBeTruthy();
    expect(screen.getByText("Rhetoric heat")).toBeTruthy();
    expect(screen.getByText("Evidence state")).toBeTruthy();
    expect(screen.getByText("New finding")).toBeTruthy();
    expect(screen.getByText("Devil's Advocate queued")).toBeTruthy();
    expect(screen.getByText("No duplicate top status blocks")).toBeTruthy();
    expect(screen.getAllByText("Transcript").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Claims").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Markers").length).toBeGreaterThan(0);
  }, DASHBOARD_TEST_TIMEOUT);

  it("supports point comments with create, edit, and remove controls", () => {
    render(<UxFlowDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /A-to-Z Flow/i }));
    fireEvent.click(screen.getByRole("button", { name: /Open Promo \/ Product Page screenshot/i }));
    expect(screen.getByRole("button", { name: "Full length" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fit screen" })).toBeTruthy();

    const screenshot = screen.getByRole("img", { name: /Promo \/ Product Page full screenshot/i });
    Object.defineProperty(screenshot, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 800,
        right: 1000,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => undefined,
      }),
    });

    fireEvent.click(screenshot, { clientX: 250, clientY: 200 });
    fireEvent.change(screen.getByPlaceholderText("Write feedback for this exact spot..."), {
      target: { value: "Promo page needs education before app entry." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Save point/i })[0]);

    expect(screen.getByText("Promo page needs education before app entry.")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: /Edit comment point 1/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/Editing point 1/i), {
      target: { value: "Promo page needs proof, examples, and then app entry." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save edit/i }));

    expect(screen.getByText("Promo page needs proof, examples, and then app entry.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Remove comment point 1/i }));

    expect(screen.queryByText("Promo page needs proof, examples, and then app entry.")).toBeNull();
    expect(screen.getByText("No comments yet.")).toBeTruthy();
  }, POINT_COMMENT_TEST_TIMEOUT);

  it("renders the visual evidence system tab with marker production coverage", () => {
    render(<UxFlowDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Visual Evidence System/i }));

    expect(screen.getByRole("heading", { name: "Visual Evidence System" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "123 bespoke marker assets" })).toBeTruthy();
    expect(screen.getAllByText("No source-provided thumbnail was found.").length).toBeGreaterThan(0);
    expect(screen.getByText("loaded_language")).toBeTruthy();
  }, DASHBOARD_TEST_TIMEOUT);
});
