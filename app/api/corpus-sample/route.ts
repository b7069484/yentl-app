import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import type {
  ClaimCard,
  MarkerSeverity,
  MarkerType,
  PersistedDevilAdvocate,
  PrimaryLabel,
  RhetoricMarker,
  SessionSource,
  Speaker,
  SpeakerVerdict,
  TranscriptSegment,
} from "@/lib/types";

const SOURCE_QUOTE_ANCHOR_SAMPLE_ID = "source_quote_anchors";
const MEDIA_PLAYBACK_SYNC_SAMPLE_ID = "media_playback_sync";
const ALLOWED_SAMPLE_IDS = new Set([
  "solo_005",
  "cable_008",
  "israel_010",
  SOURCE_QUOTE_ANCHOR_SAMPLE_ID,
  MEDIA_PLAYBACK_SYNC_SAMPLE_ID,
]);
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

type CorpusSampleSynthesis = {
  text: string;
  headlines: string[];
  per_speaker_verdicts: SpeakerVerdict[];
};

type CorpusSampleDevilAdvocate = Omit<PersistedDevilAdvocate, "at">;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!validationDemoEnabled()) {
    return NextResponse.json(
      { error: { code: "VALIDATION_DEMO_DISABLED", message: "Validation demos are not enabled in this environment." } },
      { status: 404 },
    );
  }

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!ALLOWED_SAMPLE_IDS.has(id)) {
    return NextResponse.json(
      { error: { code: "UNKNOWN_SAMPLE", message: "Unknown corpus sample." } },
      { status: 404 },
    );
  }

  try {
    if (id === SOURCE_QUOTE_ANCHOR_SAMPLE_ID) {
      return NextResponse.json(sourceQuoteAnchorSample());
    }
    if (id === MEDIA_PLAYBACK_SYNC_SAMPLE_ID) {
      return NextResponse.json(mediaPlaybackSyncSample());
    }

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
    const claims = claimsFromReplay(replay);
    const markers = markersFromReplay(replay);
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
      claims,
      markers,
      synthesis: synthesisFromSample({ replay, source, speakers, claims, markers }),
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

function validationDemoEnabled(): boolean {
  if (process.env.YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}

function sourceQuoteAnchorSample() {
  const title = "Source Review quote-anchor proof";
  const firstQuote = "The city published the release log on Friday and said the update was available to the public.";
  const secondQuote = "The audit timeline showed the report was added to the public archive before the meeting started.";
  const followupQuote = "A council member later claimed the report had been hidden from residents.";
  const initialText = [
    "Yentl source review proof",
    "",
    `${firstQuote} ${secondQuote}`,
    "",
    followupQuote,
  ].join("\n");
  const firstBlockText = `${firstQuote} ${secondQuote}`;
  const secondQuoteStart = firstBlockText.indexOf(secondQuote);
  const source: SessionSource = {
    kind: "text_doc",
    filename: "Source Review quote-anchor proof",
    mime: "text/plain",
    byte_count: initialText.length,
    intent: "document",
    initial_text: initialText,
    document_meta: {
      extraction_kind: "plain_text",
      outline: [
        {
          kind: "heading",
          label: "Yentl source review proof",
          preview: firstQuote,
          line_start: 1,
        },
        {
          kind: "paragraph",
          label: "Release log and audit timeline",
          preview: firstQuote,
          paragraph_index: 1,
          line_start: 3,
        },
        {
          kind: "paragraph",
          label: "Public claim follow-up",
          preview: followupQuote,
          paragraph_index: 2,
          line_start: 5,
        },
      ],
    },
  };
  const segments: TranscriptSegment[] = [
    {
      id: "source-quote-seg-1",
      text: firstQuote,
      start: 0,
      end: 6,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "text_import",
      document_anchor: {
        kind: "paragraph",
        block_index: 1,
        paragraph_index: 1,
        line_start: 3,
        line_end: 3,
        char_start: 0,
        char_end: firstQuote.length,
        quote_text: firstQuote,
      },
    },
    {
      id: "source-quote-seg-2",
      text: secondQuote,
      start: 6,
      end: 13,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "text_import",
      document_anchor: {
        kind: "paragraph",
        block_index: 1,
        paragraph_index: 1,
        line_start: 3,
        line_end: 3,
        char_start: secondQuoteStart,
        char_end: secondQuoteStart + secondQuote.length,
        quote_text: secondQuote,
      },
    },
    {
      id: "source-quote-seg-3",
      text: followupQuote,
      start: 13,
      end: 18,
      is_final: true,
      speaker_id: 1,
      source_audio_kind: "text_import",
      document_anchor: {
        kind: "paragraph",
        block_index: 2,
        paragraph_index: 2,
        line_start: 5,
        line_end: 5,
        char_start: 0,
        char_end: followupQuote.length,
        quote_text: followupQuote,
      },
    },
  ];
  const claims: ClaimCard[] = [
    {
      id: "source-quote-claim-release",
      claim_text: "The release log update was available to the public on Friday.",
      utterance_start: 0,
      utterance_end: 6,
      speaker_id: 0,
      topic: "Law",
      topic_secondary: null,
      primary_label: "TRUE",
      score: 94,
      annotations: ["Persisted source quote", "Public-record availability"],
      explanation:
        "The imported document explicitly says the release log update was available to the public.",
      status: "confirmed",
      sources: [],
      document_anchor: segments[0].document_anchor,
    },
    {
      id: "source-quote-claim-audit",
      claim_text: "The audit timeline showed the report was added to the public archive before the meeting started.",
      utterance_start: 6,
      utterance_end: 13,
      speaker_id: 0,
      topic: "Law",
      topic_secondary: "Politics",
      primary_label: "TRUE",
      score: 96,
      annotations: ["Persisted source quote", "Archive timing"],
      explanation:
        "The quote anchor points to the exact sentence establishing when the report entered the public archive.",
      status: "confirmed",
      sources: [],
      document_anchor: segments[1].document_anchor,
    },
    {
      id: "source-quote-claim-hidden",
      claim_text: "The report had been hidden from residents.",
      utterance_start: 13,
      utterance_end: 18,
      speaker_id: 1,
      topic: "Law",
      topic_secondary: null,
      primary_label: "MISLEADING",
      score: 42,
      annotations: ["Contradicted by earlier archive timing", "Needs source review"],
      explanation:
        "The follow-up claim conflicts with the source block showing the report was already public before the meeting.",
      status: "confirmed",
      sources: [],
      document_anchor: segments[2].document_anchor,
    },
  ];
  const speakers: Speaker[] = [
    { id: 0, label: "Document" },
    { id: 1, label: "Council member" },
  ];

  return {
    id: SOURCE_QUOTE_ANCHOR_SAMPLE_ID,
    title,
    category: "source_review",
    url: "/session?demo=validation&sample=source_quote_anchors&view=source",
    source,
    speakers,
    segments,
    claims,
    markers: [],
    synthesis: {
      text:
        "This validation workspace proves Source Review can open an imported document, map claims to source blocks, and highlight persisted quote anchors.",
      headlines: [
        "Imported text source loaded",
        "Three claim anchors mapped",
        "Persisted quote offsets available",
      ],
      per_speaker_verdicts: speakers.map((speaker) =>
        speakerVerdictFromReplay(speaker, claims, []),
      ),
    },
    devil_advocate: sourceQuoteAnchorDevilAdvocate(),
    replay: {
      verify: "source_review",
      utterancesAvailable: segments.length,
      utterancesReplayed: segments.length,
      errors: [],
    },
  };
}

function sourceQuoteAnchorDevilAdvocate(): CorpusSampleDevilAdvocate {
  return {
    stance:
      "A skeptic would challenge whether the hidden-report claim has been tested against all public release channels, not only this imported excerpt.",
    strongest_counterarguments: [
      "The imported source proves one archive path, but another public channel could still have been delayed.",
      "A report being public before the meeting does not prove every resident had practical notice.",
      "The phrase hidden may be rhetorical shorthand for poor visibility rather than a literal claim of concealment.",
    ],
    weakest_assumption:
      "The weakest assumption is that the quote-anchored document alone captures the whole public-access timeline.",
    questions: [
      "Which official channels published the report before the meeting?",
      "Does the claim mean legally hidden, practically hard to find, or politically under-promoted?",
    ],
    confidence: "medium",
    model: "validation-fixture",
  };
}

function mediaPlaybackSyncSample() {
  const title = "Synthetic audio playback sync proof";
  const source: SessionSource = {
    kind: "audio_file",
    blob_url: "/validation/yentl-synthetic-panel.wav",
    duration_sec: 31.953,
    filename: "yentl-synthetic-panel.wav",
    mime: "audio/wav",
  };
  const segments: TranscriptSegment[] = [
    {
      id: "media-sync-seg-1",
      text: "Welcome to the Yentl validation panel.",
      start: 0,
      end: 4,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "audio_file",
    },
    {
      id: "media-sync-seg-2",
      text: "The city library budget increased by 12 percent this year, according to the mayor's office.",
      start: 4,
      end: 10,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "audio_file",
    },
    {
      id: "media-sync-seg-3",
      text: "That number needs context because the technology grant expired.",
      start: 10,
      end: 17,
      is_final: true,
      speaker_id: 1,
      source_audio_kind: "audio_file",
    },
    {
      id: "media-sync-seg-4",
      text: "If we do not ban every social platform by Friday, schools will collapse and nobody will learn anything.",
      start: 17,
      end: 25,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "audio_file",
    },
    {
      id: "media-sync-seg-5",
      text: "That is a slippery slope. Which platforms create measurable distraction, and what evidence supports the claim?",
      start: 25,
      end: 33,
      is_final: true,
      speaker_id: 1,
      source_audio_kind: "audio_file",
    },
  ];
  const claims: ClaimCard[] = [
    {
      id: "media-sync-claim-budget",
      claim_text: "The city library budget increased by 12 percent this year.",
      utterance_start: 4,
      utterance_end: 10,
      speaker_id: 0,
      topic: "Local government",
      topic_secondary: "Budget",
      primary_label: "PARTIAL",
      score: 64,
      annotations: ["Audio-timed claim", "Context caveat follows at 00:10"],
      explanation:
        "The audio states a 12 percent operating-budget increase, but the next turn adds that an expired technology grant may change the total-program picture.",
      status: "provisional",
      sources: [],
    },
    {
      id: "media-sync-claim-platform-collapse",
      claim_text: "If every social platform is not banned by Friday, schools will collapse and nobody will learn anything.",
      utterance_start: 17,
      utterance_end: 25,
      speaker_id: 0,
      topic: "Education",
      topic_secondary: "Technology policy",
      primary_label: "MISLEADING",
      score: 28,
      annotations: ["Audio-timed claim", "Slippery-slope framing"],
      explanation:
        "The claim leaps from a policy deadline to total school collapse without support in the provided audio context.",
      status: "provisional",
      sources: [],
    },
  ];
  const markers: RhetoricMarker[] = [
    {
      id: "media-sync-marker-slippery-slope",
      type: "fallacy",
      name: "slippery_slope",
      display: "Slippery slope",
      excerpt:
        "If we do not ban every social platform by Friday, schools will collapse and nobody will learn anything.",
      speaker_id: 0,
      start_time: 17,
      end_time: 25,
      severity: "clear",
      explanation:
        "The speaker predicts extreme collapse from one policy choice without demonstrating the causal chain.",
    },
  ];
  const speakers: Speaker[] = [
    { id: 0, label: "Moderator" },
    { id: 1, label: "Analyst" },
  ];

  return {
    id: MEDIA_PLAYBACK_SYNC_SAMPLE_ID,
    title,
    category: "media_playback",
    url: "/session?demo=validation&sample=media_playback_sync&view=watch",
    source,
    speakers,
    segments,
    claims,
    markers,
    synthesis: {
      text:
        "This validation workspace proves local audio playback, transcript timing, claim and marker queue seeking, and current-line highlighting against a deterministic WAV fixture.",
      headlines: [
        "Local WAV source loaded",
        "Five timed transcript cues mapped",
        "Claims and markers seek to exact audio moments",
      ],
      per_speaker_verdicts: speakers.map((speaker) =>
        speakerVerdictFromReplay(speaker, claims, markers),
      ),
    },
    replay: {
      verify: "media_playback",
      utterancesAvailable: segments.length,
      utterancesReplayed: segments.length,
      errors: [],
    },
  };
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
    const card: ClaimCard = {
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
      status: replay.verify === "none" ? "checking" : "provisional",
      sources: [],
    };
    return [applySampleClaimOverride(replay, card)];
  });
}

function synthesisFromSample({
  replay,
  source,
  speakers,
  claims,
  markers,
}: {
  replay: ReplayRecord;
  source: SessionSource;
  speakers: Speaker[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
}): CorpusSampleSynthesis {
  const sourceLabel = "title" in source && source.title ? source.title : replay.title;
  const verificationLine =
    replay.verify === "none"
      ? "source verification has not run for every extracted claim"
      : "the replay includes bundled verification labels for review";
  const markerLine =
    markers.length > 0
      ? `${markers.length} ${plural("rhetoric marker", markers.length)} mapped to the transcript`
      : "no bundled rhetoric markers in this replay";

  return {
    text:
      `Validation replay for "${sourceLabel}" has ${claims.length} ${plural("claim", claims.length)} and ${markerLine}. ` +
      `Yentl's read is replay-derived: ${verificationLine}, so keep the source context visible before sharing conclusions.`,
    headlines: [
      `${claims.length} ${plural("claim", claims.length)} loaded`,
      markers.length > 0
        ? `${markers.length} ${plural("marker", markers.length)} mapped`
        : "No markers bundled",
      replay.verify === "none" ? "Source pass pending" : "Replay verdicts included",
    ],
    per_speaker_verdicts: speakers.map((speaker) =>
      speakerVerdictFromReplay(speaker, claims, markers),
    ),
  };
}

function speakerVerdictFromReplay(
  speaker: Speaker,
  claims: ClaimCard[],
  markers: RhetoricMarker[],
): SpeakerVerdict {
  const speakerClaims = claims.filter((claim) => claim.speaker_id === speaker.id);
  const speakerMarkers = markers.filter((marker) => marker.speaker_id === speaker.id);
  const factualCounts = speakerClaims.reduce(
    (counts, claim) => {
      if (claim.primary_label === "TRUE" || claim.primary_label === "MOSTLY_TRUE") {
        counts.support += 1;
      } else if (
        claim.primary_label === "FALSE" ||
        claim.primary_label === "MISLEADING" ||
        claim.primary_label === "OMISSION"
      ) {
        counts.negative += 1;
      } else {
        counts.mixed += 1;
      }
      return counts;
    },
    { support: 0, negative: 0, mixed: 0 },
  );

  const factual_grade = factualGradeFromCounts(speakerClaims.length, factualCounts);

  const clearMarkerCount = speakerMarkers.filter(
    (marker) => marker.severity === "clear" || marker.severity === "blatant",
  ).length;
  const faith_grade = faithGradeFromReplay({
    claimCount: speakerClaims.length,
    markerCount: speakerMarkers.length,
    clearMarkerCount,
    factualCounts,
  });

  const one_liner =
    speakerClaims.length + speakerMarkers.length === 0
      ? `No claim or marker evidence is bundled for ${speaker.label} in this replay.`
      : `${speaker.label} has ${speakerClaims.length} ${plural("claim", speakerClaims.length)} and ` +
        `${speakerMarkers.length} ${plural("marker", speakerMarkers.length)} in this replay; ` +
        "treat the read as sample-derived.";

  return {
    speaker_id: speaker.id,
    label: speaker.label,
    factual_grade,
    faith_grade,
    one_liner,
  };
}

function factualGradeFromCounts(
  claimCount: number,
  counts: { support: number; negative: number; mixed: number },
): SpeakerVerdict["factual_grade"] {
  if (claimCount === 0) return "insufficient";
  if (counts.support > counts.negative && counts.support >= counts.mixed) {
    return "mostly_factual";
  }
  if (counts.negative > counts.support && counts.negative >= counts.mixed) {
    return "mostly_inaccurate";
  }
  return "mixed";
}

function faithGradeFromReplay({
  claimCount,
  markerCount,
  clearMarkerCount,
  factualCounts,
}: {
  claimCount: number;
  markerCount: number;
  clearMarkerCount: number;
  factualCounts: { support: number; negative: number; mixed: number };
}): SpeakerVerdict["faith_grade"] {
  if (claimCount + markerCount === 0) return "insufficient";
  if (clearMarkerCount >= 2 || (factualCounts.negative > factualCounts.support && markerCount > 0)) {
    return "bad_faith";
  }
  if (markerCount > 0 || factualCounts.negative > 0 || factualCounts.mixed > 0) {
    return "mixed";
  }
  if (factualCounts.support > 0) return "good_faith";
  return "insufficient";
}

function plural(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}

function applySampleClaimOverride(replay: ReplayRecord, card: ClaimCard): ClaimCard {
  if (replay.id === "solo_005" && card.id === "solo_005-claim-1") {
    return {
      ...card,
      primary_label: "TRUE",
      score: 98,
      annotations: ["World Bank WDI", "1960 population milestone"],
      explanation:
        "World Bank World Development Indicators backs the claim: world population was about 3 billion in 1960.",
      status: "confirmed",
      sources: [
        {
          url: "https://datatopics.worldbank.org/world-development-indicators/stories/a-changing-world-population.html",
          domain: "worldbank.org",
          title: "WDI: A changing world population",
          reputation_tier: "high",
          stance: "supports",
          excerpt:
            "World Bank's WDI population story identifies 1960 as the point when world population was about 3 billion.",
          preview: {
            image_url: null,
            image_alt: null,
            title: "WDI: A changing world population",
            description: "World Bank population context for the 1960 global population milestone.",
            fetched_at: 0,
            image_status: "missing",
            image_source: "none",
            image_final_url: null,
            image_content_type: null,
            image_dimensions: null,
            validated_at: null,
            unavailable_reason: "No validated source thumbnail is bundled with this local sample.",
          },
        },
      ],
    };
  }

  if (replay.verify === "none") {
    return {
      ...card,
      annotations: ["Needs source pass"],
      explanation:
        "This claim has been extracted but has not completed a source-backed verification pass yet.",
    };
  }

  return card;
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
