import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("speaker attribution proof script", () => {
  const proofSource = readFileSync("scripts/validation/prove-speaker-attribution.ts", "utf8");
  const scorerSource = readFileSync("scripts/test-corpus/score-speaker-attribution.ts", "utf8");
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };

  it("has an analysis proof command for the hard-window speaker attribution gate", () => {
    expect(packageJson.scripts["analysis:proof:speaker-attribution"]).toBe(
      "tsx scripts/validation/prove-speaker-attribution.ts",
    );
    expect(proofSource).toContain("speaker-attribution-hard-windows");
    expect(proofSource).toContain("launch_ready");
    expect(proofSource).toContain("launch_blockers");
    expect(proofSource).toContain("public_claims_review_status");
    expect(proofSource).toContain("human_review_required_windows");
  });

  it("separates quote stance risk from actual unsafe endorsement-risk errors", () => {
    expect(scorerSource).toContain("scoreStanceRisk");
    expect(scorerSource).toContain("non_asserted_claim_spans");
    expect(scorerSource).toContain("unsafe_non_asserted_claim_spans");
    expect(scorerSource).toContain("quoteEndorsementRiskClaims.length");
    expect(scorerSource).toContain('claim.stance === "quoted"');
    expect(scorerSource).toContain('claim.stance === "reported"');
    expect(scorerSource).toContain('claim.stance === "mocked"');
    expect(scorerSource).not.toContain("claims.filter((claim) => claim.stance && claim.stance !== \"asserted\").length");
  });

  it("keeps threshold checks separate from missing-label launch blockers", () => {
    expect(proofSource).toContain("MIN_MEAN_SPEAKER_PURITY");
    expect(proofSource).toContain("MIN_MEAN_CLAIM_OWNER_ACCURACY");
    expect(proofSource).toContain("MIN_WINDOW_SPEAKER_PURITY");
    expect(proofSource).toContain("MIN_WINDOW_CLAIM_OWNER_ACCURACY");
    expect(proofSource).toContain("MIN_UNSAFE_ATTRIBUTION_RECALL");
    expect(proofSource).toContain("MAX_QUOTE_VS_ENDORSEMENT_ERRORS");
    expect(proofSource).toContain("perWindowFailures");
    expect(proofSource).toContain("missing_labels");
    expect(proofSource).toContain("label_status === \"missing\"");
  });

  it("names known source/window mismatches instead of treating every blocker as a label chore", () => {
    expect(proofSource).toContain("SOURCE_BLOCKERS_PATH");
    expect(proofSource).toContain("source_blockers");
    expect(proofSource).toContain("source_mismatch");
    expect(proofSource).toContain("window_mismatch");
    expect(proofSource).toContain("replacement_hint");
  });

  it("keeps sensitivity review status explicit instead of hiding it inside launch_ready", () => {
    expect(proofSource).toContain("reviewRequiredWindows");
    expect(proofSource).toContain("review-required-windows-named");
    expect(proofSource).toContain("review_required_before_public_claims");
    expect(proofSource).toContain("human_review_required_count");
    expect(proofSource).toContain("expected_risk");
  });
});
