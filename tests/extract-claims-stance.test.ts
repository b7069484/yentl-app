import { describe, expect, it } from "vitest";
import { ExtractClaimsResponse, STANCE_VALUES, SYSTEM } from "@/lib/prompts/extract-claims";

describe("extract-claims schema (Phase 1a stance)", () => {
  it("includes the full claim stance enum", () => {
    const claimShape = ExtractClaimsResponse.shape.claims.element.shape;
    expect(claimShape.stance).toBeDefined();
    expect(STANCE_VALUES).toEqual([
      "asserted",
      "denied",
      "quoted",
      "reported",
      "mocked",
      "questioned",
      "corrected",
      "hedged",
      "unclear",
    ]);
  });

  it("defaults stance to asserted for backward compatibility", () => {
    const parsed = ExtractClaimsResponse.parse({
      claims: [
        {
          claim_text: "The city approved a $42 million school repair bond in 2024.",
          utterance_start: 0,
          utterance_end: 5,
          topic: "Politics",
          topic_secondary: null,
        },
      ],
    });

    expect(parsed.claims[0].stance).toBe("asserted");
  });

  it("accepts non-asserted claim stances", () => {
    const parsed = ExtractClaimsResponse.parse({
      claims: [
        {
          claim_text: "The prior speaker said the audit was hidden.",
          utterance_start: 1,
          utterance_end: 3,
          topic: "Law",
          topic_secondary: null,
          stance: "quoted",
        },
      ],
    });

    expect(parsed.claims[0].stance).toBe("quoted");
  });

  it("system prompt instructs the model to populate stance", () => {
    expect(SYSTEM.toLowerCase()).toContain("stance");
    expect(SYSTEM).toMatch(/asserted|quoted|hedged/i);
  });
});
