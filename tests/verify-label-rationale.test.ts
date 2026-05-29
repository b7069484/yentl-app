import { describe, it, expect } from "vitest";
import { VerifyProvisionalResponse } from "@/lib/prompts/verify-provisional";
import { VerifyConfirmedResponse } from "@/lib/prompts/verify-confirmed";

describe("Phase 1c Task 2 — label_rationale field on verify schemas", () => {
  it("VerifyProvisionalResponse requires label_rationale", () => {
    const ok = VerifyProvisionalResponse.safeParse({
      primary_label: "FALSE",
      score: 75,
      annotations: ["off by an order of magnitude"],
      explanation: "Budget rose 12%, not 100%.",
      label_rationale: "Picked FALSE over MIXED because the magnitude is not just imprecise but inverted.",
    });
    expect(ok.success).toBe(true);

    const missing = VerifyProvisionalResponse.safeParse({
      primary_label: "FALSE",
      score: 75,
      annotations: [],
      explanation: "Budget rose 12%, not 100%.",
    });
    expect(missing.success).toBe(false);
  });

  it("VerifyConfirmedResponse requires label_rationale", () => {
    const ok = VerifyConfirmedResponse.safeParse({
      primary_label: "PARTIAL",
      score: 60,
      annotations: ["timeframe matters"],
      explanation: "The figure is correct for FY24 but the claim implied a longer trend.",
      label_rationale: "Chose PARTIAL over MOSTLY_TRUE because the supporting evidence covers only one fiscal year.",
      stance_refs: [],
    });
    expect(ok.success).toBe(true);

    const missing = VerifyConfirmedResponse.safeParse({
      primary_label: "PARTIAL",
      score: 60,
      annotations: [],
      explanation: "Partial.",
      stance_refs: [],
    });
    expect(missing.success).toBe(false);
  });

  it("label_rationale is bounded to a single-paragraph sentence (max 400 chars)", () => {
    const oversized = VerifyProvisionalResponse.safeParse({
      primary_label: "FALSE",
      score: 75,
      annotations: [],
      explanation: "x",
      label_rationale: "x".repeat(401),
    });
    expect(oversized.success).toBe(false);
  });
});
