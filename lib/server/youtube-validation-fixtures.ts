import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TranscriptSegment } from "@/lib/types";

type YouTubeValidationFixture = {
  videoId: string;
  title: string;
  channel: string;
  url: string;
  vttPath: string;
  maxSegments: number;
};

const FIXTURES: Record<string, YouTubeValidationFixture> = {
  fTznEIZRkLg: {
    videoId: "fTznEIZRkLg",
    title: "Hans Rosling: Global population growth, box by box",
    channel: "TED",
    url: "https://www.youtube.com/watch?v=fTznEIZRkLg",
    vttPath: "test-corpus/ground-truth/fTznEIZRkLg.en.vtt",
    maxSegments: 10,
  },
};

export type LoadedYouTubeValidationFixture = {
  video_id: string;
  url: string;
  title: string;
  channel: string;
  transcript_segments: TranscriptSegment[];
  validation_fixture: true;
  validation_note: string;
};

export async function loadYouTubeValidationFixture(
  videoId: string,
): Promise<LoadedYouTubeValidationFixture | null> {
  if (process.env.NODE_ENV === "production") return null;

  const fixture = FIXTURES[videoId];
  if (!fixture) return null;

  const vtt = await readFile(join(process.cwd(), fixture.vttPath), "utf-8");
  const segments = parseVtt(vtt).slice(0, fixture.maxSegments);
  if (segments.length === 0) return null;

  return {
    video_id: fixture.videoId,
    url: fixture.url,
    title: fixture.title,
    channel: fixture.channel,
    transcript_segments: segments,
    validation_fixture: true,
    validation_note:
      "Local development validation fixture used after live YouTube captions were unavailable.",
  };
}

export function parseVtt(vtt: string): TranscriptSegment[] {
  const normalized = vtt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\s*\n/);
  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    if (lines[0] === "WEBVTT" || lines[0].startsWith("Kind:") || lines[0].startsWith("Language:")) {
      continue;
    }

    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex === -1) continue;

    const timeMatch = lines[timeLineIndex].match(
      /^(.+?)\s*-->\s*(.+?)(?:\s+.*)?$/,
    );
    if (!timeMatch) continue;

    const start = parseVttTimestamp(timeMatch[1]);
    const end = parseVttTimestamp(timeMatch[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      continue;
    }

    const text = lines
      .slice(timeLineIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) continue;

    segments.push({
      text,
      start,
      end,
      is_final: true,
      speaker_id: 0,
    });
  }

  return segments;
}

function parseVttTimestamp(value: string): number {
  const parts = value.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return Number.NaN;

  const secondsPart = parts.at(-1);
  if (!secondsPart) return Number.NaN;

  const seconds = Number(secondsPart);
  const minutes = Number(parts.at(-2));
  const hours = parts.length === 3 ? Number(parts[0]) : 0;

  if (![seconds, minutes, hours].every(Number.isFinite)) return Number.NaN;
  return hours * 3600 + minutes * 60 + seconds;
}
