import { describe, expect, it } from "vitest";
import { extractCitations, mergeStanceWithCitations } from "@/app/api/verify-confirmed/citations";

// Modern shape: @ai-sdk/anthropic v6 surfaces web_search citations as content
// blocks of type "source" inside step.content[].
const sourceStep = (urls: Array<{ url: string; title?: string }>) => ({
  content: urls.map((u) => ({
    type: "source" as const,
    sourceType: "url",
    url: u.url,
    title: u.title,
  })),
});

// Legacy shape: older releases put results under step.toolResults[].result.
const legacyStep = (urls: Array<{ url: string; title?: string }>) => ({
  toolResults: [{ toolName: "web_search", result: { results: urls } }],
});

describe("extractCitations (modern source-block shape)", () => {
  it("flattens source blocks across steps", () => {
    const steps = [
      sourceStep([{ url: "https://nasa.gov/apollo-11", title: "Apollo 11" }]),
      sourceStep([{ url: "https://bbc.com/news/x", title: "BBC" }]),
    ];
    const map = extractCitations(steps);
    expect(map.size).toBe(2);
  });

  it("normalizes trailing slashes", () => {
    const steps = [sourceStep([{ url: "https://nasa.gov/apollo-11/" }])];
    const map = extractCitations(steps);
    expect([...map.keys()][0]).toBe("https://nasa.gov/apollo-11");
  });

  it("ignores source blocks without a url", () => {
    const steps = [{ content: [{ type: "source" as const, sourceType: "url" }] }];
    expect(extractCitations(steps).size).toBe(0);
  });
});

describe("extractCitations (legacy tool-result shape)", () => {
  it("still works for old tool-result responses", () => {
    const steps = [legacyStep([{ url: "https://example.gov/page", title: "Page" }])];
    const map = extractCitations(steps);
    expect(map.size).toBe(1);
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
  const steps = [sourceStep([
    { url: "https://nasa.gov/apollo-11", title: "Apollo 11 — NASA" },
    { url: "https://bbc.com/news/x", title: "BBC News" },
  ])];

  it("returns one Source per citation with matched stance", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://nasa.gov/apollo-11", stance: "supports", excerpt: "NASA confirms..." },
      { url: "https://bbc.com/news/x", stance: "supports", excerpt: "BBC reports..." },
    ]);
    expect(sources).toHaveLength(2);
    expect(sources.find((s) => s.url === "https://nasa.gov/apollo-11")).toMatchObject({
      title: "Apollo 11 — NASA",
      stance: "supports",
      domain: "nasa.gov",
      excerpt: "NASA confirms...",
    });
  });

  it("keeps a citation even when no stance_ref matches it (defaults stance=mixed)", () => {
    const sources = mergeStanceWithCitations(steps, []);
    expect(sources).toHaveLength(2);
    expect(sources[0].stance).toBe("mixed");
    expect(sources[0].excerpt).toBe("");
  });

  it("handles JSON-bleed corruption in stance_ref URLs via prefix match", () => {
    const sources = mergeStanceWithCitations(steps, [
      {
        url: "https://nasa.gov/apollo-11/','stance':'supports','excerpt':'…",
        stance: "supports",
        excerpt: "matched via prefix",
      },
    ]);
    const nasa = sources.find((s) => s.url === "https://nasa.gov/apollo-11");
    expect(nasa?.stance).toBe("supports");
    expect(nasa?.excerpt).toBe("matched via prefix");
  });

  it("handles trailing-slash mismatch between citation and stance_ref", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://nasa.gov/apollo-11/", stance: "contradicts", excerpt: "x" },
    ]);
    const nasa = sources.find((s) => s.url === "https://nasa.gov/apollo-11");
    expect(nasa?.stance).toBe("contradicts");
  });

  it("does not attach stance refs from sibling URL prefixes", () => {
    const sources = mergeStanceWithCitations(
      [sourceStep([{ url: "https://nasa.gov/apollo-11", title: "Apollo 11 — NASA" }])],
      [
        {
          url: "https://nasa.gov/apollo-110",
          stance: "supports",
          excerpt: "wrong sibling page",
        },
      ],
    );

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      url: "https://nasa.gov/apollo-11",
      stance: "mixed",
      excerpt: "",
    });
  });

  it("matches harmless query-string variants without broad path prefixing", () => {
    const sources = mergeStanceWithCitations(
      [sourceStep([{ url: "https://nasa.gov/apollo-11", title: "Apollo 11 — NASA" }])],
      [
        {
          url: "https://nasa.gov/apollo-11?utm_source=model",
          stance: "supports",
          excerpt: "query variant",
        },
      ],
    );

    expect(sources[0]).toMatchObject({
      stance: "supports",
      excerpt: "query variant",
    });
  });

  it("deduplicates a citation that appears in multiple steps", () => {
    const dupSteps = [
      sourceStep([{ url: "https://nasa.gov/apollo-11", title: "Apollo 11" }]),
      sourceStep([{ url: "https://nasa.gov/apollo-11", title: "Apollo 11 — dup" }]),
    ];
    const sources = mergeStanceWithCitations(dupSteps, []);
    expect(sources).toHaveLength(1);
  });
});
