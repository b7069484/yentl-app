import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile PWA local proof script", () => {
  const source = readFileSync("scripts/validation/prove-mobile-pwa-local.mjs", "utf8");

  it("checks the mobile/PWA entry routes at launch-critical widths", () => {
    expect(source).toContain("const WIDTHS = [390, 430, 768]");
    expect(source).toContain('slug: "mobile-start"');
    expect(source).toContain('path: "/mobile"');
    expect(source).toContain('slug: "share-target-text"');
    expect(source).toContain('path: "/tv?demo=validation&sample=cable_008"');
  });

  it("fails on horizontal overflow, missing route text, and console/runtime errors", () => {
    expect(source).toContain("overflowX > 1");
    expect(source).toContain("missing expected text");
    expect(source).toContain("console/runtime error");
    expect(source).toContain("Runtime.exceptionThrown");
    expect(source).toContain("Runtime.consoleAPICalled");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/mobile-pwa-local-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});
