import type { ClaimCard, RhetoricMarker, Session, Speaker, SpeakerId } from "@/lib/types";

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

function renderMarker(m: RhetoricMarker, speakers: Speaker[]): string[] {
  const label = labelFor(speakers, m.speaker_id);
  return [
    `### [${m.type.toUpperCase()}] ${m.display} · ${m.severity}`,
    label ? `_— ${label}_` : "",
    "",
    `> "${m.excerpt}"`,
    "",
    m.explanation,
    "",
  ].filter((line) => line !== "");
}
