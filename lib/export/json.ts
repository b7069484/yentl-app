import type { Session } from "@/lib/types";
import {
  sourceClaimOverlap,
  sourceClaimOverlapTerms,
  sourceDossierStats,
  sourceEvidenceBreakdown,
  sourceEvidenceScore,
} from "@/lib/source-evidence";

export function toJSON(session: Session): string {
  const obj: Record<string, unknown> = {
    title: session.title,
    started_at: session.started_at,
  };
  if (session.ended_at) {
    obj.ended_at = session.ended_at;
    obj.duration_seconds = Math.round(
      (new Date(session.ended_at).getTime() -
        new Date(session.started_at).getTime()) /
        1000,
    );
  }
  obj.source = session.source;
  obj.speakers = session.speakers;
  obj.transcript = session.transcript;
  obj.claims = session.claims;
  obj.source_evidence = {
    claims: session.claims.map((claim) => ({
      claim_id: claim.id,
      summary: sourceDossierStats(claim.sources, claim.claim_text),
      sources: claim.sources
        .map((source) => ({
          url: source.url,
          title: source.title,
          domain: source.domain,
          stance: source.stance,
          reputation_tier: source.reputation_tier,
          evidence_score: sourceEvidenceScore(source),
          evidence_breakdown: sourceEvidenceBreakdown(source),
          claim_link: sourceClaimOverlap(claim.claim_text, source.excerpt),
          claim_link_terms: sourceClaimOverlapTerms(claim.claim_text, source.excerpt),
        }))
        .sort((a, b) => b.evidence_score - a.evidence_score),
    })),
  };
  obj.markers = session.markers;
  if (session.synthesis) obj.synthesis = session.synthesis;
  if (session.devil_advocate) obj.devil_advocate = session.devil_advocate;
  return JSON.stringify(obj, null, 2);
}
