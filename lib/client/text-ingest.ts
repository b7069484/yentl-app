"use client";

import type { TextDocumentOutlineItem, TranscriptSegment } from "@/lib/types";
import { sourceAnalysisConsentHeaders } from "@/lib/source-consent";
import { splitSourceSentenceRanges } from "@/lib/source-evidence";

// ─── Speaker label regex ──────────────────────────────────────────────────────
// Matches: "David: ...", "Speaker 1: ...", "HOST — ...", "[00:12] David: ..."
// Captures group 1 = speaker name (2–31 chars, title-case start), group 2 = text after delimiter
// {1,30} requires at least one char after the initial uppercase — min name length is 2 chars,
// which prevents first-person "I:" from being treated as a speaker label.
const SPEAKER_LABEL_RE = /^(?:\[[^\]]{1,16}\]\s*)?([A-Z][a-zA-Z0-9 .'\\-]{1,30})\s*[:—–]\s*(.+)$/;

type SpeakerTextBlock = {
  speakerName: string | null;
  lines: string[];
  blockIndex: number;
  paragraphIndex?: number;
  lineStart?: number;
  lineEnd?: number;
};

const SYNTHETIC_SECONDS_PER_WORD = 0.4;
const MIN_SYNTHETIC_SEGMENT_SECONDS = 0.1;
const MAX_OUTLINE_ITEMS = 8;

export type PdfExtractionResult = {
  text: string;
  filename: string;
  mime: string;
  pageCount?: number;
  byteCount: number;
  outline: TextDocumentOutlineItem[];
};

// ─── Word count helper ────────────────────────────────────────────────────────
function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// ─── parsePlainText ──────────────────────────────────────────────────────────

export function parsePlainText(
  raw: string,
  opts: { withSpeakers: boolean },
): TranscriptSegment[] {
  if (!raw || !raw.trim()) return [];

  const speakerMap = new Map<string, number>();
  let wordsSoFar = 0;
  const result: TranscriptSegment[] = [];

  const blocks = opts.withSpeakers
    ? parseSpeakerTextBlocks(raw)
    : parseParagraphTextBlocks(raw);

  for (const block of blocks) {
    const body = block.lines.join(" ").trim();
    if (!body) continue;

    let speakerId = 0;
    if (opts.withSpeakers && block.speakerName !== null) {
      if (!speakerMap.has(block.speakerName)) speakerMap.set(block.speakerName, speakerMap.size);
      speakerId = speakerMap.get(block.speakerName)!;
    }

    const sentences = splitSourceSentenceRanges(body);
    for (const sentenceRange of sentences) {
      const sentence = sentenceRange.text;
      if (!sentence.trim()) continue;
      const words = wordCount(sentence);
      const start = wordsSoFar * SYNTHETIC_SECONDS_PER_WORD;
      const end = start + Math.max(words * SYNTHETIC_SECONDS_PER_WORD, MIN_SYNTHETIC_SEGMENT_SECONDS);
      result.push({
        text: sentence,
        start,
        end,
        is_final: true,
        speaker_id: speakerId,
        source_audio_kind: "text_import",
        document_anchor: {
          kind: block.speakerName ? "speaker_turn" : "paragraph",
          block_index: block.blockIndex,
          paragraph_index: block.paragraphIndex,
          line_start: block.lineStart,
          line_end: block.lineEnd,
          speaker_label: block.speakerName ?? undefined,
          char_start: sentenceRange.start,
          char_end: sentenceRange.end,
          quote_text: sentence,
        },
      });
      wordsSoFar += words;
    }
  }

  return result;
}

function parseParagraphTextBlocks(raw: string): SpeakerTextBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: SpeakerTextBlock[] = [];
  let currentLines: string[] = [];
  let currentStartLine: number | undefined;
  let currentEndLine: number | undefined;

  function flush() {
    const cleaned = currentLines.map((line) => line.trim()).filter(Boolean);
    if (cleaned.length > 0) {
      const paragraphIndex = blocks.length;
      blocks.push({
        speakerName: null,
        lines: cleaned,
        blockIndex: blocks.length,
        paragraphIndex,
        lineStart: currentStartLine,
        lineEnd: currentEndLine,
      });
    }
    currentLines = [];
    currentStartLine = undefined;
    currentEndLine = undefined;
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flush();
      return;
    }

    if (currentStartLine === undefined) currentStartLine = index + 1;
    currentEndLine = index + 1;
    currentLines.push(line);
  });

  flush();
  return blocks;
}

function parseSpeakerTextBlocks(raw: string): SpeakerTextBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: SpeakerTextBlock[] = [];
  let current: Omit<SpeakerTextBlock, "blockIndex"> | null = null;
  let labelsFound = 0;

  function flush() {
    if (!current) return;
    const cleaned = current.lines.map((line) => line.trim()).filter(Boolean);
    if (cleaned.length) {
      blocks.push({
        ...current,
        lines: cleaned,
        blockIndex: blocks.length,
        paragraphIndex: blocks.length,
      });
    }
    current = null;
  }

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }

    const match = SPEAKER_LABEL_RE.exec(line);
    if (match?.[1] && match[2]) {
      labelsFound += 1;
      flush();
      current = {
        speakerName: match[1].trim(),
        lines: [match[2].trim()],
        lineStart: index + 1,
        lineEnd: index + 1,
      };
      continue;
    }

    if (!current) {
      current = {
        speakerName: null,
        lines: [line],
        lineStart: index + 1,
        lineEnd: index + 1,
      };
    } else {
      current.lines.push(line);
      current.lineEnd = index + 1;
    }
  }

  flush();

  if (labelsFound === 0) {
    return parseParagraphTextBlocks(raw);
  }

  return blocks;
}

// ─── parseArticleText ────────────────────────────────────────────────────────

export function parseArticleText(
  raw: string,
  opts: { chunkWords?: number; maxWords?: number } = {},
): TranscriptSegment[] {
  if (!raw || !raw.trim()) return [];

  const chunkWords = Math.max(40, opts.chunkWords ?? 80);
  const maxWords = Math.max(chunkWords, opts.maxWords ?? 2200);
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const result: TranscriptSegment[] = [];
  let wordsSoFar = 0;
  let chunk: string[] = [];
  let chunkWordCount = 0;
  let chunkParagraphStart: number | undefined;

  function flush() {
    if (chunk.length === 0 || chunkWordCount === 0) return;
    const start = wordsSoFar * SYNTHETIC_SECONDS_PER_WORD;
    const end = start + Math.max(chunkWordCount * SYNTHETIC_SECONDS_PER_WORD, MIN_SYNTHETIC_SEGMENT_SECONDS);
    const blockIndex = result.length;
    const text = chunk.join("\n\n");
    result.push({
      text,
      start,
      end,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "text_import",
      document_anchor: {
        kind: "article_chunk",
        block_index: blockIndex,
        paragraph_index: chunkParagraphStart,
        char_start: 0,
        char_end: text.length,
        quote_text: text,
      },
    });
    wordsSoFar += chunkWordCount;
    chunk = [];
    chunkWordCount = 0;
    chunkParagraphStart = undefined;
  }

  for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
    if (wordsSoFar + chunkWordCount >= maxWords) break;
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let offset = 0;
    while (offset < words.length && wordsSoFar + chunkWordCount < maxWords) {
      const remaining = maxWords - wordsSoFar - chunkWordCount;
      const capacity = Math.min(remaining, chunkWords - chunkWordCount);
      const clippedWords = words.slice(offset, offset + capacity);
      const clipped = clippedWords.join(" ");
      const clippedCount = clippedWords.length;
      if (!clipped || clippedCount === 0) break;

      if (chunkWordCount > 0 && chunkWordCount + clippedCount > chunkWords) {
        flush();
      }

      if (chunkParagraphStart === undefined) chunkParagraphStart = paragraphIndex;
      chunk.push(clipped);
      chunkWordCount += clippedCount;
      offset += clippedCount;

      if (chunkWordCount >= chunkWords) flush();
    }
  }

  flush();
  return result;
}

export function buildDocumentOutline(
  raw: string,
  opts: { maxItems?: number } = {},
): TextDocumentOutlineItem[] {
  const maxItems = Math.max(1, opts.maxItems ?? MAX_OUTLINE_ITEMS);
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const headings: TextDocumentOutlineItem[] = [];

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || line.length > 140) continue;
    const markdownHeading = line.startsWith("#") ? line.replace(/^#{1,4}\s+/, "").trim() : "";
    const numberedHeading = /^(?:\d+(?:\.\d+)*|[A-Z])[.)]\s+(.{8,120})$/.exec(line);
    const allCapsHeading = line.length >= 8 && line.length <= 80 && line === line.toUpperCase() && /[A-Z]/.test(line);
    const label = markdownHeading || numberedHeading?.[1] || (allCapsHeading ? line : "");
    if (!label) continue;

    headings.push({
      kind: "heading",
      label: compactOutlineText(label, 72),
      preview: compactOutlineText(nextPreviewLine(lines, index + 1), 140),
      line_start: index + 1,
    });
    if (headings.length >= maxItems) return headings;
  }
  if (headings.length > 0) return headings;

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.split(/\s+/).filter(Boolean).length >= 6);

  return paragraphs.slice(0, maxItems).map((paragraph, index) => ({
    kind: "paragraph",
    label: `Paragraph ${index + 1}`,
    preview: compactOutlineText(paragraph, 140),
    paragraph_index: index,
  }));
}

function nextPreviewLine(lines: string[], startIndex: number) {
  for (let i = startIndex; i < lines.length; i++) {
    const candidate = lines[i].trim();
    if (candidate.length > 0) return candidate;
  }
  return "";
}

function compactOutlineText(value: string, maxChars: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars - 3).trim()}...`;
}

// ─── parseDocx ───────────────────────────────────────────────────────────────

export async function parseDocx(file: File): Promise<string> {
  let mammoth: {
    extractRawText: (opts: {
      arrayBuffer?: ArrayBuffer;
      buffer?: Buffer;
    }) => Promise<{ value: string }>;
  };
  try {
    // Try the browser-specific path first; fall back to main package
    mammoth = await import("mammoth") as typeof mammoth;
  } catch {
    throw new Error("Failed to load mammoth. Is it installed?");
  }

  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch (e) {
    throw new Error(`Failed to read file as ArrayBuffer: ${String(e)}`);
  }

  let result: { value: string };
  try {
    result = await mammoth.extractRawText({ arrayBuffer: buf });
  } catch (arrayBufferError) {
    // Node mammoth expects a Buffer; browser builds accept arrayBuffer.
    try {
      result = await mammoth.extractRawText({
        buffer: Buffer.from(new Uint8Array(buf)),
      });
    } catch (nodeError) {
      throw new Error(
        `mammoth.extractRawText failed: ${String(arrayBufferError)}; node fallback: ${String(nodeError)}`,
      );
    }
  }

  return result.value;
}

// ─── parsePdf ────────────────────────────────────────────────────────────────

export async function parsePdf(file: File): Promise<string> {
  return (await parsePdfWithMetadata(file)).text;
}

export async function parsePdfWithMetadata(file: File): Promise<PdfExtractionResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/document-ingest", {
    method: "POST",
    headers: sourceAnalysisConsentHeaders(),
    body: form,
  });

  const data = (await res.json()) as {
    filename?: string;
    mime?: string;
    text?: string;
    page_count?: number;
    byte_count?: number;
    error?: { message?: string };
  };
  if (!res.ok || !data.text) {
    throw new Error(data.error?.message ?? `PDF extraction failed (${res.status})`);
  }
  return {
    text: data.text,
    filename: data.filename ?? file.name,
    mime: (data.mime ?? file.type) || "application/pdf",
    pageCount: data.page_count,
    byteCount: data.byte_count ?? file.size,
    outline: buildDocumentOutline(data.text),
  };
}

// ─── parseTimedText ──────────────────────────────────────────────────────────

export function parseTimedText(raw: string, kind: "srt" | "vtt"): TranscriptSegment[] {
  return kind === "srt" ? parseSrt(raw) : parseVtt(raw);
}

function parseSrt(srt: string): TranscriptSegment[] {
  const normalized = srt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized
    .split(/\n\s*\n/)
    .map((block, index) => parseTimedBlock(block, /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/, index))
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

function parseVtt(vtt: string): TranscriptSegment[] {
  const normalized = vtt
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^WEBVTT[^\n]*\n/i, "");
  return normalized
    .split(/\n\s*\n/)
    .map((block, index) => parseTimedBlock(block, /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/, index))
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
}

function parseTimedBlock(block: string, timeRe: RegExp, cueIndex: number): TranscriptSegment | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const timeIndex = lines.findIndex((line) => timeRe.test(line));
  if (timeIndex < 0) return null;

  const match = timeRe.exec(lines[timeIndex]);
  if (!match?.[1] || !match[2]) return null;
  const text = lines
    .slice(timeIndex + 1)
    .join(" ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  return {
    text,
    start: timestampToSeconds(match[1]),
    end: timestampToSeconds(match[2]),
    is_final: true,
    speaker_id: null,
    source_audio_kind: "srt_vtt",
    document_anchor: {
      kind: "caption_cue",
      block_index: cueIndex,
      cue_index: cueIndex,
      char_start: 0,
      char_end: text.length,
      quote_text: text,
    },
  };
}

function timestampToSeconds(value: string): number {
  const normalized = value.replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return Number(minutes) * 60 + Number(seconds);
  }
  const [hours, minutes, seconds] = parts;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}
