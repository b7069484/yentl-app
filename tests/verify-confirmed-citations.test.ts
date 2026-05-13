import { describe, expect, it } from "vitest";
import { extractCitations, mergeStanceWithCitations } from "@/app/api/verify-confirmed/citations";

const fakeStep = (urls: Array<{ url: string; title?: string; snippet?: string }>) => ({
  toolResults: [{ toolName: "web_search", result: { results: urls } }],
});

describe("extractCitations", () => {
  it("flattens tool results across steps", () => {
    const steps = [
      fakeStep([{ url: "https://nasa.gov/apollo-11", title: "Apollo 11" }]),
      fakeStep([{ url: "https://bbc.com/news/x", title: "BBC" }]),
    ];
    const map = extractCitations(steps);
    expect(map.size).toBe(2);
  });

  it("normalizes trailing slashes", () => {
    const steps = [fakeStep([{ url: "https://nasa.gov/apollo-11/" }])];
    const map = extractCitations(steps);
    expect([...map.keys()][0]).toBe("https://nasa.gov/apollo-11");
  });

  it("ignores unknown shapes without crashing", () => {
    const steps = [{ toolResults: [{ toolName: "web_search", result: "garbage" }] }];
    expect(extractCitations(steps).size).toBe(0);
  });

  it("ignores non-web_search tool results", () => {
    const steps = [{ toolResults: [{ toolName: "other_tool", result: { results: [{ url: "https://x.com" }] } }] }];
    expect(extractCitations(steps).size).toBe(0);
  });
});

describe("mergeStanceWithCitations", () => {
  const steps = [fakeStep([
    { url: "https://nasa.gov/apollo-11", title: "Apollo 11 — NASA" },
    { url: "https://bbc.com/news/x", title: "BBC News" },
  ])];

  it("keeps stance_refs whose url matches a citation", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://nasa.gov/apollo-11", stance: "supports", excerpt: "NASA confirms..." },
    ]);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      url: "https://nasa.gov/apollo-11",
      title: "Apollo 11 — NASA",
      stance: "supports",
      domain: "nasa.gov",
    });
  });

  it("drops stance_refs whose url was never visited (hallucinated)", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://fake.example.com", stance: "supports", excerpt: "fake" },
    ]);
    expect(sources).toHaveLength(0);
  });

  it("deduplicates the same url across multiple stance_refs", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://nasa.gov/apollo-11", stance: "supports", excerpt: "first" },
      { url: "https://nasa.gov/apollo-11", stance: "supports", excerpt: "second" },
    ]);
    expect(sources).toHaveLength(1);
  });

  it("handles a trailing-slash mismatch between citation and stance_ref", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://nasa.gov/apollo-11/", stance: "supports", excerpt: "x" },
    ]);
    expect(sources).toHaveLength(1);
  });
});
