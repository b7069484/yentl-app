import type { ClaimCard, RhetoricMarker, Session } from "@/lib/types";

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
  lines.push("");

  lines.push("## Transcript");
  lines.push("");
  for (const seg of s.transcript) {
    lines.push(`[${Math.floor(seg.start)}s] ${seg.text}`);
  }
  lines.push("");

  lines.push("## Claims");
  lines.push("");
  if (s.claims.length === 0) lines.push("_(none)_");
  for (const c of s.claims) lines.push(...renderClaim(c));
  lines.push("");

  lines.push("## Markers");
  lines.push("");
  if (s.markers.length === 0) lines.push("_(none)_");
  for (const m of s.markers) lines.push(...renderMarker(m));

  return lines.join("\n");
}

function renderClaim(c: ClaimCard): string[] {
  const out: string[] = [];
  out.push(`### ${c.primary_label} · ${c.score}%`);
  out.push("");
  out.push(`> "${c.claim_text}"`);
  out.push("");
  out.push(c.explanation);
  if (c.annotations.length)
    out.push("", `_Annotations:_ ${c.annotations.join(", ")}`);
  if (c.sources.length) {
    out.push("", "**Sources:**");
    for (const s of c.sources) {
      out.push(
        `- [${s.title}](${s.url}) — ${s.domain} · ${s.reputation_tier} · ${s.stance}`,
      );
    }
  }
  out.push("");
  return out;
}

function renderMarker(m: RhetoricMarker): string[] {
  return [
    `### [${m.type.toUpperCase()}] ${m.display} · ${m.severity}`,
    "",
    `> "${m.excerpt}"`,
    "",
    m.explanation,
    "",
  ];
}
