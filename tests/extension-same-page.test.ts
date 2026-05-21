import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Chrome extension same-page panel wiring", () => {
  it("has permission to inject the Yentl panel into the clicked media page", () => {
    const manifest = JSON.parse(read("extension/manifest.json"));
    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.permissions).toContain("scripting");
    expect(manifest.permissions).toContain("tabCapture");
  });

  it("injects the content script and opens an in-page panel instead of creating a separate session tab", () => {
    const background = read("extension/background.js");
    expect(background).toContain("injectYentlPanel");
    expect(background).toContain("chrome.scripting.executeScript");
    expect(background).toContain('type: "open-panel"');
    expect(background).not.toContain("chrome.tabs.create");
  });

  it("renders a same-page iframe panel with a bridge token for app messages", () => {
    const contentScript = read("extension/content-script.js");
    expect(contentScript).toContain("Yentl analysis panel");
    expect(contentScript).toContain('src.searchParams.set("surface", "extension-panel")');
    expect(contentScript).toContain('src.searchParams.set("bridge", panelBridgeToken)');
    expect(contentScript).toContain("panelIframe.contentWindow.postMessage");
  });

  it("extracts readable text from the active page so article pages work without media", () => {
    const contentScript = read("extension/content-script.js");
    const bridge = read("components/session/ExtensionBridge.tsx");
    expect(contentScript).toContain("collectPageTextSnapshot");
    expect(contentScript).toContain('type: "page-text"');
    expect(contentScript).toContain("extractReadablePageText");
    expect(contentScript).toContain(".mw-parser-output");
    expect(bridge).toContain('type: "page-text"');
    expect(bridge).toContain("appendPageText");
  });

  it("documents real external validation pages for video and article analysis", () => {
    const fixtures = read("lib/validation/fixtures.ts");
    expect(fixtures).toContain("browser-tab-real-video-page");
    expect(fixtures).toContain("browser-page-real-text");
    expect(fixtures).toContain("commons.wikimedia.org");
    expect(fixtures).toContain("en.wikinews.org");
  });

  it("forwards offscreen capture status so the panel can show connected/no-speech states", () => {
    const background = read("extension/background.js");
    const offscreen = read("extension/offscreen.js");
    expect(background).toContain('message.type === "capture-status"');
    expect(offscreen).toContain("NO_TRANSCRIPT_NOTICE_MS");
    expect(offscreen).toContain('phase: "no_audio_detected"');
    expect(offscreen).toContain('sendBackground("capture-status"');
  });

  it("has a realistic same-page preview instead of a bare media-player mock", () => {
    const preview = read("public/validation/extension-panel-preview.html");
    expect(preview).toContain("Civic Ledger");
    expect(preview).toContain("City budget hearing centers");
    expect(preview).toContain("representative third-party webpage");
    expect(preview).toContain("class=\"yentl-panel\"");
    expect(preview).toContain("demo=validation");
  });
});
