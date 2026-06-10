import type { Source } from "@/lib/types";

export type SourceDossierStats = {
  supports: number;
  contradicts: number;
  mixed: number;
  high: number;
  mid: number;
  low: number;
  validatedImages: number;
  missingImages: number;
  claimLinked: number;
  claimUnlinked: number;
};

export type SourceQuoteRange = {
  text: string;
  start: number;
  end: number;
  score: number;
};

export type SourceClaimLinkStrength = "direct" | "weak" | "none";

const CLAIM_OVERLAP_STOPWORDS = new Set([
  "about",
  "after",
  "agree",
  "being",
  "claim",
  "could",
  "from",
  "have",
  "into",
  "more",
  "said",
  "says",
  "than",
  "that",
  "their",
  "there",
  "these",
  "this",
  "those",
  "with",
  "would",
]);

export function sourceDossierStats(sources: Source[], claimText?: string): SourceDossierStats {
  const stats: SourceDossierStats = {
    supports: 0,
    contradicts: 0,
    mixed: 0,
    high: 0,
    mid: 0,
    low: 0,
    validatedImages: 0,
    missingImages: 0,
    claimLinked: 0,
    claimUnlinked: 0,
  };

  for (const source of sources) {
    if (source.stance === "supports") stats.supports += 1;
    else if (source.stance === "contradicts") stats.contradicts += 1;
    else stats.mixed += 1;

    if (source.reputation_tier === "high") stats.high += 1;
    else if (source.reputation_tier === "mid") stats.mid += 1;
    else stats.low += 1;

    if (hasValidatedImage(source)) stats.validatedImages += 1;
    else stats.missingImages += 1;

    if (sourceClaimLinkStrength(claimText, source.excerpt) === "direct") {
      stats.claimLinked += 1;
    } else {
      stats.claimUnlinked += 1;
    }
  }

  return stats;
}

export function reputationWeight(source: Source): number {
  if (source.reputation_tier === "high") return 30;
  if (source.reputation_tier === "mid") return 15;
  return 0;
}

export function hasValidatedImage(source: Source): boolean {
  return Boolean(source.preview?.image_status === "validated" && source.preview.image_url);
}

export function sourceEvidenceScore(source: Source): number {
  return (
    reputationWeight(source) +
    (source.excerpt?.trim() ? 8 : 0) +
    (hasValidatedImage(source) ? 4 : 0)
  );
}

export function sourceEvidenceBreakdown(source: Source): string {
  const excerptLabel = source.excerpt?.trim() ? "excerpt" : "no excerpt";
  const imageLabel = hasValidatedImage(source) ? "validated image" : "no image";
  return `${source.reputation_tier} reputation + ${excerptLabel} + ${imageLabel}`;
}

export function sourceClaimOverlap(claimText: string | undefined, excerpt: string | undefined): string {
  if (!claimText?.trim()) return "claim text unavailable";
  if (!excerpt?.trim()) return "no source excerpt to compare";

  const uniqueOverlap = sourceClaimOverlapTerms(claimText, excerpt);

  if (uniqueOverlap.length === 0) return "no direct claim-word overlap";
  if (sourceClaimLinkStrength(claimText, excerpt) === "weak") {
    return `weak overlap only: ${uniqueOverlap.join(", ")}`;
  }
  return uniqueOverlap.join(", ");
}

export function sourceClaimOverlapTerms(claimText: string | undefined, excerpt: string | undefined): string[] {
  if (!claimText?.trim() || !excerpt?.trim()) return [];

  const excerptTerms = new Set(sourceAlignmentTerms(excerpt));
  const overlap = sourceAlignmentTerms(claimText).filter((term) => excerptTerms.has(term));
  return Array.from(new Set(overlap)).slice(0, 5);
}

export function sourceClaimLinkStrength(
  claimText: string | undefined,
  excerpt: string | undefined,
): SourceClaimLinkStrength {
  const overlap = sourceClaimOverlapTerms(claimText, excerpt);
  if (overlap.length === 0) return "none";
  if (overlap.length >= 2) return "direct";
  return /\d/.test(overlap[0]) ? "direct" : "weak";
}

export function sourceAlignmentTerms(value: string): string[] {
  return value
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((term) => {
      if (CLAIM_OVERLAP_STOPWORDS.has(term)) return false;
      return /\d/.test(term) ? term.length >= 2 : term.length >= 4;
    }) ?? [];
}

export function sourceQuoteOverlapScore(needle: string, haystack: string): number {
  const needleTerms = new Set(sourceAlignmentTerms(needle));
  if (needleTerms.size === 0) return 0;

  const haystackTerms = new Set(sourceAlignmentTerms(haystack));
  let overlap = 0;
  for (const term of needleTerms) {
    if (haystackTerms.has(term)) overlap += 1;
  }
  return overlap / needleTerms.size;
}

export function splitSourceSentenceRanges(text: string): SourceQuoteRange[] {
  const matches = Array.from(text.matchAll(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g));
  const ranges = matches
    .map((match) => {
      const raw = match[0] ?? "";
      const rawStart = match.index ?? 0;
      const leadingOffset = raw.search(/\S/);
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const start = rawStart + (leadingOffset >= 0 ? leadingOffset : 0);
      return {
        text: trimmed,
        start,
        end: start + trimmed.length,
        score: 0,
      };
    })
    .filter((range): range is SourceQuoteRange => Boolean(range));

  if (ranges.length > 0) return ranges;
  const trimmed = text.trim();
  const start = text.indexOf(trimmed);
  return trimmed ? [{ text: trimmed, start, end: start + trimmed.length, score: 0 }] : [];
}

export function bestSourceQuoteRange(
  claimText: string,
  sourceText: string,
  opts: { minScore?: number; allowSingleSentence?: boolean } = {},
): SourceQuoteRange | null {
  const minScore = opts.minScore ?? 0.35;
  const ranges = splitSourceSentenceRanges(sourceText);
  let best: SourceQuoteRange | null = null;

  for (const range of ranges) {
    const score = sourceQuoteOverlapScore(claimText, range.text);
    if (!best || score > best.score) {
      best = { ...range, score };
    }
  }

  if (!best) return null;
  if (best.score >= minScore || ((opts.allowSingleSentence ?? true) && ranges.length === 1)) {
    return best;
  }
  return null;
}
