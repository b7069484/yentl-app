import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/validation/prove-mobile-device-canary.mjs", "utf8");

describe("mobile device canary proof script", () => {
  it("is exposed as a package script and writes a stable proof artifact", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

    expect(pkg.scripts["mobile:proof:devices"]).toBe("node scripts/validation/prove-mobile-device-canary.mjs");
    expect(source).toContain("docs/superpowers/validation/mobile-device-canary-proof.json");
    expect(source).toContain("YENTL_DEVICE_CANARY_ORIGIN");
    expect(source).toContain("YENTL_DEVICE_CANARY_MANIFEST");
    expect(source).toContain("agent-work/validation/mobile-device-canaries.json");
  });

  it("requires both real iOS and Android device runs", () => {
    expect(source).toContain('REQUIRED_PLATFORMS = ["ios", "android"]');
    expect(source).toContain("device_model");
    expect(source).toContain("os_version");
    expect(source).toContain("browser");
    expect(source).toContain("tested_at");
    expect(source).toContain("YENTL_DEVICE_CANARY_MAX_AGE_DAYS");
  });

  it("requires the launch-critical mobile flows that emulation cannot prove", () => {
    expect(source).toContain("share_text");
    expect(source).toContain("share_web_url");
    expect(source).toContain("share_media_url");
    expect(source).toContain("file_picker_audio_video");
    expect(source).toContain("file_picker_text_document");
    expect(source).toContain("microphone_capture");
    expect(source).toContain("pwa_install_open");
    expect(source).toContain("saved_session_restore");
  });

  it("requires production origin and non-empty evidence files", () => {
    expect(source).toContain("physical device proof must target a deployed origin");
    expect(source).toContain("production_like");
    expect(source).toContain("flow.status === \"pass\"");
    expect(source).toContain("flow.evidence");
    expect(source).toContain("evidence does not exist");
    expect(source).toContain("evidence is empty");
  });
});
