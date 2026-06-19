import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  buildDocumentOutline,
  parseDocx,
  parsePlainText,
  parseTimedText,
} from "@/lib/client/text-ingest";

const ROOT = process.cwd();
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/text-document-fixtures-proof.json");

type CheckResult = {
  name: string;
  ok: boolean;
  elapsed_ms: number;
  error?: string;
  [key: string]: unknown;
};

async function main() {
  const checks: CheckResult[] = [];
  checks.push(await runCheck("txt-transcript", proveTxtTranscript));
  checks.push(await runCheck("markdown-document", proveMarkdownDocument));
  checks.push(await runCheck("docx-document", proveDocxDocument));
  checks.push(await runCheck("srt-captions", proveSrtCaptions));
  checks.push(await runCheck("vtt-captions", proveVttCaptions));

  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    throw new Error(`Text/document fixture proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function runCheck(name: string, fn: () => Promise<Record<string, unknown>>): Promise<CheckResult> {
  const startedAt = Date.now();
  try {
    const details = await fn();
    return {
      name,
      ok: true,
      elapsed_ms: Date.now() - startedAt,
      ...details,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      elapsed_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function proveTxtTranscript() {
  const file = "public/validation/yentl-synthetic-transcript.txt";
  const raw = await readFixtureText(file);
  const segments = parsePlainText(raw, { withSpeakers: true });
  assert(segments.length >= 5, `expected at least 5 TXT segments, got ${segments.length}`);
  assert(segments.some((segment) => segment.speaker_id === 1), "TXT fixture did not preserve second speaker");
  assert(
    segments.some((segment) => segment.document_anchor?.kind === "speaker_turn"),
    "TXT fixture did not produce speaker-turn anchors",
  );
  return {
    file,
    segment_count: segments.length,
    speaker_ids: uniqueSpeakerIds(segments),
    first_anchor_kind: segments[0]?.document_anchor?.kind ?? null,
  };
}

async function proveMarkdownDocument() {
  const file = "public/validation/yentl-synthetic-transcript.md";
  const raw = await readFixtureText(file);
  const segments = parsePlainText(raw, { withSpeakers: true });
  const outline = buildDocumentOutline(raw);
  assert(segments.length >= 5, `expected at least 5 Markdown segments, got ${segments.length}`);
  assert(outline.length >= 1, "Markdown fixture did not produce an outline");
  assert(
    outline.some((item) => /validation|transcript|brief/i.test(item.label)),
    `Markdown outline labels were not meaningful: ${outline.map((item) => item.label).join(", ")}`,
  );
  return {
    file,
    segment_count: segments.length,
    outline_count: outline.length,
    first_outline: outline[0]?.label ?? null,
  };
}

async function proveDocxDocument() {
  const file = "public/validation/yentl-small-brief.docx";
  const buffer = await readFile(join(ROOT, file));
  const docx = new File([buffer], "yentl-small-brief.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const text = await parseDocx(docx);
  const segments = parsePlainText(text, { withSpeakers: true });
  const outline = buildDocumentOutline(text);
  assert(text.length > 120, `DOCX extraction was too short: ${text.length} chars`);
  assert(/library|budget|claim|source/i.test(text), "DOCX text missing expected validation vocabulary");
  assert(segments.length >= 3, `expected at least 3 DOCX segments, got ${segments.length}`);
  return {
    file,
    text_chars: text.length,
    segment_count: segments.length,
    outline_count: outline.length,
  };
}

async function proveSrtCaptions() {
  const file = "public/validation/yentl-synthetic-captions.srt";
  const raw = await readFixtureText(file);
  const segments = parseTimedText(raw, "srt");
  assert(segments.length === 5, `expected 5 SRT cues, got ${segments.length}`);
  assert(segments[0]?.source_audio_kind === "srt_vtt", "SRT cues did not preserve source kind");
  assert(segments.every((segment) => segment.end > segment.start), "SRT cue timing is not monotonic");
  return {
    file,
    segment_count: segments.length,
    first_start: segments[0]?.start,
    last_end: segments.at(-1)?.end,
  };
}

async function proveVttCaptions() {
  const file = "public/validation/yentl-synthetic-captions.vtt";
  const raw = await readFixtureText(file);
  const segments = parseTimedText(raw, "vtt");
  assert(segments.length === 5, `expected 5 VTT cues, got ${segments.length}`);
  assert(segments[0]?.source_audio_kind === "srt_vtt", "VTT cues did not preserve source kind");
  assert(segments.every((segment) => segment.end > segment.start), "VTT cue timing is not monotonic");
  return {
    file,
    segment_count: segments.length,
    first_start: segments[0]?.start,
    last_end: segments.at(-1)?.end,
  };
}

async function readFixtureText(path: string) {
  return readFile(join(ROOT, path), "utf8");
}

function uniqueSpeakerIds(segments: Array<{ speaker_id?: number | null }>) {
  return Array.from(new Set(segments.map((segment) => segment.speaker_id))).sort();
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
