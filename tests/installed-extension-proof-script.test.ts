import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("installed extension local proof script", () => {
  const source = readFileSync("scripts/validation/prove-installed-extension-local.mjs", "utf8");

  it("uses Chrome for Testing and a visible temp profile by default", () => {
    expect(source).toContain("chromeForTestingExecutables()");
    expect(source).toContain('const HEADLESS = process.env.YENTL_EXTENSION_PROOF_HEADLESS === "1"');
    expect(source).toContain("real_user_profile_used: false");
  });

  it("only treats Yentl's background worker as the loaded extension", () => {
    expect(source).toContain('target.url.endsWith("/background.js")');
    expect(source).toContain("yentlServiceWorkers");
  });

  it("keeps panel injection and live audio proof as separate gates", () => {
    expect(source).toContain("panel_injection_proven");
    expect(source).toContain("tab_capture_stream_id_available");
    expect(source).toContain("live_transcription_proven: Boolean");
    expect(source).toContain("transcriptProbe?.liveTranscriptionProven");
  });

  it("can try a real OS-level extension shortcut without using the user's profile", () => {
    expect(source).toContain('const SHORTCUT_STRATEGY = process.env.YENTL_EXTENSION_PROOF_SHORTCUT_STRATEGY ?? (HEADLESS ? "cdp" : "os")');
    expect(source).toContain("pressOsExtensionShortcut");
    expect(source).toContain('tell application "System Events" to keystroke "y"');
  });

  it("records extension capture diagnostics separately from the fallback injection", () => {
    expect(source).toContain("extension_diagnostics_after_shortcut");
    expect(source).toContain("captureState");
    expect(source).toContain("badgeText");
  });

  it("has an explicit manual capture mode for the real tabCapture user-gesture gate", () => {
    expect(source).toContain("YENTL_EXTENSION_PROOF_MANUAL_CAPTURE");
    expect(source).toContain("waitForManualCapture");
    expect(source).toContain("Manual capture mode did not observe");
  });

  it("probes the panel iframe for known validation transcript evidence", () => {
    expect(source).toContain("YENTL_EXTENSION_PROOF_TRANSCRIPT_WAIT_MS");
    expect(source).toContain("waitForTranscriptEvidence");
    expect(source).toContain("media_playback_after_capture");
    expect(source).toContain("city library budget increased");
    expect(source).toContain("iframeText");
  });
});
