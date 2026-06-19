import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProjectValidationPage from "@/app/project/validation/page";

describe("ProjectValidationPage", () => {
  it("renders the validation lab with every ingest fixture family", () => {
    render(<ProjectValidationPage />);

    expect(screen.getByText("Yentl source validation lab")).toBeTruthy();
    expect(screen.getAllByText("Hans Rosling population box talk").length).toBeGreaterThan(0);
    expect(screen.getByText("Open /session?source=youtube and click Load validation YouTube")).toBeTruthy();
    expect(screen.getByText("Synthetic spoken WAV")).toBeTruthy();
    expect(screen.getByText("Open /session?source=audio-file and click Load validation WAV")).toBeTruthy();
    expect(screen.getByText("Synthetic two-speaker transcript")).toBeTruthy();
    expect(screen.getByText("Open /session?source=text-doc and click Load validation TXT")).toBeTruthy();
    expect(screen.getByText("Small DOCX validation brief")).toBeTruthy();
    expect(screen.getByText("Open /session?source=text-doc and click Load validation DOCX")).toBeTruthy();
    expect(screen.getByText("Small selectable-text PDF")).toBeTruthy();
    expect(screen.getByText("Open /session?source=text-doc and click Load validation PDF")).toBeTruthy();
    expect(screen.getByText("Open /session?source=text-doc and click Load validation VTT")).toBeTruthy();
    expect(screen.getByText("Local validation article")).toBeTruthy();
    expect(screen.getByText("Open /session?source=web-url and click Load validation article")).toBeTruthy();
    expect(screen.getByText("Local same-page media fixture")).toBeTruthy();
    expect(screen.getAllByText("Extension workspace snapshot proof").length).toBeGreaterThan(0);
    expect(screen.getByText("Open /session?demo=validation&sample=extension_snapshot&view=overview")).toBeTruthy();
    expect(screen.getByText("Mozilla DeepSpeech smoke-test WAV")).toBeTruthy();
    expect(screen.getByText("Local validation WAV transcription")).toBeTruthy();
    expect(screen.getByText("Open /session?source=media-url and click Load validation media URL")).toBeTruthy();
    expect(screen.getByText("Standalone validation claim")).toBeTruthy();
    expect(screen.getAllByText("Open /session?source=claim and click Load validation claim").length).toBeGreaterThan(0);
    expect(screen.getByText("100-video corpus proof, wired into Watch")).toBeTruthy();
    expect(screen.getByText("Cable crosstalk rhetoric stress sample")).toBeTruthy();
    expect(screen.getByText("External proof still required")).toBeTruthy();
    expect(screen.getByText("Sensitive attribution editorial review")).toBeTruthy();
    expect(screen.getByText("Physical iOS and Android device canaries")).toBeTruthy();
    expect(screen.getByText("Large real audio/video media canaries")).toBeTruthy();
    expect(screen.getByText("Authenticated cross-device cloud sync")).toBeTruthy();
    expect(screen.getByText("Production current-tree smoke")).toBeTruthy();
    expect(screen.getByText("npm run release:canary-templates")).toBeTruthy();
    expect(screen.getByText("npm run ingestion:proof:large-real-media")).toBeTruthy();
    expect(screen.getByText("YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER='Bearer ...' npm run cloud-sync:proof:deploy")).toBeTruthy();
    expect(screen.getByText("npm run smoke:launch")).toBeTruthy();
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
    expect(screen.getAllByRole("link", { name: /Open functional sample/i })[5])
      .toHaveAttribute("href", "/session?demo=validation&sample=extension_snapshot&view=overview");
  });
});
