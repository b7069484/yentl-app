"use client";

import type { TranscriptSegment } from "@/lib/types";

// ─── Speaker label regex ──────────────────────────────────────────────────────
// Matches: "David: ...", "David — ...", "David – ..."
// Captures group 1 = speaker name (2–31 chars, title-case start), group 2 = text after delimiter
// {1,30} requires at least one char after the initial uppercase — min name length is 2 chars,
// which prevents first-person "I:" from being treated as a speaker label.
const SPEAKER_LABEL_RE = /^([A-Z][a-zA-Z .'\\-]{1,30})\s*[:—–]\s*(.+)$/;

// ─── Word count helper ────────────────────────────────────────────────────────
function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// ─── Sentence splitter ────────────────────────────────────────────────────────
function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Try Intl.Segmenter first (modern browsers / Node 16+)
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const seg = new Intl.Segmenter("en", { granularity: "sentence" });
      const segments = Array.from(seg.segment(trimmed));
      const sentences = segments
        .map((s) => s.segment.trim())
        .filter((s) => s.length > 0);
      if (sentences.length > 0) return sentences;
    } catch {
      // fall through to regex fallback
    }
  }

  // Regex fallback: split on sentence boundary (period/!/? followed by whitespace + uppercase)
  const parts = trimmed.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

// ─── parsePlainText ──────────────────────────────────────────────────────────

export function parsePlainText(
  raw: string,
  opts: { withSpeakers: boolean },
): TranscriptSegment[] {
  if (!raw || !raw.trim()) return [];

  // Split on 2+ consecutive newlines (paragraph boundaries)
  const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (paragraphs.length === 0) return [];

  const speakerMap = new Map<string, number>();
  let wordsSoFar = 0;
  const result: TranscriptSegment[] = [];

  for (const paragraph of paragraphs) {
    // Attempt speaker label extraction from the first line of the paragraph
    const lines = paragraph.split("\n");
    let speakerName: string | null = null;
    let bodyLines: string[];

    if (opts.withSpeakers) {
      const firstLineMatch = SPEAKER_LABEL_RE.exec(lines[0]);
      if (firstLineMatch) {
        speakerName = firstLineMatch[1].trim();
        // Replace the first line with just the text portion (after the label)
        bodyLines = [firstLineMatch[2].trim(), ...lines.slice(1)];
      } else {
        bodyLines = lines;
      }
    } else {
      bodyLines = lines;
    }

    // Resolve speaker_id
    let speakerId: number;
    if (opts.withSpeakers && speakerName !== null) {
      if (!speakerMap.has(speakerName)) {
        speakerMap.set(speakerName, speakerMap.size);
      }
      speakerId = speakerMap.get(speakerName)!;
    } else {
      speakerId = 0;
    }

    // Join body lines into a single string and split into sentences
    const body = bodyLines.join(" ").trim();
    if (!body) continue;

    const sentences = splitSentences(body);
    for (const sentence of sentences) {
      if (!sentence.trim()) continue;
      const words = wordCount(sentence);
      const start = wordsSoFar * 400;
      const end = start + Math.max(words * 400, 1);
      result.push({
        text: sentence,
        start,
        end,
        is_final: true,
        speaker_id: speakerId,
      });
      wordsSoFar += words;
    }
  }

  return result;
}

// ─── parseDocx ───────────────────────────────────────────────────────────────

export async function parseDocx(file: File): Promise<string> {
  let mammoth: { extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
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
  } catch (e) {
    throw new Error(`mammoth.extractRawText failed: ${String(e)}`);
  }

  return result.value;
}
