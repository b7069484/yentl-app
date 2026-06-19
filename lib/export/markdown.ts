import type { ClaimCard, RhetoricMarker, Session, Speaker, SpeakerId } from "@/lib/types";
import { documentAnchorDetail } from "@/lib/document-anchor";
import {
  sourceClaimOverlap,
  sourceDossierStats,
  sourceEvidenceBreakdown,
  sourceEvidenceScore,
} from "@/lib/source-evidence";

function labelFor(speakers: Speaker[], id: SpeakerId | null): string | null {
  if (id === null) return null;
  return speakers.find((sp) => sp.id === id)?.label ?? `Speaker ${id + 1}`;
}

export function toMarkdown(s: Session): string {
  const lines: string[] = [];
  lines.push(`# ${s.title}`);
  lines.push("");
  lines.push(`- Started: ${s.started_at}`);
  if (s.ended_at) {
    const dur = Math.round(
      (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000,
    );
    lines.push(`- Ended:   ${s.ended_at}`);
    lines.push(`- Duration: ${dur}s`);
  }
  if (s.speakers.length >= 2) {
    lines.push(`- Speakers: ${s.speakers.map((sp) => sp.label).join(", ")}`);
  }
  lines.push("");

  if (s.synthesis) {
    lines.push("## Summary");
    lines.push("");
    for (const headline of s.synthesis.headlines) {
      lines.push(`- ${headline}`);
    }
    lines.push("");
    lines.push(s.synthesis.text);
    lines.push("");
    if (s.synthesis.meta_read) {
      const meta = s.synthesis.meta_read;
      lines.push("**Meta-read:**");
      lines.push(`- Posture: ${humanize(meta.posture)}`);
      lines.push(`- Source health: ${humanize(meta.source_health)}`);
      lines.push(`- Scope: ${humanize(meta.scope)}`);
      lines.push(`- Uncertainty: ${meta.uncertainty}`);
      lines.push(`- Next question: ${meta.key_question}`);
      lines.push("");
    }
  }

  if (s.devil_advocate) {
    lines.push("## Devil's Advocate");
    lines.push("");
    lines.push(`**Challenge (${s.devil_advocate.confidence} confidence):** ${s.devil_advocate.stance}`);
    lines.push("");
    lines.push("**Counterpoints:**");
    for (const point of s.devil_advocate.strongest_counterarguments) {
      lines.push(`- ${point}`);
    }
    lines.push("");
    lines.push(`**Weakest assumption:** ${s.devil_advocate.weakest_assumption}`);
    lines.push("");
    lines.push("**Questions:**");
    for (const question of s.devil_advocate.questions) {
      lines.push(`- ${question}`);
    }
    lines.push("");
  }

  lines.push("## Transcript");
  lines.push("");
  for (const seg of s.transcript) {
    const label = labelFor(s.speakers, seg.speaker_id);
    const prefix = label ? `**${label}** ` : "";
    lines.push(`[${Math.floor(seg.start)}s] ${prefix}${seg.text}`);
  }
  lines.push("");

  lines.push("## Claims");
  lines.push("");
  if (s.claims.length === 0) lines.push("_(none)_");
  for (const c of s.claims) lines.push(...renderClaim(c, s.speakers));
  lines.push("");

  lines.push("## Markers");
  lines.push("");
  if (s.markers.length === 0) lines.push("_(none)_");
  for (const m of s.markers) lines.push(...renderMarker(m, s.speakers));

  return lines.join("\n");
}

function renderClaim(c: ClaimCard, speakers: Speaker[]): string[] {
  const out: string[] = [];
  out.push(`### ${c.primary_label} · ${c.score}% · ${c.topic}`);
  const label = labelFor(speakers, c.speaker_id);
  if (label) out.push(`_— ${label}_`);
  out.push("");
  out.push(`> "${c.claim_text}"`);
  out.push("");
  const ownership = renderOwnershipContext(c, speakers);
  if (ownership) out.push(ownership, "");
  out.push(c.explanation);
  if (c.annotations.length)
    out.push("", `_Annotations:_ ${c.annotations.join(", ")}`);
  if (c.sources.length) {
    const stats = sourceDossierStats(c.sources, c.claim_text);
    out.push("", "**Sources:**");
    out.push(
      `_Source alignment:_ ${stats.claimLinked} linked / ${stats.claimUnlinked} not direct; ${stats.high} high / ${stats.mid} mid / ${stats.low} low; ${stats.supports} support / ${stats.contradicts} contradict / ${stats.mixed} mixed`,
    );
    for (const s of [...c.sources].sort((a, b) => sourceEvidenceScore(b) - sourceEvidenceScore(a))) {
      out.push(
        `- [${s.title}](${s.url}) — ${s.domain} · ${s.reputation_tier} · ${s.stance} · score ${sourceEvidenceScore(s)}`,
      );
      out.push(`  - Evidence: ${sourceEvidenceBreakdown(s)}`);
      out.push(`  - Claim link: ${sourceClaimOverlap(c.claim_text, s.excerpt)}`);
      if (s.excerpt) out.push(`  - Excerpt: "${s.excerpt}"`);
    }
  }
  out.push("");
  return out;
}

function renderOwnershipContext(c: ClaimCard, speakers: Speaker[]): string | null {
  const parts: string[] = [];
  const stance = c.ownership?.stance ?? c.stance;
  if (stance) parts.push(`stance ${humanize(stance)}`);
  if (c.ownership) {
    parts.push(`attribution ${humanize(c.ownership.attribution_status)}`);
    const owner = labelFor(speakers, c.ownership.owner_speaker_id);
    parts.push(owner ? `owner ${owner}` : "owner unresolved");
    parts.push(`confidence ${Math.round(c.ownership.confidence * 100)}%`);
    if (c.ownership.attribution_reasons.length > 0) {
      parts.push(
        `reasons ${c.ownership.attribution_reasons.map(humanize).join(", ")}`,
      );
    }
  }
  const anchor = documentAnchorDetail(c.document_anchor);
  if (anchor) parts.push(`source ${anchor}`);
  if (parts.length === 0) return null;
  return `**Ownership context:** ${parts.join("; ")}`;
}

function renderMarker(m: RhetoricMarker, speakers: Speaker[]): string[] {
  const label = labelFor(speakers, m.speaker_id);
  const attribution = renderMarkerAttributionContext(m, speakers);
  const out = [
    `### [${m.type.toUpperCase()}] ${m.display} · ${m.severity}`,
    label ? `_— ${label}_` : "",
    "",
    `> "${m.excerpt}"`,
    "",
  ].filter((line) => line !== "");
  if (attribution) out.push(attribution, "");
  out.push(m.explanation, "");
  return out.filter((line) => line !== "");
}

function renderMarkerAttributionContext(m: RhetoricMarker, speakers: Speaker[]): string | null {
  const parts: string[] = [];
  if (m.attribution_status) parts.push(`attribution ${humanize(m.attribution_status)}`);
  const owner = labelFor(speakers, m.speaker_id);
  if (m.attribution_status) parts.push(owner ? `owner ${owner}` : "owner unresolved");
  if (m.overlap_class) parts.push(`overlap ${humanize(m.overlap_class)}`);
  if (m.attribution_reasons?.length) {
    parts.push(`reasons ${m.attribution_reasons.map(humanize).join(", ")}`);
  }
  if (m.source_turn_ids?.length) parts.push(`turns ${m.source_turn_ids.join(", ")}`);
  if (m.source_segment_ids?.length) parts.push(`segments ${m.source_segment_ids.join(", ")}`);
  if (parts.length === 0) return null;
  return `**Marker attribution context:** ${parts.join("; ")}`;
}

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}
