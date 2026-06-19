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
    expect(source).toContain("deepgram_socket_open_proven");
    expect(source).toContain("offscreen_audio_chunks_proven");
    expect(source).toContain("panel_transcript_status_proven");
    expect(source).toContain("live_transcription_proven: Boolean");
    expect(source).toContain("transcriptProbe?.liveTranscriptionProven");
    expect(source).toContain("hasOffscreenTranscriptEvidence");
    expect(source).toContain("hasPanelTranscriptStatus");
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
    expect(source).toContain("offscreenDiagnostics");
    expect(source).toContain("diagnostics-request");
    expect(source).toContain("extension_diagnostics_after_transcript");
  });

  it("has an explicit manual capture mode for the real tabCapture user-gesture gate", () => {
    expect(source).toContain("YENTL_EXTENSION_PROOF_MANUAL_CAPTURE");
    expect(source).toContain("YENTL_EXTENSION_PROOF_POPUP_AUTOMATION");
    expect(source).toContain("invokePopupStartButton");
    expect(source).toContain("waitForManualCapture");
    expect(source).toContain("waitForCaptureDiagnostics");
    expect(source).toContain("extension-shortcut-wake-before-popup");
    expect(source).toContain("popup_click_proven");
    expect(source).toContain("Manual capture mode did not observe");
  });

  it("supports an external real-page proof mode with a separate artifact", () => {
    expect(source).toContain("YENTL_EXTENSION_PROOF_TARGET_URL");
    expect(source).toContain("installed-extension-external-proof.json");
    expect(source).toContain("hasPageTextEvidence");
    expect(source).toContain("commons.wikimedia.org");
    expect(source).toContain("resolved_target_url");
    expect(source).toContain("resolvedTargetUrl");
    expect(source).toContain("readCurrentPageUrl");
    expect(source).toContain("targetId: pageTarget.id");
  });

  it("probes the panel iframe for known validation transcript evidence", () => {
    expect(source).toContain("YENTL_EXTENSION_PROOF_TRANSCRIPT_WAIT_MS");
    expect(source).toContain("YENTL_EXTENSION_PROOF_REQUIRED_TRANSCRIPT");
    expect(source).toContain("waitForTranscriptEvidence");
    expect(source).toContain("media_playback_after_capture");
    expect(source).toContain("city library budget increased");
    expect(source).toContain("iframeText");
    expect(source).toContain("requiredTranscriptProven");
    expect(source).toContain("!REQUIRED_TRANSCRIPT_PHRASE || proof.required_transcript_proven");
    expect(source).toContain("YENTL_EXTENSION_PROOF_REQUIRE_LIVE_TRANSCRIPT");
    expect(source).toContain("!REQUIRE_LIVE_TRANSCRIPT || proof.live_transcription_proven");
  });

  it("starts fixture media playback without a hidden ReferenceError", () => {
    expect(source).toContain('const mediaCandidates = Array.from(document.querySelectorAll("audio, video"))');
    expect(source).toContain("result.exceptionDetails");
    expect(source).not.toContain("[audio, video].filter(Boolean)");
  });

  it("records JSON-safe external media playback diagnostics", () => {
    expect(source).toContain("targetPreference: preferredTarget");
    expect(source).toContain("candidates: ranked.map((entry) => entry.summary)");
    expect(source).toContain("attempts.push(summary)");
    expect(source).toContain("JSON.parse(JSON.stringify");
    expect(source).toContain("media.scrollIntoView");
  });

  it("has a hard timeout for wedged external proof runs", () => {
    expect(source).toContain("YENTL_EXTENSION_PROOF_HARD_TIMEOUT_MS");
    expect(source).toContain("activeChrome");
    expect(source).toContain("stopActiveProofProcess");
    expect(source).toContain("process.exit(124)");
  });

  it("does not treat a generic connected status as page text evidence", () => {
    const hasPageTextEvidenceBody = source.slice(
      source.indexOf("function hasPageTextEvidence"),
      source.indexOf("async function readPageCaptureState"),
    );

    expect(hasPageTextEvidenceBody).toContain('event.detail?.type === "page-text"');
    expect(hasPageTextEvidenceBody).not.toContain("Yentl is connected to this tab");
  });

  it("reports missing required external transcript text directly", () => {
    expect(source).toContain("required_transcript_phrase");
    expect(source).toContain("require_live_transcript");
    expect(source).toContain("Tab capture ran, but the required transcript phrase was not observed");
    expect(source).toContain("Tab capture ran, but no live transcript evidence was observed before the timeout");
    expect(source).toContain("External tab capture ran, but no live transcript evidence was observed before the timeout");
  });

  it("records repeatable latency measurements in the proof artifact", () => {
    expect(source).toContain("buildLatencyMetrics");
    expect(source).toContain("latency_ms");
    expect(source).toContain("first_transcript_wait_ms");
    expect(source).toContain("capture_invocation_ms");
  });
});
