import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("synthesis meta-read proof script", () => {
  const source = readFileSync("scripts/validation/prove-synthesis-metaread.ts", "utf8");

  it("covers the expected corpus-style meta-read cases", () => {
    expect(source).toContain("thin-live-window");
    expect(source).toContain("good-faith-full-session-strong-sources");
    expect(source).toContain("bad-faith-risk-pattern");
    expect(source).toContain("quoted-reported-uncertainty");
    expect(source).toContain("mixed-full-session-partial-evidence");
  });

  it("writes a stable validation artifact and uses the shared scorer", () => {
    expect(source).toContain("docs/superpowers/validation/synthesis-metaread-proof.json");
    expect(source).toContain("buildSynthesisMetaRead");
    expect(source).toContain("sanitizeSynthesisMetaRead");
    expect(source).toContain("assessSynthesisMetaReadQuality");
    expect(source).toContain("raw_quality");
    expect(source).toContain("quality");
  });
});
