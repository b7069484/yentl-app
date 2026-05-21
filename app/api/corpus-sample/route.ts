import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import type {
  ClaimCard,
  MarkerSeverity,
  MarkerType,
  PrimaryLabel,
  RhetoricMarker,
  SessionSource,
  Speaker,
  TranscriptSegment,
} from "@/lib/types";

const ALLOWED_SAMPLE_IDS = new Set(["solo_005", "cable_008", "israel_010"]);
const VALID_LABELS = new Set<PrimaryLabel>([
  "TRUE",
  "MOSTLY_TRUE",
  "PARTIAL",
  "MISLEADING",
  "OMISSION",
  "FALSE",
  "UNVERIFIABLE",
  "OPINION",
]);
const VALID_MARKER_TYPES = new Set<MarkerType>(["fallacy", "bias", "rhetoric"]);
const VALID_SEVERITIES = new Set<MarkerSeverity>(["subtle", "clear", "blatant"]);

type VideoRow = {
  id: string;
  category: string;
  url: string;
  video_id: string;
  title_resolved: string;
  channel_resolved: string;
  duration_resolved_s: string;
};

type DeepgramUtterance = {
  start?: number;
  end?: number;
  transcript?: string;
  speaker?: number;
};

type DeepgramTranscript = {
  results?: {
    utterances?: DeepgramUtterance[];
  };
};

type ReplayClaim = {
  id?: string;
  claim_text?: string;
  utterance_start?: number;
  utterance_end?: number;
  speaker_id?: number | null;
  topic?: string;
  topic_secondary?: string | null;
  status?: string;
  provisional?: {
    primary_label?: PrimaryLabel;
    score?: number;
    annotations?: string[];
    explanation?: string;
  };
};

type ReplayMarker = {
  id?: string;
  type?: string;
  name?: string;
  display?: string;
  excerpt?: string;
  start_time?: number;
  end_time?: number;
  severity?: string;
  explanation?: string;
  speaker_id?: number | null;
};

type ReplayRecord = {
  id: string;
  title: string;
  category: string;
  verify: string;
  utterancesReplayed: number;
  claims?: ReplayClaim[];
  markers?: ReplayMarker[];
  errors?: Array<{ stage: string; message: string }>;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!ALLOWED_SAMPLE_IDS.has(id)) {
    return NextResponse.json(
      { error: { code: "UNKNOWN_SAMPLE", message: "Unknown corpus sample." } },
      { status: 404 },
    );
  }

  try {
    const [row, transcript, replay] = await Promise.all([
      readVideoRow(id),
      readTranscript(id),
      readReplay(id),
    ]);

    if (!row || !transcript || !replay) {
      return NextResponse.json(
        { error: { code: "MISSING_SAMPLE", message: "Corpus sample artifacts are incomplete." } },
        { status: 404 },
      );
    }

    const segments = segmentsFromTranscript(transcript, replay.utterancesReplayed);
    const speakers = speakersFromSegments(segments);
    const source: SessionSource = {
      kind: "youtube",
      video_id: row.video_id,
      url: row.url,
      title: row.title_resolved || replay.title,
      channel: row.channel_resolved || undefined,
      duration_sec: numberOrUndefined(row.duration_resolved_s),
    };

    return NextResponse.json({
      id,
      title: row.title_resolved || replay.title,
      category: row.category || replay.category,
      url: row.url,
      source,
      speakers,
      segments,
      claims: claimsFromReplay(replay),
      markers: markersFromReplay(replay),
      replay: {
        verify: replay.verify,
        utterancesAvailable: transcript.results?.utterances?.length ?? segments.length,
        utterancesReplayed: replay.utterancesReplayed,
        errors: replay.errors ?? [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SAMPLE_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Could not load corpus sample.",
        },
      },
      { status: 500 },
    );
  }
}

async function readVideoRow(id: string): Promise<VideoRow | null> {
  const csv = await fs.readFile(path.join(process.cwd(), "test-corpus/videos.csv"), "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as VideoRow[];
  return rows.find((row) => row.id === id) ?? null;
}

async function readTranscript(id: string): Promise<DeepgramTranscript | null> {
  return readJson(path.join(process.cwd(), "test-corpus/transcripts", `${id}.json`));
}

async function readReplay(id: string): Promise<ReplayRecord | null> {
  return readJson(path.join(process.cwd(), "test-corpus/scores", `${id}.replay.json`));
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function segmentsFromTranscript(
  transcript: DeepgramTranscript,
  limit: number,
): TranscriptSegment[] {
  return (transcript.results?.utterances ?? [])
    .filter((utterance) => utterance.transcript && typeof utterance.start === "number")
    .slice(0, Math.max(1, limit))
    .map((utterance) => ({
      text: utterance.transcript ?? "",
      start: utterance.start ?? 0,
      end: Math.max(utterance.end ?? utterance.start ?? 0, utterance.start ?? 0),
      is_final: true,
      speaker_id: typeof utterance.speaker === "number" ? utterance.speaker : null,
    }));
}

function speakersFromSegments(segments: TranscriptSegment[]): Speaker[] {
  return [...new Set(
    segments
      .map((segment) => segment.speaker_id)
      .filter((speakerId): speakerId is number => speakerId !== null),
  )].map((id) => ({ id, label: `Speaker ${id + 1}` }));
}

function claimsFromReplay(replay: ReplayRecord): ClaimCard[] {
  return (replay.claims ?? []).flatMap((claim, index) => {
    const text = claim.claim_text?.trim();
    if (!text) return [];
    const label = claim.provisional?.primary_label;
    return [{
      id: claim.id ?? `${replay.id}-claim-${index + 1}`,
      claim_text: text,
      utterance_start: numberOrDefault(claim.utterance_start, 0),
      utterance_end: numberOrDefault(claim.utterance_end, numberOrDefault(claim.utterance_start, 0)),
      speaker_id: typeof claim.speaker_id === "number" || claim.speaker_id === null
        ? claim.speaker_id
        : null,
      topic: claim.topic ?? "General",
      topic_secondary: claim.topic_secondary ?? null,
      primary_label: label && VALID_LABELS.has(label) ? label : "UNVERIFIABLE",
      score: numberOrDefault(claim.provisional?.score, 50),
      annotations: claim.provisional?.annotations ?? ["Corpus replay sample"],
      explanation:
        claim.provisional?.explanation ??
        "Extracted during corpus replay. Verification was not requested for this sample.",
      status: "provisional",
      sources: [],
    }];
  });
}

function markersFromReplay(replay: ReplayRecord): RhetoricMarker[] {
  return (replay.markers ?? []).flatMap((marker, index) => {
    const excerpt = marker.excerpt?.trim();
    if (!excerpt) return [];
    const type = VALID_MARKER_TYPES.has(marker.type as MarkerType)
      ? marker.type as MarkerType
      : "rhetoric";
    const severity = VALID_SEVERITIES.has(marker.severity as MarkerSeverity)
      ? marker.severity as MarkerSeverity
      : "clear";
    return [{
      id: marker.id ?? `${replay.id}-marker-${index + 1}`,
      type,
      name: marker.name ?? "corpus_marker",
      display: marker.display ?? marker.name ?? "Corpus marker",
      excerpt,
      speaker_id: typeof marker.speaker_id === "number" || marker.speaker_id === null
        ? marker.speaker_id
        : null,
      start_time: numberOrDefault(marker.start_time, 0),
      end_time: numberOrDefault(marker.end_time, numberOrDefault(marker.start_time, 0)),
      severity,
      explanation: marker.explanation ?? "Detected during corpus replay.",
    }];
  });
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
