import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSyntheticPanelValidationFile,
  isSyntheticPanelValidationUrl,
  syntheticPanelTranscriptionFixture,
} from "@/lib/server/validation-media-fixtures";

describe("validation media fixtures", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("recognizes only the exact local synthetic WAV URL", () => {
    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/yentl-synthetic-panel.wav")).toBe(true);
    expect(isSyntheticPanelValidationUrl("http://127.0.0.1:3000/validation/yentl-synthetic-panel.wav")).toBe(true);
    expect(isSyntheticPanelValidationUrl("/validation/yentl-synthetic-panel.wav")).toBe(true);
    expect(isSyntheticPanelValidationUrl("https://example.com/validation/yentl-synthetic-panel.wav")).toBe(false);
    expect(isSyntheticPanelValidationUrl("http://localhost:3000/validation/other.wav")).toBe(false);
  });

  it("recognizes the exact synthetic WAV file name and MIME", () => {
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.wav", { type: "audio/wav" }))).toBe(true);
    expect(isSyntheticPanelValidationFile(new File(["x"], "yentl-synthetic-panel.wav", { type: "audio/mpeg" }))).toBe(false);
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
