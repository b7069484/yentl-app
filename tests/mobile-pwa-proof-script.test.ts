import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile PWA local proof script", () => {
  const source = readFileSync("scripts/validation/prove-mobile-pwa-local.mjs", "utf8");

  it("checks the mobile/PWA entry routes at launch-critical widths", () => {
    expect(source).toContain("const WIDTHS = [390, 430, 768]");
    expect(source).toContain('slug: "mobile-start"');
    expect(source).toContain('path: "/mobile"');
    expect(source).toContain("NATIVE SHELL STATUS");
    expect(source).toContain("Installable web app first");
    expect(source).toContain('slug: "source-youtube"');
    expect(source).toContain('slug: "source-web-url"');
    expect(source).toContain('slug: "source-media-url"');
    expect(source).toContain('slug: "source-audio-file"');
    expect(source).toContain("Audio/video upload");
    expect(source).toContain('slug: "source-text-doc"');
    expect(source).toContain('slug: "source-claim-quick-check"');
    expect(source).toContain('slug: "source-browser-tab-limit"');
    expect(source).toContain('slug: "extension-snapshot-workspace"');
    expect(source).toContain('path: "/session?demo=validation&sample=extension_snapshot&view=overview"');
    expect(source).toContain("Live tab sync is not assumed");
    expect(source).toContain('slug: "share-target-text"');
    expect(source).toContain('slug: "share-target-web-url"');
    expect(source).toContain('slug: "share-target-media-url"');
    expect(source).toContain('slug: "share-target-video-url"');
    expect(source).toContain("https://example.com/clip.mp4");
    expect(source).toContain('slug: "auth-signin-return-source"');
    expect(source).toContain('slug: "auth-signup-return-library"');
    expect(source).toContain('slug: "auth-signin-unsafe-return"');
    expect(source).toContain('path: "/tv?demo=validation&sample=cable_008"');
    expect(source).toContain('slug: "room-mode-extension-snapshot"');
    expect(source).toContain('path: "/tv?demo=validation&sample=extension_snapshot"');
    expect(source).toContain('/session?demo=validation&sample=extension_snapshot&view=overview');
    expect(source).toContain("route.waitMs");
    expect(source).toContain("forbiddenText");
  });

  it("fails on horizontal overflow, missing route text, and console/runtime errors", () => {
    expect(source).toContain("overflowX > 1");
    expect(source).toContain("missing expected text");
    expect(source).toContain("forbidden text present");
    expect(source).toContain("console/runtime error");
    expect(source).toContain("Runtime.exceptionThrown");
    expect(source).toContain("Runtime.consoleAPICalled");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain('?? "http://localhost:3000"');
    expect(source).toContain("docs/superpowers/validation/mobile-pwa-local-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});
