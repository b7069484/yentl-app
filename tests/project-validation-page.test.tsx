import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProjectValidationPage from "@/app/project/validation/page";

describe("ProjectValidationPage", () => {
  it("renders the validation lab with every ingest fixture family", () => {
    render(<ProjectValidationPage />);

    expect(screen.getByText("Yentl source validation lab")).toBeTruthy();
    expect(screen.getAllByText("Hans Rosling population box talk").length).toBeGreaterThan(0);
    expect(screen.getByText("Synthetic spoken WAV")).toBeTruthy();
    expect(screen.getByText("Synthetic two-speaker transcript")).toBeTruthy();
    expect(screen.getByText("Local same-page media fixture")).toBeTruthy();
    expect(screen.getByText("Mozilla DeepSpeech smoke-test WAV")).toBeTruthy();
    expect(screen.getByText("100-video corpus proof, wired into Watch")).toBeTruthy();
    expect(screen.getByText("Cable crosstalk rhetoric stress sample")).toBeTruthy();
  });

  it("links back to the app and the flow atlas", () => {
    render(<ProjectValidationPage />);

    expect(screen.getByRole("link", { name: /Open app/i })).toHaveAttribute(
      "href",
      "/session",
    );
    expect(screen.getByRole("link", { name: /Flow atlas/i })).toHaveAttribute(
      "href",
      "/project/flows",
    );
    expect(screen.getByRole("link", { name: /Corpus report/i })).toHaveAttribute(
      "href",
      "/corpus-report/index.html",
    );
  });

  it("links corpus replay rows to functional session samples", () => {
    render(<ProjectValidationPage />);

    expect(screen.getAllByRole("link", { name: /Open functional sample/i })[0])
      .toHaveAttribute("href", "/session?demo=validation&sample=solo_005&view=watch");
    expect(screen.getAllByRole("link", { name: /Open functional sample/i })[1])
      .toHaveAttribute("href", "/session?demo=validation&sample=cable_008&view=watch");
    expect(screen.getAllByRole("link", { name: /Open functional sample/i })[2])
      .toHaveAttribute("href", "/session?demo=validation&sample=israel_010&view=watch");
  });
});
