import { describe, it, expect } from "vitest";
import { EXTRACT_CLAIMS_SCHEMA, EXTRACT_CLAIMS_SYSTEM } from "@/lib/prompts/extract-claims";

describe("extract-claims schema (Phase 1a — stance)", () => {
  it("includes stance enum in the claim schema", () => {
    const claimShape = EXTRACT_CLAIMS_SCHEMA.shape.claims.element.shape;
    expect(claimShape.stance).toBeDefined();
    // z.enum(...).default(...) wraps in ZodDefault; options live on the inner ZodEnum
    const stanceField = claimShape.stance as { options?: string[]; _def?: { innerType?: { options?: string[] } } };
    const stanceOptions = stanceField.options ?? stanceField._def?.innerType?.options;
    expect(stanceOptions).toEqual(
      expect.arrayContaining([
        "asserted",
        "denied",
        "quoted",
        "reported",
        "mocked",
        "questioned",
        "corrected",
        "hedged",
        "unclear",
      ]),
    );
  });

  it("system prompt instructs the model to populate stance", () => {
    expect(EXTRACT_CLAIMS_SYSTEM.toLowerCase()).toContain("stance");
    expect(EXTRACT_CLAIMS_SYSTEM).toMatch(/asserted|quoted|hedged/i);
  });
});
