import { describe, it, expect } from "vitest";
import { ProposalSchema, FurtherReadingSchema } from "@/scripts/enrich-taxonomy";

const VALID_PROPOSAL = {
  canonical_id: "slippery_slope",
  how_to_spot: [
    "Listen for chain-of-consequence predictions with no evidence linking steps.",
    "Watch for extreme end-states presented as inevitable outcomes.",
    "Note emotionally charged language escalating from minor action to catastrophe.",
    "Check whether any intermediate steps are actually argued or just asserted.",
  ],
  further_reading: [
    {
      source: "wikipedia" as const,
      slug_or_path: "Slippery_slope",
      title: "Slippery slope",
      mins: 8,
    },
    {
      source: "sep" as const,
      slug_or_path: "slippery-slope-arguments",
      title: "Slippery Slope Arguments",
      mins: 20,
    },
  ],
  related_canonical_ids: [
    "fear_appeal",
    "catastrophizing",
    "false_dilemma",
    "post_hoc",
  ],
};

describe("ProposalSchema", () => {
  it("accepts a fully-populated valid proposal", () => {
    const result = ProposalSchema.safeParse(VALID_PROPOSAL);
    expect(result.success).toBe(true);
  });

  it("accepts a proposal with optional wikipedia_slug", () => {
    const withSlug = { ...VALID_PROPOSAL, wikipedia_slug: "Slippery_slope" };
    const result = ProposalSchema.safeParse(withSlug);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.wikipedia_slug).toBe("Slippery_slope");
  });

  it("accepts a proposal without wikipedia_slug", () => {
    const withoutSlug = { ...VALID_PROPOSAL };
    const result = ProposalSchema.safeParse(withoutSlug);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.wikipedia_slug).toBeUndefined();
  });

  it("rejects how_to_spot with fewer than 3 bullets", () => {
    const bad = { ...VALID_PROPOSAL, how_to_spot: ["Short bullet one.", "Short bullet two."] };
    const result = ProposalSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects how_to_spot with more than 5 bullets", () => {
    const bad = {
      ...VALID_PROPOSAL,
      how_to_spot: [
        "Bullet one that is long enough.",
        "Bullet two that is long enough.",
        "Bullet three that is long enough.",
        "Bullet four that is long enough.",
        "Bullet five that is long enough.",
        "Bullet six that is long enough.",
      ],
    };
    const result = ProposalSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects a how_to_spot bullet shorter than 8 characters", () => {
    const bad = {
      ...VALID_PROPOSAL,
      how_to_spot: ["Short.", "Another valid bullet sentence here.", "Yet another valid bullet sentence."],
    };
    const result = ProposalSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects further_reading with 0 entries", () => {
    const bad = { ...VALID_PROPOSAL, further_reading: [] };
    const result = ProposalSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects further_reading with more than 4 entries", () => {
    const entry = VALID_PROPOSAL.further_reading[0];
    const bad = {
      ...VALID_PROPOSAL,
      further_reading: [entry, entry, entry, entry, entry],
    };
    const result = ProposalSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects related_canonical_ids with fewer than 3 entries", () => {
    const bad = { ...VALID_PROPOSAL, related_canonical_ids: ["fear_appeal", "catastrophizing"] };
    const result = ProposalSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects related_canonical_ids with more than 8 entries", () => {
    const bad = {
      ...VALID_PROPOSAL,
      related_canonical_ids: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    };
    const result = ProposalSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

describe("FurtherReadingSchema", () => {
  it("accepts a wikipedia entry without mins", () => {
    const result = FurtherReadingSchema.safeParse({
      source: "wikipedia",
      slug_or_path: "Slippery_slope",
      title: "Slippery slope",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mins).toBeUndefined();
  });

  it("mins is optional and accepted when present", () => {
    const result = FurtherReadingSchema.safeParse({
      source: "sep",
      slug_or_path: "slippery-slope-arguments",
      title: "Slippery Slope Arguments",
      mins: 15,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mins).toBe(15);
  });

  it("accepts an other entry with a full URL", () => {
    const result = FurtherReadingSchema.safeParse({
      source: "other",
      slug_or_path: "https://example.com/article",
      title: "Example Article",
      mins: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown source type", () => {
    const result = FurtherReadingSchema.safeParse({
      source: "reddit",
      slug_or_path: "r/somepath",
      title: "Reddit post",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty slug_or_path", () => {
    const result = FurtherReadingSchema.safeParse({
      source: "wikipedia",
      slug_or_path: "",
      title: "Some title",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mins below 3", () => {
    const result = FurtherReadingSchema.safeParse({
      source: "wikipedia",
      slug_or_path: "Slippery_slope",
      title: "Slippery slope",
      mins: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects mins above 60", () => {
    const result = FurtherReadingSchema.safeParse({
      source: "wikipedia",
      slug_or_path: "Slippery_slope",
      title: "Slippery slope",
      mins: 61,
    });
    expect(result.success).toBe(false);
  });
});
