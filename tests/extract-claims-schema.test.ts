import { describe, expect, it } from "vitest";
import { ExtractClaimsResponse } from "@/lib/prompts/extract-claims";

describe("ExtractClaimsResponse", () => {
  it("accepts a claim with primary + secondary topic", () => {
    const parsed = ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "Joe Kent, NCTC Director, resigned over Iran policy.",
        utterance_start: 0,
        utterance_end: 5,
        topic: "Politics",
        topic_secondary: "Defense",
      }],
    });
    expect(parsed.claims[0].topic).toBe("Politics");
    expect(parsed.claims[0].topic_secondary).toBe("Defense");
  });

  it("accepts null topic_secondary", () => {
    const parsed = ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "The U.S. unemployment rate hit 3.4% in 2023.",
        utterance_start: 0,
        utterance_end: 5,
        topic: "Economy",
        topic_secondary: null,
      }],
    });
    expect(parsed.claims[0].topic_secondary).toBeNull();
  });

  it("rejects a claim missing both topic fields", () => {
    expect(() => ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "X is true.",
        utterance_start: 0,
        utterance_end: 1,
      }],
    })).toThrow();
  });

  it("rejects a claim with unknown topic", () => {
    expect(() => ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "X is true.",
        utterance_start: 0,
        utterance_end: 1,
        topic: "Sports",
        topic_secondary: null,
      }],
    })).toThrow();
  });

  it("rejects a claim missing topic_secondary entirely", () => {
    expect(() => ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "X is true.",
        utterance_start: 0,
        utterance_end: 1,
        topic: "Economy",
      }],
    })).toThrow();
  });
});
