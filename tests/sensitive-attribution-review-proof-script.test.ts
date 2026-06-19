import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/validation/prove-sensitive-attribution-review.mjs", "utf8");

describe("sensitive attribution review proof script", () => {
  it("is exposed as a package script and writes a stable proof artifact", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

    expect(pkg.scripts["analysis:proof:sensitive-review"]).toBe(
      "node scripts/validation/prove-sensitive-attribution-review.mjs",
    );
    expect(source).toContain("docs/superpowers/validation/sensitive-attribution-review-proof.json");
    expect(source).toContain("docs/superpowers/validation/speaker-attribution-proof.json");
    expect(source).toContain("YENTL_ATTRIBUTION_REVIEW_MANIFEST");
    expect(source).toContain("agent-work/validation/sensitive-attribution-reviews.json");
  });

  it("keys review requirements to the current speaker-attribution proof", () => {
    expect(source).toContain("human_review_required_windows");
    expect(source).toContain("speaker_proof_generated_at");
    expect(source).toContain("manifest speaker_proof_generated_at does not match");
    expect(source).toContain("required_windows");
    expect(source).toContain("required_missing");
  });

  it("requires explicit approval before public launch claims", () => {
    expect(source).toContain("approved_for_public_claims");
    expect(source).toContain("public_claims_allowed");
    expect(source).toContain("review_required_before_public_claims");
    expect(source).toContain("reviewer");
    expect(source).toContain("reviewed_at");
    expect(source).toContain("notes are too short");
    expect(source).toContain("YENTL_ATTRIBUTION_REVIEW_MAX_AGE_DAYS");
  });
});
