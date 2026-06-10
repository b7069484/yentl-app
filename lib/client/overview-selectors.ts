import type {
  ClaimCard,
  RhetoricMarker,
  SessionSource,
  Speaker,
  TranscriptSegment,
} from "@/lib/types";
import type { ActivityEvent } from "@/components/session/activity-feed";
import type { MetricSegment } from "@/components/session/metric-tile";
import type { TopicSegment } from "@/components/session/topic-strip";

// ─── Claims tile ──────────────────────────────────────────────────────────────

export type ClaimsCounts = {
  trueCount: number;
  partialCount: number;
  falseCount: number;
  otherCount: number;
};

/**
 * Bucket terminal claims by verdict.
 * Claims with status="checking" are excluded entirely.
 *
 * true    = TRUE | MOSTLY_TRUE
 * partial = PARTIAL | MISLEADING | OMISSION
 * false   = FALSE
 * other   = UNVERIFIABLE | OPINION
 */
export function countClaimsByBucket(claims: ClaimCard[]): ClaimsCounts {
  const counts: ClaimsCounts = {
    trueCount: 0,
    partialCount: 0,
    falseCount: 0,
    otherCount: 0,
  };

  for (const claim of claims) {
    if (claim.status === "checking") continue;

    const v = claim.primary_label;
    if (v === "TRUE" || v === "MOSTLY_TRUE") {
      counts.trueCount++;
    } else if (v === "PARTIAL" || v === "MISLEADING" || v === "OMISSION") {
      counts.partialCount++;
    } else if (v === "FALSE") {
      counts.falseCount++;
    } else {
      // UNVERIFIABLE | OPINION
      counts.otherCount++;
    }
  }

  return counts;
}

export function claimsSegments(c: ClaimsCounts): MetricSegment[] {
  // MetricTile auto-legend prepends seg.flex to the label, so labels are
  // bare verdict names. Zero-count buckets get no label so the legend hides them.
  return [
    {
      flex: c.trueCount,
      colorClass: "bg-green",
      label: c.trueCount > 0 ? "TRUE" : undefined,
      labelColorClass: "text-green",
    },
    {
      flex: c.partialCount,
      colorClass: "bg-orange",
      label: c.partialCount > 0 ? "PARTIAL" : undefined,
      labelColorClass: "text-orange",
    },
    {
      flex: c.falseCount,
      colorClass: "bg-red",
      label: c.falseCount > 0 ? "FALSE" : undefined,
      labelColorClass: "text-red",
    },
    {
      flex: c.otherCount,
      colorClass: "bg-slate",
      label: c.otherCount > 0 ? "UNV" : undefined,
      labelColorClass: "text-ink-3",
    },
  ];
}

// ─── Markers tile ─────────────────────────────────────────────────────────────

export type MarkerCounts = {
  fallacyCount: number;
  biasCount: number;
  rhetoricCount: number;
};

export function countMarkersByType(markers: RhetoricMarker[]): MarkerCounts {
  const counts: MarkerCounts = {
    fallacyCount: 0,
    biasCount: 0,
    rhetoricCount: 0,
  };

  for (const m of markers) {
    if (m.type === "fallacy") counts.fallacyCount++;
    else if (m.type === "bias") counts.biasCount++;
    else counts.rhetoricCount++;
  }

  return counts;
}

export function markersSegments(c: MarkerCounts): MetricSegment[] {
  return [
    {
      flex: c.fallacyCount,
      colorClass: "bg-purple",
      label: c.fallacyCount > 0 ? "FALLACY" : undefined,
      labelColorClass: "text-purple",
    },
    {
      flex: c.biasCount,
      colorClass: "bg-amber-2",
      label: c.biasCount > 0 ? "BIAS" : undefined,
      labelColorClass: "text-amber-2",
    },
    {
      flex: c.rhetoricCount,
      colorClass: "bg-pink",
      label: c.rhetoricCount > 0 ? "RHETORIC" : undefined,
      labelColorClass: "text-pink",
    },
  ];
}

// ─── Speakers tile ────────────────────────────────────────────────────────────

export type SpeakerShare = {
  id: number;
  label: string;
  charCount: number;
  pct: number;
};

export function computeSpeakerShares(
  transcript: TranscriptSegment[],
  speakers: Speaker[],
): SpeakerShare[] {
  if (speakers.length === 0) return [];

  // Sum character lengths per speaker_id
  const charsBySpeaker = new Map<number, number>();
  for (const seg of transcript) {
    if (seg.speaker_id === null) continue;
    charsBySpeaker.set(
      seg.speaker_id,
      (charsBySpeaker.get(seg.speaker_id) ?? 0) + seg.text.length,
    );
  }

  const totalChars = Array.from(charsBySpeaker.values()).reduce(
    (sum, n) => sum + n,
    0,
  );

  if (totalChars === 0) return [];

  return speakers.map((sp) => {
    const charCount = charsBySpeaker.get(sp.id) ?? 0;
    return {
      id: sp.id,
      label: sp.label,
      charCount,
      pct: Math.round((100 * charCount) / totalChars),
    };
  });
}

export function speakerSegments(shares: SpeakerShare[]): MetricSegment[] {
  return shares.map((share) => ({
    flex: share.pct,
    colorClass: `bg-spk-${(share.id % 6) + 1}`,
  }));
}

// ─── Session tile ─────────────────────────────────────────────────────────────

/**
 * Format milliseconds to "MM:SS" or "H:MM:SS" for sessions >= 1 hour.
 * Negative input → "00:00".
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// ─── Topic strip ──────────────────────────────────────────────────────────────

const TOPIC_COLORS: Array<Pick<TopicSegment, "colorClass" | "textColorClass" | "borderColorClass">> = [
  {
    colorClass: "bg-teal-soft",
    textColorClass: "text-teal-2",
    borderColorClass: "border-[rgba(43,154,138,0.25)]",
  },
  {
    colorClass: "bg-purple-soft",
    textColorClass: "text-purple",
    borderColorClass: "border-[rgba(106,80,200,0.25)]",
  },
  {
    colorClass: "bg-orange-soft",
    textColorClass: "text-orange",
    borderColorClass: "border-[rgba(199,107,31,0.25)]",
  },
];

const TOPIC_FALLBACK: Pick<TopicSegment, "colorClass" | "textColorClass" | "borderColorClass"> = {
  colorClass: "bg-cream-2",
  textColorClass: "text-ink-3",
  borderColorClass: "border-line",
};

export function topicSegments(
  claims: ClaimCard[],
): Array<TopicSegment & { count: number }> {
  const countByTopic = new Map<string, { display: string; count: number }>();

  for (const claim of claims) {
    if (!claim.topic) continue;
    const key = claim.topic.toLowerCase();
    const entry = countByTopic.get(key);
    if (entry) {
      entry.count++;
    } else {
      countByTopic.set(key, { display: claim.topic, count: 1 });
    }
  }

  const sorted = Array.from(countByTopic.values()).sort(
    (a, b) => b.count - a.count,
  );

  return sorted.map((entry, i) => {
    const colors = TOPIC_COLORS[i] ?? TOPIC_FALLBACK;
    return {
      topic: entry.display.toUpperCase(),
      count: entry.count,
      colorClass: colors.colorClass,
      textColorClass: colors.textColorClass,
      borderColorClass: colors.borderColorClass,
    };
  });
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export function recentActivityEvents(
  claims: ClaimCard[],
  markers: RhetoricMarker[],
  speakers: Speaker[],
  limit: number,
): ActivityEvent[] {
  const speakerMap = new Map<number, string>(
    speakers.map((sp) => [sp.id, sp.label]),
  );

  const events: ActivityEvent[] = [];

  // Claims: only terminal (provisional | confirmed); skip "checking"
  for (const claim of claims) {
    if (claim.status === "checking") continue;

    const speakerLabel =
      claim.speaker_id !== null
        ? (speakerMap.get(claim.speaker_id) ?? "Unknown")
        : "Unknown";

    const rawQuote = claim.claim_text;
    const quote =
      rawQuote.length > 140 ? rawQuote.slice(0, 140) + "…" : rawQuote;

    events.push({
      kind: "claim",
      id: claim.id,
      ts: claim.utterance_start,
      speakerId: claim.speaker_id,
      speakerLabel,
      verdict: claim.primary_label,
      score: Math.round(claim.score),
      quote,
    });
  }

  // Markers: all count (no lifecycle filter)
  for (const marker of markers) {
    const speakerLabel =
      marker.speaker_id !== null
        ? (speakerMap.get(marker.speaker_id) ?? "Unknown")
        : "Unknown";

    const rawQuote = marker.excerpt;
    const quote =
      rawQuote.length > 140 ? rawQuote.slice(0, 140) + "…" : rawQuote;

    events.push({
      kind: "marker",
      id: marker.id,
      ts: marker.start_time,
      speakerId: marker.speaker_id,
      speakerLabel,
      markerType: marker.type,
      display: marker.display,
      severity: marker.severity,
      quote,
    });
  }

  // Sort descending by ts, then slice
  events.sort((a, b) => b.ts - a.ts);
  return events.slice(0, limit);
}

// ─── Source health ───────────────────────────────────────────────────────────

export type SourceHealthTone = "good" | "active" | "warning" | "idle";

export type SourceHealth = {
  sourceType: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  tone: SourceHealthTone;
  transcriptCount: number;
  terminalClaimCount: number;
  checkingClaimCount: number;
  sourceBackedClaimCount: number;
  uniqueSourceCount: number;
  highReputationSourceCount: number;
};

export function sourceHealthSummary({
  source,
  transcript,
  claims,
}: {
  source: SessionSource;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
}): SourceHealth {
  const terminalClaims = claims.filter((claim) => claim.status !== "checking");
  const checkingClaimCount = claims.length - terminalClaims.length;
  const sourceBackedClaims = terminalClaims.filter((claim) => claim.sources.length > 0);
  const uniqueSourceUrls = new Set<string>();
  const highReputationSourceUrls = new Set<string>();

  for (const claim of terminalClaims) {
    for (const sourceItem of claim.sources) {
      uniqueSourceUrls.add(sourceItem.url);
      if (sourceItem.reputation_tier === "high") {
        highReputationSourceUrls.add(sourceItem.url);
      }
    }
  }

  return {
    ...sourceIdentity(source),
    ...sourceStatus({
      transcriptCount: transcript.length,
      terminalClaimCount: terminalClaims.length,
      checkingClaimCount,
      sourceBackedClaimCount: sourceBackedClaims.length,
    }),
    transcriptCount: transcript.length,
    terminalClaimCount: terminalClaims.length,
    checkingClaimCount,
    sourceBackedClaimCount: sourceBackedClaims.length,
    uniqueSourceCount: uniqueSourceUrls.size,
    highReputationSourceCount: highReputationSourceUrls.size,
  };
}

function sourceStatus({
  transcriptCount,
  terminalClaimCount,
  checkingClaimCount,
  sourceBackedClaimCount,
}: {
  transcriptCount: number;
  terminalClaimCount: number;
  checkingClaimCount: number;
  sourceBackedClaimCount: number;
}): Pick<SourceHealth, "statusLabel" | "tone"> {
  if (transcriptCount === 0) {
    return { statusLabel: "Waiting for transcript", tone: "idle" };
  }
  if (checkingClaimCount > 0) {
    return { statusLabel: "Checking sources", tone: "active" };
  }
  if (sourceBackedClaimCount > 0) {
    return { statusLabel: "Source-backed", tone: "good" };
  }
  if (terminalClaimCount > 0) {
    return { statusLabel: "Needs source pass", tone: "warning" };
  }
  return { statusLabel: "Transcript ready", tone: "active" };
}

function sourceIdentity(source: SessionSource): Pick<SourceHealth, "sourceType" | "title" | "subtitle"> {
  switch (source.kind) {
    case "youtube":
      return {
        sourceType: "YouTube",
        title: source.title?.trim() || hostFromUrl(source.url) || "YouTube video",
        subtitle: source.channel?.trim() || source.url,
      };
    case "browser_tab":
      return {
        sourceType: "Browser tab",
        title: source.title?.trim() || source.context?.page_title?.trim() || "Browser audio",
        subtitle: source.context?.site_name?.trim() || hostFromUrl(source.url) || source.url || "Extension capture",
      };
    case "audio_file":
      return {
        sourceType: "Audio file",
        title: source.filename || "Uploaded audio",
        subtitle: source.mime || "Local file",
      };
    case "text_doc":
      return {
        sourceType: source.intent === "claim_only" ? "Quick check" : source.intent === "web_url" ? "Web text" : "Document",
        title: source.filename || hostFromUrl(source.source_url) || "Imported text",
        subtitle: source.source_url || source.mime || `${source.byte_count} bytes`,
      };
    case "media_url":
      return {
        sourceType: "Media URL",
        title: hostFromUrl(source.url) || "Remote media",
        subtitle: source.url,
      };
    case "mic":
    default:
      return {
        sourceType: "Microphone",
        title: "Live microphone",
        subtitle: "Local live session",
      };
  }
}

function hostFromUrl(value?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}
