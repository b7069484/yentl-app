import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("analysis local proof script", () => {
  const source = readFileSync("scripts/validation/prove-analysis-local.mjs", "utf8");

  it("replays validation corpus samples and scores speaker attribution", () => {
    expect(source).toContain('runCheck(`corpus-replay-${id}`');
    expect(source).toContain("cable_008,solo_005,interview_002");
    expect(source).toContain('runCheck("speaker-attribution-score"');
  });

  it("asserts ownership, rhetoric, attribution, and verification quality gates", () => {
    expect(source).toContain("YENTL_ANALYSIS_PROOF_VERIFY");
    expect(source).toContain("assertVerificationOutcomes");
    expect(source).toContain("speaker_id");
    expect(source).toContain("mean_speaker_purity");
    expect(source).toContain("mean_claim_owner_accuracy");
    expect(source).toContain("speaker-attribution-report.json");
    expect(source).toContain("analysis-deploy-${VERIFY_MODE}-proof.json");
    expect(source).toContain("backupReplayFixtures");
    expect(source).toContain("restoreReplayFixtures");
    expect(source).toContain("replay-deploy");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/analysis-local-proof.json");
    expect(source).toContain("deploy_proof");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});