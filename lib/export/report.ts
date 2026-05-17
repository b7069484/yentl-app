import type {
  ClaimCard,
  PrimaryLabel,
  RhetoricMarker,
  Session,
  Speaker,
  SpeakerId,
} from "@/lib/types";

function labelFor(speakers: Speaker[], id: SpeakerId | null): string {
  if (id === null) return "";
  return speakers.find((sp) => sp.id === id)?.label ?? `Speaker ${id + 1}`;
}

const VERDICT_TONE: Record<PrimaryLabel, { fg: string; bg: string; border: string; label: string }> = {
  TRUE:         { fg: "#065f46", bg: "#ecfdf5", border: "#a7f3d0", label: "True" },
  MOSTLY_TRUE:  { fg: "#065f46", bg: "#ecfdf5", border: "#bbf7d0", label: "Mostly true" },
  PARTIAL:      { fg: "#92400e", bg: "#fffbeb", border: "#fcd34d", label: "Partially true" },
  MISLEADING:   { fg: "#92400e", bg: "#fffbeb", border: "#fbbf24", label: "Misleading" },
  OMISSION:     { fg: "#9a3412", bg: "#fff7ed", border: "#fdba74", label: "Missing context" },
  FALSE:        { fg: "#9f1239", bg: "#fff1f2", border: "#fda4af", label: "False" },
  UNVERIFIABLE: { fg: "#334155", bg: "#f8fafc", border: "#cbd5e1", label: "Unverifiable" },
  OPINION:      { fg: "#5b21b6", bg: "#f5f3ff", border: "#c4b5fd", label: "Opinion" },
};

const TYPE_TONE: Record<RhetoricMarker["type"], { fg: string; bg: string; border: string; label: string }> = {
  fallacy:  { fg: "#9f1239", bg: "#fff1f2", border: "#fda4af", label: "Fallacy" },
  bias:     { fg: "#3730a3", bg: "#eef2ff", border: "#a5b4fc", label: "Bias" },
  rhetoric: { fg: "#115e59", bg: "#f0fdfa", border: "#5eead4", label: "Rhetoric" },
};

const SEVERITY_LABEL: Record<RhetoricMarker["severity"], string> = {
  subtle: "Subtle",
  clear: "Clear",
  blatant: "Blatant",
};

export function toReport(session: Session): string {
  const ended = session.ended_at ? new Date(session.ended_at) : null;
  const started = new Date(session.started_at);
  const durationSec = ended
    ? Math.round((ended.getTime() - started.getTime()) / 1000)
    : null;

  const claimsByStart = new Map<number, ClaimCard>();
  for (const c of session.claims) claimsByStart.set(c.utterance_start, c);

  const speakersBlock = session.speakers.length >= 2
    ? `<section><h2>Speakers</h2><ul class="speakers">${session.speakers
        .map((sp) => `<li>${escapeHtml(sp.label)}</li>`).join("")}</ul></section>`
    : "";

  const verdictCounts = session.claims.reduce<Record<string, number>>((acc, c) => {
    acc[c.primary_label] = (acc[c.primary_label] ?? 0) + 1;
    return acc;
  }, {});
  const markerCounts = session.markers.reduce<Record<string, number>>(
    (acc, m) => {
      acc[m.type] = (acc[m.type] ?? 0) + 1;
      return acc;
    },
    { fallacy: 0, bias: 0, rhetoric: 0 },
  );

  const title = escapeHtml(session.title || "Yentl session");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title} — Yentl report</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    color-scheme: light;
    --fg: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --bg: #ffffff;
    --accent: #dc2626;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f8fafc; color: var(--fg); -webkit-font-smoothing: antialiased; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Inter", sans-serif; line-height: 1.55; }
  main { max-width: 760px; margin: 0 auto; padding: 64px 32px 96px; background: var(--bg); min-height: 100vh; }
  .eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted); }
  .eyebrow .dot { display:inline-block; width: 6px; height: 6px; border-radius: 9999px; background: var(--accent); margin-right: 6px; vertical-align: middle; }
  h1 { font-size: 36px; line-height: 1.1; letter-spacing: -0.02em; margin: 12px 0 16px; }
  .meta { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
  .meta span + span::before { content: " · "; opacity: 0.6; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0 40px; border: 1px solid var(--line); border-radius: 12px; padding: 16px; background: #ffffff; }
  .stat { text-align: center; }
  .stat .n { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 22px; font-weight: 600; }
  .stat .l { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); margin-top: 4px; }
  h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); border-top: 1px solid var(--line); padding-top: 36px; margin: 56px 0 16px; }
  .transcript p { font-size: 17px; line-height: 1.7; margin: 0 0 18px; }
  .seg-hit { padding: 1px 4px; margin: 0 -1px; border-radius: 4px; border-bottom: 2px solid; }
  .card { border: 1px solid var(--line); border-radius: 12px; padding: 18px 18px 18px 22px; margin-bottom: 14px; background: #ffffff; position: relative; overflow: hidden; }
  .card .stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
  .pill { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .row .score { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 22px; font-weight: 600; }
  .row .score .of { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); margin-left: 1px; }
  .claim-text { font-size: 15px; font-weight: 600; margin: 12px 0 8px; }
  .explanation { font-size: 14px; color: #334155; margin: 0 0 12px; }
  .annotations { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 12px; }
  .annotations span { font-size: 11px; font-style: italic; color: #475569; background: #f8fafc; border: 1px solid var(--line); padding: 2px 8px; border-radius: 9999px; }
  .sources { margin-top: 10px; }
  .sources-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); margin-bottom: 6px; }
  .source { font-size: 13px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; margin-bottom: 6px; }
  .source a { color: inherit; text-decoration: none; font-weight: 600; }
  .source a:hover { text-decoration: underline; }
  .source .meta-row { font-size: 11px; color: var(--muted); margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .source .excerpt { font-size: 12px; font-style: italic; color: #475569; margin-top: 6px; }
  .stance { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-right: 6px; vertical-align: middle; }
  .marker { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px 12px 18px; margin-bottom: 10px; background: #ffffff; position: relative; overflow: hidden; }
  .marker .stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
  .marker h3 { font-size: 14px; margin: 4px 0 4px; }
  .marker .quote { font-size: 12px; font-style: italic; color: #475569; }
  .marker .exp { font-size: 12px; color: #334155; margin-top: 4px; }
  .speakers { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
  .speakers li { font-size: 12px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 9999px; background: #f8fafc; }
  .speaker-tag { font-size: 11px; color: var(--muted); font-style: italic; margin: 4px 0 8px; }
  .footer { color: var(--muted); font-size: 12px; margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--line); text-align: center; }
  .footer a { color: inherit; }
  @media print {
    body { background: #fff; }
    main { padding: 24px 0; max-width: none; }
    h2 { page-break-after: avoid; }
    .card, .marker { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<main>
  <div class="eyebrow"><span class="dot"></span>Yentl session report</div>
  <h1>${title}</h1>
  <div class="meta">
    <span>${formatDateTime(started)}</span>
    ${ended ? `<span>ended ${formatDateTime(ended)}</span>` : ""}
    ${durationSec !== null ? `<span>${formatDuration(durationSec)}</span>` : ""}
  </div>

  <div class="stats">
    <div class="stat"><div class="n">${session.transcript.length}</div><div class="l">Utterances</div></div>
    <div class="stat"><div class="n">${session.claims.length}</div><div class="l">Claims</div></div>
    <div class="stat"><div class="n">${session.markers.length}</div><div class="l">Markers</div></div>
    <div class="stat"><div class="n">${verdictCounts.FALSE ?? 0}</div><div class="l">False</div></div>
  </div>

  ${speakersBlock}
  <h2>Transcript</h2>
  ${renderTranscript(session, claimsByStart)}

  <h2>Claims · ${session.claims.length}</h2>
  ${
    session.claims.length === 0
      ? '<p style="color:var(--muted);font-style:italic;">No claims captured.</p>'
      : session.claims.map((c) => renderClaim(c, session.speakers)).join("\n")
  }

  <h2>Markers · ${session.markers.length}</h2>
  ${
    session.markers.length === 0
      ? '<p style="color:var(--muted);font-style:italic;">No biases, fallacies, or rhetorical patterns captured.</p>'
      : renderMarkerBreakdown(markerCounts) + session.markers.map((m) => renderMarker(m, session.speakers)).join("\n")
  }

  <div class="footer">
    Generated by <a href="https://yentl.it/">Yentl</a>
  </div>
</main>
</body>
</html>`;
}

function renderTranscript(session: Session, claimsByStart: Map<number, ClaimCard>) {
  if (session.transcript.length === 0) {
    return '<p style="color:var(--muted);font-style:italic;">No transcript captured.</p>';
  }
  const parts = session.transcript.map((seg) => {
    const claim = claimsByStart.get(seg.start);
    const text = escapeHtml(seg.text);
    const speakerLabel = labelFor(session.speakers, seg.speaker_id);
    const prefix = speakerLabel ? `<strong>${escapeHtml(speakerLabel)}:</strong> ` : "";
    if (claim) {
      const v = VERDICT_TONE[claim.primary_label];
      return `${prefix}<span class="seg-hit" style="background:${v.bg};border-bottom-color:${v.border};color:${v.fg};" title="${v.label} · ${claim.score}/100">${text}</span>`;
    }
    return `${prefix}${text}`;
  });
  return `<div class="transcript"><p>${parts.join(" ")}</p></div>`;
}

function renderClaim(c: ClaimCard, speakers: Speaker[]): string {
  const v = VERDICT_TONE[c.primary_label];
  const speakerLabel = labelFor(speakers, c.speaker_id);
  const speakerTag = speakerLabel ? `<div class="speaker-tag">— ${escapeHtml(speakerLabel)}</div>` : "";
  const annotations = c.annotations.length
    ? `<div class="annotations">${c.annotations.map((a) => `<span>${escapeHtml(a)}</span>`).join("")}</div>`
    : "";
  const sources = c.sources.length
    ? `<div class="sources"><div class="sources-label">Sources · ${c.sources.length}</div>${c.sources
        .map((s) => {
          const icon =
            s.stance === "supports"
              ? `<span class="stance" style="background:#ecfdf5;color:#065f46;">✓</span>`
              : s.stance === "contradicts"
                ? `<span class="stance" style="background:#fff1f2;color:#9f1239;">✗</span>`
                : `<span class="stance" style="background:#fffbeb;color:#92400e;">~</span>`;
          return `<div class="source">${icon}<a href="${escapeAttr(s.url)}" target="_blank" rel="noreferrer">${escapeHtml(s.title)}</a><div class="meta-row">${escapeHtml(s.domain)} · ${s.reputation_tier} · ${s.stance}</div>${s.excerpt ? `<div class="excerpt">&ldquo;${escapeHtml(s.excerpt)}&rdquo;</div>` : ""}</div>`;
        })
        .join("")}</div>`
    : "";
  return `<article class="card">
  <span class="stripe" style="background:${v.border};"></span>
  <div class="row">
    <span class="pill" style="background:${v.bg};color:${v.fg};border-color:${v.border};">${v.label}</span>
    <span class="score" style="color:${v.fg};">${c.score}<span class="of">/100</span></span>
  </div>
  ${speakerTag}
  <div class="claim-text">&ldquo;${escapeHtml(c.claim_text)}&rdquo;</div>
  ${c.explanation ? `<p class="explanation">${escapeHtml(c.explanation)}</p>` : ""}
  ${annotations}
  ${sources}
</article>`;
}

function renderMarkerBreakdown(counts: Record<string, number>) {
  return `<p style="font-size:13px;color:var(--muted);margin:0 0 18px;">
    ${counts.fallacy} fallacy · ${counts.bias} bias · ${counts.rhetoric} rhetoric
  </p>`;
}

function renderMarker(m: RhetoricMarker, speakers: Speaker[]): string {
  const t = TYPE_TONE[m.type];
  const speakerLabel = labelFor(speakers, m.speaker_id);
  const speakerTag = speakerLabel ? `<div class="speaker-tag">— ${escapeHtml(speakerLabel)}</div>` : "";
  return `<article class="marker">
  <span class="stripe" style="background:${t.border};"></span>
  <div class="row">
    <span class="pill" style="background:${t.bg};color:${t.fg};border-color:${t.border};">${t.label}</span>
    <span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;color:var(--muted);">${SEVERITY_LABEL[m.severity]}</span>
  </div>
  ${speakerTag}
  <h3>${escapeHtml(m.display)}</h3>
  <p class="quote">&ldquo;${escapeHtml(m.excerpt)}&rdquo;</p>
  ${m.explanation ? `<p class="exp">${escapeHtml(m.explanation)}</p>` : ""}
</article>`;
}

function formatDateTime(d: Date) {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${String(s).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string) {
  return escapeHtml(s);
}
