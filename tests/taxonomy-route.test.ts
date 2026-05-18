import { describe, it, expect } from "vitest";
import { GET } from "@/app/taxonomy.json/route";

describe("taxonomy.json route", () => {
  it("returns valid JSON with _license field", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data._license).toBe("CC-BY-4.0");
  });

  it("returns entries array with at least 123 items", async () => {
    const res = await GET();
    const data = await res.json();
    expect(Array.isArray(data.entries)).toBe(true);
    expect(data.entries.length).toBeGreaterThanOrEqual(123);
  });

  it("contains a known bias entry from the book taxonomy", async () => {
    const res = await GET();
    const data = await res.json();
    const entry = data.entries.find(
      (e: { canonical_id: string }) => e.canonical_id === "anchoring_bias"
    );
    expect(entry).toBeDefined();
    expect(entry.display).toBe("Anchoring Bias");
  });

  it("contains a known extras entry", async () => {
    const res = await GET();
    const data = await res.json();
    const entry = data.entries.find(
      (e: { canonical_id: string }) => e.canonical_id === "loaded_language"
    );
    expect(entry).toBeDefined();
  });
});
