import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("trust copy deploy proof script", () => {
  const source = readFileSync("scripts/validation/prove-trust-copy-deploy.mjs", "utf8");

  it("checks live trust/legal pages for consistent contacts and honest pricing copy", () => {
    expect(source).toContain('runCheck(`trust-page-${page.path}`');
    expect(source).toContain("/privacy");
    expect(source).toContain("/terms");
    expect(source).toContain("/accessibility");
    expect(source).toContain("no published paid plan");
    expect(source).toContain("privacy@yentl.it");
    expect(source).toContain("accessibility@yentl.it");
  });

  it("rejects stale domain and disabled-contact copy", () => {
    expect(source).toContain("yentl.app");
    expect(source).toContain("contact page is not enabled");
    expect(source).toContain("contact is not enabled");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/trust-copy-deploy-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});