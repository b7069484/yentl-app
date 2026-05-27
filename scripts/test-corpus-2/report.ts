import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const REPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, "..", "..");
const CORPUS_DIR = path.join(REPO_ROOT, "test-corpus-2");
const CSV_PATH = path.join(CORPUS_DIR, "videos.csv");
const AUDIO_DIR = path.join(CORPUS_DIR, "audio");
const TRANSCRIPTS_DIR = path.join(CORPUS_DIR, "transcripts");
const GROUND_TRUTH_DIR = path.join(CORPUS_DIR, "ground-truth");
const SCORES_DIR = path.join(CORPUS_DIR, "scores");
const REPORT_DIR = path.join(CORPUS_DIR, "report");
const REPORT_JSON = path.join(REPORT_DIR, "corpus-2-plan.json");
const REPORT_HTML = path.join(REPORT_DIR, "index.html");
const PUBLIC_REPORT_DIR = path.join(REPO_ROOT, "public", "corpus-2-report");
const PUBLIC_REPORT_JSON = path.join(PUBLIC_REPORT_DIR, "corpus-2-plan.json");
const PUBLIC_REPORT_HTML = path.join(PUBLIC_REPORT_DIR, "index.html");

type Corpus2Row = {
  id: string;
  category: string;
  failure_mode: string;
  descriptor: string;
  search_query: string;
  duration_min_target: string;
  speaker_count_target: string;
  overlap: string;
  sensitivity_level: string;
  quotation_risk: string;
  identity_or_harm_risk: string;
  review_required: string;
  ideal_pass_behavior: string;
  critical_trap: string;
  notes: string;
  url: string;
  video_id: string;
  title_resolved: string;
  channel_resolved: string;
  duration_resolved_s: string;
  clip_start_s: string;
  clip_end_s: string;
  verified: string;
};

type ReportRow = Corpus2Row & {
  artifact: {
    audio: "present" | "missing";
    transcript: "present" | "missing";
    manualCaption: "present" | "missing";
    score: "present" | "missing";
    wer: number | null;
  };
};

type CategorySummary = {
  category: string;
  label: string;
  count: number;
  reviewRequired: number;
  highSensitivity: number;
  highQuotationRisk: number;
  highIdentityOrHarmRisk: number;
  heavyOverlap: number;
  targetMinutes: number;
  failureModes: string[];
};

type Corpus2Report = {
  generatedAt: string;
  summary: {
    rows: number;
    categories: number;
    reviewRequired: number;
    highSensitivity: number;
    highQuotationRisk: number;
    highIdentityOrHarmRisk: number;
    heavyOverlap: number;
    resolvedRows: number;
    audio: number;
    transcripts: number;
    manualCaptions: number;
    scored: number;
    medianWer: number | null;
    targetHours: number;
    unresolvedRows: number;
    mirrorRows: number;
  };
  validation: string[];
  categories: CategorySummary[];
  sensitivity: Record<string, number>;
  quotationRisk: Record<string, number>;
  identityOrHarmRisk: Record<string, number>;
  overlap: Record<string, number>;
  rows: ReportRow[];
};

type ScoreRecord = {
  wer?: number;
};

const REQUIRED_COLUMNS = [
  "id",
  "category",
  "failure_mode",
  "descriptor",
  "search_query",
  "duration_min_target",
  "speaker_count_target",
  "overlap",
  "sensitivity_level",
  "quotation_risk",
  "identity_or_harm_risk",
  "review_required",
  "ideal_pass_behavior",
  "critical_trap",
  "notes",
  "url",
  "video_id",
  "title_resolved",
  "channel_resolved",
  "duration_resolved_s",
  "clip_start_s",
  "clip_end_s",
  "verified",
];

const CATEGORY_LABELS: Record<string, string> = {
  chaotic_conversation_mechanics: "Chaotic Conversation Mechanics",
  quoting_irony_reported_speech: "Quoting, Irony, And Reported Speech",
  identity_bigotry_boundaries: "Sensitive Identity And Bigotry Boundaries",
  historical_memory_denial: "Historical Memory And Denial",
  medical_science_uncertainty: "Medical/Science Uncertainty",
  legal_institutional_procedure: "Legal/Institutional/Procedural Speech",
  misinformation_conspiracy_gradients: "Misinformation And Conspiracy Gradients",
  rhetorical_manipulation_persuasion: "Rhetorical Manipulation And Persuasion",
  cross_cultural_translation_register: "Cross-Cultural/Translation/Register Problems",
  platform_native_discourse: "Modern Platform-Native Discourse",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isTrue(value: string): boolean {
  return value.trim().toUpperCase() === "TRUE";
}

function countBy<T extends Corpus2Row>(rows: T[], field: keyof Corpus2Row): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = row[field] || "blank";
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function rowsByCategory<T extends Corpus2Row>(rows: T[]): Array<[string, T[]]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    grouped.set(row.category, [...(grouped.get(row.category) ?? []), row]);
  }
  return [...grouped.entries()];
}

async function readRows(): Promise<Corpus2Row[]> {
  const text = await fs.readFile(CSV_PATH, "utf8");
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Corpus2Row[];
  return rows;
}

async function fileExists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(() => true, () => false);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function median(values: number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  return clean[Math.floor(clean.length / 2)];
}

async function attachArtifacts(rows: Corpus2Row[]): Promise<ReportRow[]> {
  const gtFiles = await fs.readdir(GROUND_TRUTH_DIR).catch(() => [] as string[]);
  const reportRows: ReportRow[] = [];
  for (const row of rows) {
    const score = await readJson<ScoreRecord>(path.join(SCORES_DIR, `${row.id}.json`));
    reportRows.push({
      ...row,
      artifact: {
        audio: await fileExists(path.join(AUDIO_DIR, `${row.id}.opus`)) ? "present" : "missing",
        transcript: await fileExists(path.join(TRANSCRIPTS_DIR, `${row.id}.json`)) ? "present" : "missing",
        manualCaption: row.video_id && gtFiles.some((file) => file.startsWith(row.video_id) && file.endsWith(".vtt"))
          ? "present"
          : "missing",
        score: score ? "present" : "missing",
        wer: typeof score?.wer === "number" ? score.wer : null,
      },
    });
  }
  return reportRows;
}

function validateRows(rows: Corpus2Row[]): string[] {
  const validation: string[] = [];
  const columns = Object.keys(rows[0] ?? {});
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
  if (missingColumns.length > 0) validation.push(`Missing required columns: ${missingColumns.join(", ")}`);

  if (rows.length !== 100) validation.push(`Expected 100 rows, found ${rows.length}`);

  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) validation.push(`Duplicate id: ${row.id}`);
    ids.add(row.id);
    for (const column of REQUIRED_COLUMNS) {
      if (!["url", "video_id", "title_resolved", "channel_resolved", "duration_resolved_s", "clip_start_s", "clip_end_s"].includes(column)) {
        if (!(row[column as keyof Corpus2Row] ?? "").trim()) validation.push(`${row.id} missing ${column}`);
      }
    }
  }

  for (const [category, categoryRows] of rowsByCategory(rows)) {
    if (categoryRows.length !== 10) validation.push(`${category} has ${categoryRows.length} rows, expected 10`);
  }

  if (rowsByCategory(rows).length !== 10) {
    validation.push(`Expected 10 categories, found ${rowsByCategory(rows).length}`);
  }

  const reviewRequired = rows.filter((row) => isTrue(row.review_required)).length;
  if (reviewRequired < 20) validation.push(`Expected at least 20 review-required rows, found ${reviewRequired}`);

  const unresolved = rows.filter((row) => row.verified !== "TRUE" && !row.url).length;
  const resolved = rows.length - unresolved;
  const resolutionNote = resolved === 0 ? "URLs unresolved" : `${resolved} URL-resolved rows, ${unresolved} unresolved`;

  return validation.length > 0 ? validation : [`PASS: 100 rows, 10 categories, 10 rows per category, review gate satisfied, ${resolutionNote}`];
}

function categorySummaries(rows: Corpus2Row[]): CategorySummary[] {
  return rowsByCategory(rows).map(([category, categoryRows]) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    count: categoryRows.length,
    reviewRequired: categoryRows.filter((row) => isTrue(row.review_required)).length,
    highSensitivity: categoryRows.filter((row) => row.sensitivity_level === "high").length,
    highQuotationRisk: categoryRows.filter((row) => row.quotation_risk === "high").length,
    highIdentityOrHarmRisk: categoryRows.filter((row) => row.identity_or_harm_risk === "high").length,
    heavyOverlap: categoryRows.filter((row) => row.overlap === "heavy").length,
    targetMinutes: categoryRows.reduce((sum, row) => sum + Number(row.duration_min_target || 0), 0),
    failureModes: categoryRows.map((row) => row.failure_mode),
  }));
}

async function buildReport(inputRows: Corpus2Row[]): Promise<Corpus2Report> {
  const rows = await attachArtifacts(inputRows);
  const totalMinutes = rows.reduce((sum, row) => sum + Number(row.duration_min_target || 0), 0);
  const werValues = rows.flatMap((row) => (row.artifact.wer === null ? [] : [row.artifact.wer]));
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      rows: rows.length,
      categories: rowsByCategory(rows).length,
      reviewRequired: rows.filter((row) => isTrue(row.review_required)).length,
      highSensitivity: rows.filter((row) => row.sensitivity_level === "high").length,
      highQuotationRisk: rows.filter((row) => row.quotation_risk === "high").length,
      highIdentityOrHarmRisk: rows.filter((row) => row.identity_or_harm_risk === "high").length,
      heavyOverlap: rows.filter((row) => row.overlap === "heavy").length,
      resolvedRows: rows.filter((row) => row.verified === "TRUE" && row.url).length,
      audio: rows.filter((row) => row.artifact.audio === "present").length,
      transcripts: rows.filter((row) => row.artifact.transcript === "present").length,
      manualCaptions: rows.filter((row) => row.artifact.manualCaption === "present").length,
      scored: rows.filter((row) => row.artifact.score === "present").length,
      medianWer: median(werValues),
      targetHours: totalMinutes / 60,
      unresolvedRows: rows.filter((row) => row.verified !== "TRUE" && !row.url).length,
      mirrorRows: rows.filter((row) => /mirror/i.test(row.notes)).length,
    },
    validation: validateRows(rows),
    categories: categorySummaries(rows),
    sensitivity: countBy(rows, "sensitivity_level"),
    quotationRisk: countBy(rows, "quotation_risk"),
    identityOrHarmRisk: countBy(rows, "identity_or_harm_risk"),
    overlap: countBy(rows, "overlap"),
    rows,
  };
}

function metric(label: string, value: string | number, note: string): string {
  return `
    <div class="metric">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(String(value))}</div>
      <div class="metric-note">${escapeHtml(note)}</div>
    </div>`;
}

function pill(value: string, tone = value): string {
  return `<span class="pill ${escapeHtml(tone.toLowerCase())}">${escapeHtml(value)}</span>`;
}

function renderCounts(title: string, counts: Record<string, number>): string {
  const rows = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => `<tr><td>${escapeHtml(label)}</td><td>${count}</td></tr>`)
    .join("");
  return `
    <section class="panel">
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead><tr><th>Level</th><th>Rows</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function renderCategorySummary(report: Corpus2Report): string {
  return report.categories.map((category) => `
    <tr>
      <td><strong>${escapeHtml(category.label)}</strong><br><span class="muted">${escapeHtml(category.category)}</span></td>
      <td>${category.count}</td>
      <td>${category.reviewRequired}</td>
      <td>${category.highSensitivity}</td>
      <td>${category.highQuotationRisk}</td>
      <td>${category.highIdentityOrHarmRisk}</td>
      <td>${category.heavyOverlap}</td>
      <td>${category.targetMinutes}m</td>
      <td>${category.failureModes.map((mode) => pill(mode, "mode")).join(" ")}</td>
    </tr>`).join("");
}

function fmtPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function renderRow(row: ReportRow): string {
  const resolved = row.url
    ? `<div class="resolved"><a href="${escapeHtml(row.url)}">${escapeHtml(row.title_resolved || row.video_id)}</a><span>${escapeHtml(row.channel_resolved)}${row.duration_resolved_s ? `, ${Math.round(Number(row.duration_resolved_s) / 60)}m` : ""}</span></div>`
    : `<div class="unresolved">Unresolved</div>`;
  const artifacts = `
    <div class="artifacts">
      ${pill(`audio:${row.artifact.audio}`, row.artifact.audio)}
      ${pill(`transcript:${row.artifact.transcript}`, row.artifact.transcript)}
      ${pill(`captions:${row.artifact.manualCaption}`, row.artifact.manualCaption)}
      ${row.artifact.wer === null ? pill("WER:n/a", "missing") : pill(`WER:${fmtPct(row.artifact.wer)}`, "present")}
    </div>`;
  return `
    <tr>
      <td class="id">${escapeHtml(row.id)}</td>
      <td>
        <strong>${escapeHtml(row.failure_mode)}</strong>
        <div class="descriptor">${escapeHtml(row.descriptor)}</div>
        <div class="query">${escapeHtml(row.search_query)}</div>
        ${resolved}
        ${artifacts}
      </td>
      <td>${row.duration_min_target}m<br><span class="muted">${escapeHtml(row.speaker_count_target)} speakers</span></td>
      <td>${pill(row.overlap)}</td>
      <td>${pill(row.sensitivity_level)} ${pill(`quote:${row.quotation_risk}`, row.quotation_risk)} ${pill(`harm:${row.identity_or_harm_risk}`, row.identity_or_harm_risk)}</td>
      <td>${isTrue(row.review_required) ? pill("review", "review") : pill("standard", "standard")}</td>
      <td>
        <details>
          <summary>Pass and trap</summary>
          <p><strong>Ideal pass:</strong> ${escapeHtml(row.ideal_pass_behavior)}</p>
          <p><strong>Critical trap:</strong> ${escapeHtml(row.critical_trap)}</p>
          <p><strong>Notes:</strong> ${escapeHtml(row.notes)}</p>
        </details>
      </td>
    </tr>`;
}

function renderCategorySections(report: Corpus2Report): string {
  return rowsByCategory(report.rows).map(([category, rows]) => {
    const label = CATEGORY_LABELS[category] ?? category;
    return `
      <section class="band">
        <div class="band-head">
          <h2>${escapeHtml(label)}</h2>
          <p>${rows.length} candidate rows organized by exact failure mode.</p>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Failure Mode / Search Target</th>
                <th>Target</th>
                <th>Overlap</th>
                <th>Risk</th>
                <th>Review</th>
                <th>Judgment</th>
              </tr>
            </thead>
            <tbody>${rows.map(renderRow).join("")}</tbody>
          </table>
        </div>
      </section>`;
  }).join("");
}

function renderHtml(report: Corpus2Report): string {
  const validationClass = report.validation.every((line) => line.startsWith("PASS")) ? "pass" : "warn";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Yentl Corpus 2 Planning Report</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #18191f;
      --muted: #646977;
      --line: #d8d8d2;
      --paper: #faf9f5;
      --panel: #ffffff;
      --soft: #eef2ef;
      --green: #17663f;
      --amber: #865d08;
      --red: #a13d35;
      --blue: #2f6173;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.42;
    }
    header {
      padding: 30px clamp(18px, 4vw, 44px) 24px;
      background: #fffdf8;
      border-bottom: 1px solid var(--line);
    }
    main { padding: 22px clamp(18px, 4vw, 44px) 54px; }
    h1, h2, h3, p { margin-top: 0; }
    h1 {
      max-width: 1100px;
      margin-bottom: 10px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(34px, 5vw, 58px);
      line-height: 1;
      letter-spacing: 0;
    }
    h2 { margin-bottom: 10px; font-size: 20px; letter-spacing: 0; }
    .subhead { max-width: 1050px; color: var(--muted); font-size: 15px; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px 18px; color: var(--muted); font-size: 13px; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(6, minmax(135px, 1fr));
      gap: 10px;
      margin-top: 22px;
    }
    .metric {
      min-height: 96px;
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 14px;
    }
    .metric-label { color: var(--muted); font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .metric-value { margin-top: 8px; font-size: 30px; font-weight: 850; line-height: 1; }
    .metric-note { margin-top: 8px; color: var(--muted); font-size: 12px; }
    .callout {
      margin-top: 14px;
      padding: 12px 14px;
      border-left: 4px solid var(--blue);
      background: #edf5f6;
      color: #234554;
      font-size: 13px;
    }
    .callout.pass { border-left-color: var(--green); background: #eef8f1; color: #204832; }
    .callout.warn { border-left-color: var(--amber); background: #fff7df; color: #5a4109; }
    .grid-four {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .panel, .band {
      border: 1px solid var(--line);
      background: var(--panel);
      overflow: hidden;
    }
    .panel { padding: 14px; }
    .band { margin-top: 18px; }
    .band-head {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: var(--soft);
    }
    .band-head p { margin-bottom: 0; color: var(--muted); font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #ece9e0; text-align: left; vertical-align: top; }
    th { background: #fffdf8; color: #42464f; font-size: 11px; text-transform: uppercase; }
    tbody tr:hover { background: #fffdfa; }
    details { max-width: 520px; }
    details p { margin: 8px 0 0; }
    summary { cursor: pointer; font-weight: 800; color: var(--blue); }
    .table-wrap { overflow-x: auto; }
    .muted { color: var(--muted); }
    .descriptor { margin-top: 4px; font-weight: 650; }
    .query { margin-top: 5px; color: var(--muted); font-size: 12px; }
    .resolved, .unresolved { margin-top: 8px; font-size: 12px; }
    .resolved a { display: block; color: var(--blue); font-weight: 800; text-decoration: none; }
    .resolved a:hover { text-decoration: underline; }
    .resolved span, .unresolved { color: var(--muted); }
    .artifacts { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 7px; }
    .id { white-space: nowrap; font-weight: 800; color: #343844; }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      margin: 1px 3px 3px 0;
      padding: 2px 7px;
      border: 1px solid currentColor;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      color: #4e5560;
      white-space: nowrap;
    }
    .pill.high, .pill.heavy, .pill.review { color: var(--red); }
    .pill.medium, .pill.moderate { color: var(--amber); }
    .pill.low, .pill.none, .pill.standard, .pill.present { color: var(--green); }
    .pill.missing { color: var(--muted); }
    .pill.mild, .pill.mode { color: var(--blue); }
    @media (max-width: 1180px) {
      .metrics { grid-template-columns: repeat(3, minmax(135px, 1fr)); }
      .grid-four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .metrics, .grid-four { grid-template-columns: 1fr; }
      th, td { padding: 9px 8px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Yentl Corpus 2 Planning Report</h1>
    <p class="subhead">A 100-video candidate corpus organized by failure mode rather than topic. This page tracks URL resolution, local audio, Deepgram transcripts, human-caption WER coverage, and review gates.</p>
    <div class="meta">
      <span>Generated ${escapeHtml(report.generatedAt)}</span>
      <span>Source: test-corpus-2/videos.csv</span>
      <span>Public path: public/corpus-2-report/index.html</span>
    </div>
    <section class="metrics" aria-label="Corpus 2 summary">
      ${metric("Rows", report.summary.rows, `${report.summary.categories} categories`)}
      ${metric("Resolved", report.summary.resolvedRows, `${report.summary.unresolvedRows} unresolved`)}
      ${metric("Audio", report.summary.audio, "local audio artifacts")}
      ${metric("Transcripts", report.summary.transcripts, "Deepgram artifacts")}
      ${metric("Captions", report.summary.manualCaptions, "manual caption files")}
      ${metric("WER", fmtPct(report.summary.medianWer), `${report.summary.scored} scored rows`)}
      ${metric("Review", report.summary.reviewRequired, "manual review required")}
      ${metric("Target Size", `${report.summary.targetHours.toFixed(1)}h`, "target runtime before clipping")}
    </section>
  </header>
  <main>
    <div class="callout ${validationClass}">
      ${report.validation.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
    </div>

    <section class="band">
      <div class="band-head">
        <h2>Category Coverage</h2>
        <p>Each category has 10 rows. Failure modes are intentionally specific so later scoring can say what broke.</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Rows</th>
              <th>Review</th>
              <th>High Sens.</th>
              <th>High Quote</th>
              <th>High Harm</th>
              <th>Heavy</th>
              <th>Target</th>
              <th>Failure Modes</th>
            </tr>
          </thead>
          <tbody>${renderCategorySummary(report)}</tbody>
        </table>
      </div>
    </section>

    <div class="grid-four">
      ${renderCounts("Sensitivity Levels", report.sensitivity)}
      ${renderCounts("Quotation Risk", report.quotationRisk)}
      ${renderCounts("Identity Or Harm Risk", report.identityOrHarmRisk)}
      ${renderCounts("Overlap", report.overlap)}
    </div>

    ${renderCategorySections(report)}
  </main>
</body>
</html>`;
}

async function main() {
  const rows = await readRows();
  const report = await buildReport(rows);
  const html = renderHtml(report);
  const json = JSON.stringify(report, null, 2);

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_REPORT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(REPORT_JSON, json),
    fs.writeFile(REPORT_HTML, html),
    fs.writeFile(PUBLIC_REPORT_JSON, json),
    fs.writeFile(PUBLIC_REPORT_HTML, html),
  ]);

  console.log(`Wrote ${REPORT_HTML}`);
  console.log(`Wrote ${PUBLIC_REPORT_HTML}`);
  for (const line of report.validation) console.log(line);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
