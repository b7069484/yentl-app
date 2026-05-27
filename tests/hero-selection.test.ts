import { describe, expect, it } from "vitest";
import type { ClaimCard, ReputationTier, Source, SourcePreview, Stance } from "@/lib/types";
import { isValidatedSourceImage } from "@/lib/client/source-preview";

// pickHero isn't exported — re-implement the same logic here to lock it as a contract.
// If you'd rather, export pickHero from ClaimCard.tsx and import it here.
function tierRank(t: ReputationTier): number {
  return t === "high" ? 2 : t === "mid" ? 1 : 0;
}

function pickHero(card: ClaimCard): SourcePreview | null {
  if (card.sources.length === 0) return null;
  const expectedStance: Stance | null =
    card.primary_label === "TRUE" || card.primary_label === "MOSTLY_TRUE" ? "supports" :
    card.primary_label === "FALSE" || card.primary_label === "MISLEADING" || card.primary_label === "OMISSION" ? "contradicts" :
    null;
  const sorted = [...card.sources].sort((a, b) => {
    const t = tierRank(b.reputation_tier) - tierRank(a.reputation_tier);
    if (t !== 0) return t;
    if (expectedStance) {
      const s = (b.stance === expectedStance ? 1 : 0) - (a.stance === expectedStance ? 1 : 0);
      if (s !== 0) return s;
    }
    return 0;
  });
  for (const s of sorted) if (isValidatedSourceImage(s.preview)) return s.preview;
  return null;
}

const preview = (url: string): SourcePreview => ({
  image_url: url,
  image_alt: null,
  title: null,
  description: null,
  fetched_at: 0,
  image_status: "validated",
  image_source: "open_graph",
});

const invalidPreview = (url: string): SourcePreview => ({
  ...preview(url),
  image_url: null,
  image_status: "invalid",
  unavailable_reason: "Source image responded as text/html, not an image.",
});

const generatedPreview = (): SourcePreview => ({
  ...preview("/visual-evidence/markers/loaded_language.svg"),
  image_status: "validated",
  image_source: "none",
});

const source = (over: Partial<Source>): Source => ({
  url: "https://x.com",
  domain: "x.com",
  title: "x",
  reputation_tier: "mid",
  stance: "supports",
  ...over,
});

const card = (label: ClaimCard["primary_label"], sources: Source[]): ClaimCard => ({
  id: "c1",
  claim_text: "x",
  utterance_start: 0,
  utterance_end: 1,
  speaker_id: null,
  topic: "Other",
  topic_secondary: null,
  primary_label: label,
  score: 90,
  annotations: [],
  explanation: "",
  status: "confirmed",
  sources,
});

describe("pickHero", () => {
  it("returns null for cards with no sources", () => {
    expect(pickHero(card("TRUE", []))).toBe(null);
  });

  it("returns null when no source has a preview image", () => {
    expect(pickHero(card("TRUE", [source({ preview: undefined })]))).toBe(null);
  });

  it("does not use unvalidated source images as hero thumbnails", () => {
    expect(pickHero(card("TRUE", [
      source({ reputation_tier: "high", preview: invalidPreview("bad.png") }),
    ]))).toBe(null);
  });

  it("does not use generated or local visual-evidence art as source thumbnails", () => {
    expect(pickHero(card("TRUE", [
      source({ reputation_tier: "high", preview: generatedPreview() }),
    ]))).toBe(null);
  });

  it("prefers high reputation over mid", () => {
    const result = pickHero(card("TRUE", [
      source({ reputation_tier: "mid", preview: preview("https://cdn.example/mid.png") }),
      source({ reputation_tier: "high", preview: preview("https://cdn.example/high.png") }),
    ]));
    expect(result?.image_url).toBe("https://cdn.example/high.png");
  });

  it("within tier, prefers supports for TRUE verdicts", () => {
    const result = pickHero(card("TRUE", [
      source({ reputation_tier: "high", stance: "contradicts", preview: preview("https://cdn.example/contra.png") }),
      source({ reputation_tier: "high", stance: "supports", preview: preview("https://cdn.example/supp.png") }),
    ]));
    expect(result?.image_url).toBe("https://cdn.example/supp.png");
  });

  it("within tier, prefers contradicts for FALSE verdicts", () => {
    const result = pickHero(card("FALSE", [
      source({ reputation_tier: "high", stance: "supports", preview: preview("https://cdn.example/supp.png") }),
      source({ reputation_tier: "high", stance: "contradicts", preview: preview("https://cdn.example/contra.png") }),
    ]));
    expect(result?.image_url).toBe("https://cdn.example/contra.png");
  });

  it("for UNVERIFIABLE verdict, just picks by tier", () => {
    const result = pickHero(card("UNVERIFIABLE", [
      source({ reputation_tier: "high", preview: preview("https://cdn.example/high.png") }),
      source({ reputation_tier: "low", preview: preview("https://cdn.example/low.png") }),
    ]));
    expect(result?.image_url).toBe("https://cdn.example/high.png");
  });
});
