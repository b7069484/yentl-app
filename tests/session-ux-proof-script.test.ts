import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("session UX local proof script", () => {
  const source = readFileSync("scripts/validation/prove-session-ux-local.mjs", "utf8");

  it("walks validation demo session routes at desktop and mobile widths", () => {
    expect(source).toContain('slug: "validation-overview"');
    expect(source).toContain('path: "/session?demo=validation&sample=cable_008&view=overview"');
    expect(source).toContain('slug: "detail-claim-populated"');
    expect(source).toContain('slug: "learn-marker-populated"');
    expect(source).toContain('slug: "learn-claim-populated"');
    expect(source).toContain('slug: "source-switch-dialog"');
    expect(source).toContain('slug: "validation-claims-mobile"');
    expect(source).toContain('slug: "validation-transcript-mobile"');
    expect(source).toContain('slug: "validation-claims"');
    expect(source).toContain('slug: "validation-markers"');
    expect(source).toContain('slug: "validation-transcript"');
    expect(source).toContain('slug: "end-session-dialog"');
    expect(source).toContain('slug: "export-report-preview"');
    expect(source).toContain('slug: "share-target-text-mobile"');
    expect(source).toContain('path: "/tv?demo=validation&sample=cable_008"');
  });

  it("fails on horizontal overflow, missing route text, and console/runtime errors", () => {
    expect(source).toContain("overflowX > 1");
    expect(source).toContain("missing expected text");
    expect(source).toContain("console/runtime error");
    expect(source).toContain("Runtime.exceptionThrown");
    expect(source).toContain("isIgnorableRuntimeIssue");
    expect(source).toContain("waitForValidationHydratedScript");
    expect(source).toContain("Preview report");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/session-ux-local-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});