import { describe, expect, it } from "vitest";
import {
  bestSourceQuoteRange,
  sourceClaimOverlap,
  sourceClaimLinkStrength,
  sourceClaimOverlapTerms,
  sourceDossierStats,
  sourceEvidenceBreakdown,
  sourceEvidenceScore,
  splitSourceSentenceRanges,
} from "@/lib/source-evidence";
import type { Source } from "@/lib/types";

describe("source evidence helpers", () => {
  const strongSource: Source = {
    url: "https://example.com/report",
    domain: "example.com",
    title: "Primary Report",
    reputation_tier: "high",
    stance: "supports",
    excerpt: "Large cohort data supports the safety finding.",
    preview: {
      image_url: "https://example.com/chart.jpg",
      image_alt: "Chart",
      title: "Primary Report",
      description: "Evidence",
      fetched_at: 1,
      image_status: "validated",
      image_source: "open_graph",
      image_final_url: "https://example.com/chart.jpg",
      image_content_type: "image/jpeg",
      image_dimensions: { width: 1200, height: 800 },
      validated_at: 1,
      unavailable_reason: null,
    },
  };

  const weakSource: Source = {
    url: "https://blog.example/post",
    domain: "blog.example",
    title: "Weak Blog",
    reputation_tier: "low",
    stance: "mixed",
  };

  it("scores reputation, excerpt, and validated image evidence", () => {
    expect(sourceEvidenceScore(strongSource)).toBe(42);
    expect(sourceEvidenceBreakdown(strongSource)).toBe("high reputation + excerpt + validated image");
    expect(sourceEvidenceScore(weakSource)).toBe(0);
  });

  it("extracts conservative claim/excerpt overlap terms", () => {
    const claim = "Large cohort data supports the vaccine safety finding.";
    expect(sourceClaimOverlapTerms(claim, strongSource.excerpt)).toEqual([
      "large",
      "cohort",
      "data",
      "supports",
      "safety",
    ]);
    expect(sourceClaimOverlap(claim, weakSource.excerpt)).toBe("no source excerpt to compare");
  });

  it("summarizes stance, reputation, image, and claim-link counts", () => {
    const stats = sourceDossierStats(
      [weakSource, strongSource],
      "Large cohort data supports the vaccine safety finding.",
    );
    expect(stats).toMatchObject({
      supports: 1,
      mixed: 1,
      high: 1,
      low: 1,
      validatedImages: 1,
      missingImages: 1,
      claimLinked: 1,
      claimUnlinked: 1,
    });
  });

  it("does not count one generic overlap term as a direct claim link", () => {
    const source: Source = {
      url: "https://example.com/city",
      domain: "example.com",
      title: "City note",
      reputation_tier: "mid",
      stance: "mixed",
      excerpt: "The city issued an unrelated parks update.",
    };
    const claim = "The city approved a school repair bond.";

    expect(sourceClaimOverlap(claim, source.excerpt)).toBe("weak overlap only: city");
    expect(sourceClaimLinkStrength(claim, source.excerpt)).toBe("weak");
    expect(sourceDossierStats([source], claim)).toMatchObject({
      claimLinked: 0,
      claimUnlinked: 1,
    });
  });

  it("counts a single shared number as a direct claim link", () => {
    const source: Source = {
      url: "https://example.com/budget",
      domain: "example.com",
      title: "Budget note",
      reputation_tier: "mid",
      stance: "supports",
      excerpt: "The final budget packet lists $42 million for school repairs.",
    };
    const claim = "The repair bond was $42.";

    expect(sourceClaimOverlap(claim, source.excerpt)).toBe("42");
    expect(sourceClaimLinkStrength(claim, source.excerpt)).toBe("direct");
    expect(sourceDossierStats([source], claim)).toMatchObject({
      claimLinked: 1,
      claimUnlinked: 0,
    });
  });

  it("finds a sentence-level quote range for a claim", () => {
    const sourceText = "The city published the release log on Friday. The audit timeline showed the report was added to the public archive.";
    const quote = "The audit timeline showed the report was added to the public archive.";

    expect(splitSourceSentenceRanges(sourceText).map((range) => range.text)).toEqual([
      "The city published the release log on Friday.",
      quote,
    ]);
    expect(bestSourceQuoteRange("The audit timeline showed the report was public.", sourceText)).toMatchObject({
      text: quote,
      start: sourceText.indexOf(quote),
      end: sourceText.indexOf(quote) + quote.length,
    });
  });
});
