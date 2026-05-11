import { describe, it, expect } from "vitest";
import { ALL, getEntry, entriesByType, totalCount } from "@/lib/taxonomy";

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
