import { describe, it, expect } from "vitest";
import { ALL, getEntry, entriesByType, totalCount } from "@/lib/taxonomy";
import { isArchetype } from "@/lib/taxonomy/archetypes";

describe("taxonomy", () => {
  it("contains 123 entries", () => {
    expect(totalCount()).toBe(123);
  });

  it("includes all 55 book entries", () => {
    expect(ALL.filter((e) => e.source === "book").length).toBe(55);
  });

  it("includes 68 extras", () => {
    expect(ALL.filter((e) => e.source === "extra").length).toBe(68);
  });

  it("has unique canonical ids", () => {
    const ids = ALL.map((e) => e.canonical_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("known ids resolve", () => {
    expect(getEntry("anchoring_bias")?.source).toBe("book");
    expect(getEntry("halo_effect")?.source).toBe("extra");
    expect(getEntry("loaded_language")?.type).toBe("rhetoric");
  });

  it("entriesByType partitions correctly", () => {
    expect(entriesByType("rhetoric").length).toBe(15);
  });
});

describe("taxonomy — archetype coverage", () => {
  it("every entry has a valid archetype", () => {
    const missing = ALL.filter((e) => !e.archetype || !isArchetype(e.archetype));
    expect(missing.map((e) => e.canonical_id)).toEqual([]);
  });
});

describe("taxonomy — enrichment coverage", () => {
  it("every entry has at least 2 how_to_spot bullets", () => {
    const missing = ALL.filter((e) => !e.how_to_spot || e.how_to_spot.length < 2);
    expect(missing.map((e) => e.canonical_id)).toEqual([]);
  });

  it("every entry has at least 1 further_reading entry", () => {
    const missing = ALL.filter((e) => !e.further_reading || e.further_reading.length < 1);
    expect(missing.map((e) => e.canonical_id)).toEqual([]);
  });

  it("every entry has at least 3 related_canonical_ids", () => {
    const missing = ALL.filter(
      (e) => !e.related_canonical_ids || e.related_canonical_ids.length < 3,
    );
    expect(missing.map((e) => e.canonical_id)).toEqual([]);
  });

  it("all related_canonical_ids resolve to real entries", () => {
    const allIds = new Set(ALL.map((e) => e.canonical_id));
    const dangling: Array<{ from: string; to: string }> = [];
    for (const e of ALL) {
      for (const id of e.related_canonical_ids ?? []) {
        if (!allIds.has(id)) dangling.push({ from: e.canonical_id, to: id });
      }
    }
    expect(dangling).toEqual([]);
  });
});
