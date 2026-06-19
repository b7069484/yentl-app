import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSyntheticPanelValidationFile,
  isSyntheticPanelValidationUrl,
  syntheticPanelTranscriptionFixture,
  syntheticPanelValidationFile,
  syntheticPanelValidationMedia,
} from "@/lib/server/validation-media-fixtures";

describe("validation media fixtures", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("recognizes only exact local synthetic media URLs", () => {
    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/yentl-synthetic-panel.wav")).toBe(true);
    expect(isSyntheticPanelValidationUrl("http://127.0.0.1:3000/validation/yentl-synthetic-panel.wav")).toBe(true);
    expect(isSyntheticPanelValidationUrl("/validation/yentl-synthetic-panel.wav")).toBe(true);
    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/yentl-synthetic-panel.mp4")).toBe(true);
    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/yentl-synthetic-panel.mov")).toBe(true);
    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/yentl-synthetic-panel.webm")).toBe(true);
    expect(syntheticPanelValidationMedia("http://localhost:3000/validation/yentl-synthetic-panel.mp4")?.id).toBe(
      "yentl_synthetic_panel_mp4",
    );
    expect(syntheticPanelValidationMedia("http://localhost:3000/validation/yentl-synthetic-panel.mov")?.id).toBe(
      "yentl_synthetic_panel_mov",
    );
    expect(syntheticPanelValidationMedia("http://localhost:3000/validation/yentl-synthetic-panel.webm")?.id).toBe(
      "yentl_synthetic_panel_webm",
    );
    expect(isSyntheticPanelValidationUrl("https://example.com/validation/yentl-synthetic-panel.wav")).toBe(false);
    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/other.wav")).toBe(false);
  });

  it("recognizes exact synthetic media file names and MIME types", () => {
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.wav", { type: "audio/wav" }))).toBe(true);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.mp4", { type: "video/mp4" }))).toBe(true);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.mov", { type: "video/quicktime" }))).toBe(true);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.webm", { type: "video/webm" }))).toBe(true);
    expect(syntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.mp4", { type: "video/mp4" }))?.id).toBe(
      "yentl_synthetic_panel_mp4",
    );
    expect(syntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.mov", { type: "video/quicktime" }))?.id).toBe(
      "yentl_synthetic_panel_mov",
    );
    expect(syntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.webm", { type: "video/webm" }))?.id).toBe(
      "yentl_synthetic_panel_webm",
    );
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.wav", { type: "audio/mpeg" }))).toBe(false);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.mp4", { type: "audio/wav" }))).toBe(false);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.mov", { type: "video/mp4" }))).toBe(false);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.webm", { type: "video/mp4" }))).toBe(false);
    expect(isSyntheticPanelValidationFile(new File(["x"], "other.wav", { type: "audio/wav" }))).toBe(false);
  });

  it("is disabled by the validation demo kill switch", () => {
    vi.stubEnv("YENTL_DISABLE_VALIDATION_DEMO", "1");

    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/yentl-synthetic-panel.wav")).toBe(false);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.wav", { type: "audio/wav" }))).toBe(false);
  });

  it("lets the validation demo kill switch override an explicit enable flag", () => {
    vi.stubEnv("YENTL_ENABLE_VALIDATION_DEMO", "1");
    vi.stubEnv("YENTL_DISABLE_VALIDATION_DEMO", "1");

    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/yentl-synthetic-panel.wav")).toBe(false);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.wav", { type: "audio/wav" }))).toBe(false);
  });

  it("returns a two-speaker validation transcript with confident attribution", () => {
    const fixture = syntheticPanelTranscriptionFixture();

    expect(fixture.validation_fixture).toBe(true);
    expect(fixture.utterances).toHaveLength(5);
    expect(fixture.utterances.map((segment) => segment.start)).toEqual([0, 4, 10, 17, 25]);
    expect(fixture.utterances.map((segment) => segment.speaker_id)).toEqual([0, 0, 1, 0, 1]);
    expect(fixture.utterances.every((segment) => segment.attribution_status === "confident")).toBe(true);
    expect(fixture.speakers).toEqual([
      { id: 0, label: "Moderator" },
      { id: 1, label: "Analyst" },
    ]);
  });
});
