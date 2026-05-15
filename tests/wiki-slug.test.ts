import { describe, it, expect } from "vitest";
import { wikiSlugFor, wikiUrlFor } from "@/lib/taxonomy/wiki-slug";

describe("wikiSlugFor", () => {
  it("derives slug from canonical_id for entries without explicit wikipedia_slug", () => {
    // slippery_slope is an entry without an override
    // Default derivation: "slippery_slope" → "Slippery_slope"
    const slug = wikiSlugFor("slippery_slope");
    expect(slug).toBe("Slippery_slope");
  });

  it("uses explicit wikipedia_slug override when present (anchoring_bias → Anchoring_effect)", () => {
    // anchoring_bias has wikipedia_slug: "Anchoring_effect" in book-entries.json
    const slug = wikiSlugFor("anchoring_bias");
    expect(slug).toBe("Anchoring_effect");
  });

  it("returns null for unknown canonical_id", () => {
    const slug = wikiSlugFor("unknown_id_that_does_not_exist");
    expect(slug).toBeNull();
  });
});

describe("wikiUrlFor", () => {
  it("builds full Wikipedia URL from canonical_id", () => {
    const url = wikiUrlFor("slippery_slope");
    expect(url).toBe("https://en.wikipedia.org/wiki/Slippery_slope");
  });

  it("returns null for unknown canonical_id", () => {
    const url = wikiUrlFor("unknown_id_that_does_not_exist");
    expect(url).toBeNull();
  });

  it("uses explicit wikipedia_slug in the URL when override is present", () => {
    // anchoring_bias override: "Anchoring_effect"
    const url = wikiUrlFor("anchoring_bias");
    expect(url).toBe("https://en.wikipedia.org/wiki/Anchoring_effect");
  });
});
