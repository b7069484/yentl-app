import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UxFlowDashboard } from "@/components/session/ux-flow-dashboard";

describe("UxFlowDashboard", () => {
  it("renders the current implementation flow inventory", () => {
    render(<UxFlowDashboard />);

    expect(screen.getByRole("heading", { name: "UX flow map" })).toBeTruthy();
    expect(screen.getByText("Current implementation critique")).toBeTruthy();
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
  });

  it("shows the successful YouTube branch and the fallback branch", () => {
    render(<UxFlowDashboard />);

    expect(screen.getByText(/When captions exist, Yentl redirects to Watch/i)).toBeTruthy();
    expect(screen.getByText(/If YouTube has no captions or blocks access/i)).toBeTruthy();
    expect(screen.getAllByText(/Continue without leaving the flow/i).length).toBeGreaterThan(0);
  });

  it("shows design critique and paired desktop/mobile wireframes", () => {
    render(<UxFlowDashboard />);

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
  });
});
