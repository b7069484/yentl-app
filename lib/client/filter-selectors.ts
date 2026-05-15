import type {
  ClaimCard,
  RhetoricMarker,
  PrimaryLabel,
  MarkerType,
  MarkerSeverity,
} from "@/lib/types";

// ─── Filter / sort type definitions ──────────────────────────────────────────

export type ClaimFilters = {
  verdict?: PrimaryLabel[];
  speaker?: number[];
  topic?: string;
};

export type MarkerFilters = {
  type?: MarkerType[];
  speaker?: number[];
  severity?: MarkerSeverity[];
};

export type ClaimSort = "recent" | "score" | "speaker" | "sources";
export type MarkerSort = "recent" | "severity" | "speaker";

const VALID_CLAIM_SORTS: readonly ClaimSort[] = ["recent", "score", "speaker", "sources"];
const VALID_MARKER_SORTS: readonly MarkerSort[] = ["recent", "severity", "speaker"];

// ─── URL param parsers ────────────────────────────────────────────────────────

const VERDICT_MAP: Record<string, PrimaryLabel> = {
  true: "TRUE",
  mostly_true: "MOSTLY_TRUE",
  partial: "PARTIAL",
  misleading: "MISLEADING",
  omission: "OMISSION",
  false: "FALSE",
  unverifiable: "UNVERIFIABLE",
  opinion: "OPINION",
};

const VALID_MARKER_TYPES = new Set<string>(["fallacy", "bias", "rhetoric"]);
const VALID_SEVERITIES = new Set<string>(["subtle", "clear", "blatant"]);

export function parseClaimFilters(params: URLSearchParams): ClaimFilters {
  const filters: ClaimFilters = {};

  const verdictRaw = params.get("verdict");
  if (verdictRaw) {
    const verdicts = verdictRaw
      .split(",")
      .map((v) => VERDICT_MAP[v.trim().toLowerCase()])
      .filter((v): v is PrimaryLabel => v !== undefined);
    if (verdicts.length > 0) filters.verdict = verdicts;
  }

  const speakerRaw = params.get("speaker");
  if (speakerRaw) {
    const speakers = speakerRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (speakers.length > 0) filters.speaker = speakers;
  }

  const topic = params.get("topic");
  if (topic) filters.topic = topic.trim();

  return filters;
}

export function parseMarkerFilters(params: URLSearchParams): MarkerFilters {
  const filters: MarkerFilters = {};

  const typeRaw = params.get("type");
  if (typeRaw) {
    const types = typeRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t): t is MarkerType => VALID_MARKER_TYPES.has(t));
    if (types.length > 0) filters.type = types;
  }

  const speakerRaw = params.get("speaker");
  if (speakerRaw) {
    const speakers = speakerRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (speakers.length > 0) filters.speaker = speakers;
  }

  const severityRaw = params.get("severity");
  if (severityRaw) {
    const severities = severityRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is MarkerSeverity => VALID_SEVERITIES.has(s));
    if (severities.length > 0) filters.severity = severities;
  }

  return filters;
}

export function parseSort<T extends string>(
  params: URLSearchParams,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = params.get("sort");
  if (raw && (allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return fallback;
}

export function parseClaimSort(params: URLSearchParams): ClaimSort {
  return parseSort(params, VALID_CLAIM_SORTS, "recent");
}

export function parseMarkerSort(params: URLSearchParams): MarkerSort {
  return parseSort(params, VALID_MARKER_SORTS, "recent");
}

// ─── Filter functions ─────────────────────────────────────────────────────────

export function applyClaimFilters(
  claims: ClaimCard[],
  f: ClaimFilters,
): ClaimCard[] {
  return claims.filter((c) => {
    // Skip claims still being checked
    if (c.status === "checking") return false;

    // verdict[]: OR within array
    if (f.verdict && f.verdict.length > 0) {
      if (!f.verdict.includes(c.primary_label)) return false;
    }

    // speaker[]: OR within array
    if (f.speaker && f.speaker.length > 0) {
      if (c.speaker_id === null || !f.speaker.includes(c.speaker_id)) return false;
    }

    // topic: case-insensitive equality
    if (f.topic) {
      if (c.topic.toLowerCase() !== f.topic.toLowerCase()) return false;
    }

    return true;
  });
}

export function applyMarkerFilters(
  markers: RhetoricMarker[],
  f: MarkerFilters,
): RhetoricMarker[] {
  return markers.filter((m) => {
    // type[]: OR within array
    if (f.type && f.type.length > 0) {
      if (!f.type.includes(m.type)) return false;
    }

    // speaker[]: OR within array
    if (f.speaker && f.speaker.length > 0) {
      if (m.speaker_id === null || !f.speaker.includes(m.speaker_id)) return false;
    }

    // severity[]: OR within array
    if (f.severity && f.severity.length > 0) {
      if (!f.severity.includes(m.severity)) return false;
    }

    return true;
  });
}

// ─── Sort functions ───────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<MarkerSeverity, number> = {
  blatant: 0,
  clear: 1,
  subtle: 2,
};

export function sortClaims(claims: ClaimCard[], sort: ClaimSort): ClaimCard[] {
  const arr = [...claims];
  switch (sort) {
    case "recent":
      return arr.sort((a, b) => b.utterance_start - a.utterance_start);
    case "score":
      return arr.sort((a, b) => a.score - b.score);
    case "speaker":
      return arr.sort((a, b) => {
        const sa = a.speaker_id ?? -1;
        const sb = b.speaker_id ?? -1;
        if (sa !== sb) return sa - sb;
        return b.utterance_start - a.utterance_start;
      });
    case "sources":
      return arr.sort((a, b) => b.sources.length - a.sources.length);
  }
}

export function sortMarkers(
  markers: RhetoricMarker[],
  sort: MarkerSort,
): RhetoricMarker[] {
  const arr = [...markers];
  switch (sort) {
    case "recent":
      return arr.sort((a, b) => b.start_time - a.start_time);
    case "severity":
      return arr.sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
      );
    case "speaker":
      return arr.sort((a, b) => {
        const sa = a.speaker_id ?? -1;
        const sb = b.speaker_id ?? -1;
        if (sa !== sb) return sa - sb;
        return b.start_time - a.start_time;
      });
  }
}

// ─── Title generators ─────────────────────────────────────────────────────────

const VERDICT_DISPLAY: Record<PrimaryLabel, string> = {
  TRUE: "TRUE",
  MOSTLY_TRUE: "MOSTLY TRUE",
  PARTIAL: "PARTIAL",
  MISLEADING: "MISLEADING",
  OMISSION: "OMISSION",
  FALSE: "FALSE",
  UNVERIFIABLE: "UNVERIFIABLE",
  OPINION: "OPINION",
};

export function describeClaimFilters(
  f: ClaimFilters,
  speakerLabels: Record<number, string>,
): string {
  const hasVerdict = f.verdict && f.verdict.length > 0;
  const hasSpeaker = f.speaker && f.speaker.length > 0;
  const hasTopic = !!f.topic;

  if (!hasVerdict && !hasSpeaker && !hasTopic) return "All claims";

  const speakerName =
    hasSpeaker && f.speaker!.length === 1
      ? (speakerLabels[f.speaker![0]] ?? `Speaker ${f.speaker![0] + 1}`)
      : null;

  const verdictLabel =
    hasVerdict && f.verdict!.length === 1
      ? VERDICT_DISPLAY[f.verdict![0]]
      : hasVerdict
      ? "Filtered"
      : null;

  const topicLabel = hasTopic
    ? f.topic!.charAt(0).toUpperCase() + f.topic!.slice(1)
    : null;

  if (verdictLabel && speakerName && topicLabel) {
    return `${verdictLabel} claims by ${speakerName} about ${topicLabel}`;
  }
  if (verdictLabel && speakerName) {
    return `${verdictLabel} claims by ${speakerName}`;
  }
  if (verdictLabel && topicLabel) {
    return `${verdictLabel} claims about ${topicLabel}`;
  }
  if (speakerName && topicLabel) {
    return `All claims by ${speakerName} about ${topicLabel}`;
  }
  if (verdictLabel) {
    return hasVerdict && f.verdict!.length === 1
      ? `All ${verdictLabel} claims`
      : `Claims · ${f.verdict!.map((v) => VERDICT_DISPLAY[v]).join(", ")}`;
  }
  if (speakerName) return `All claims by ${speakerName}`;
  if (hasSpeaker) return `Filtered claims`;
  if (topicLabel) return `All claims about ${topicLabel}`;

  return "Filtered claims";
}

export function describeMarkerFilters(
  f: MarkerFilters,
  speakerLabels: Record<number, string>,
): string {
  const hasType = f.type && f.type.length > 0;
  const hasSpeaker = f.speaker && f.speaker.length > 0;
  const hasSeverity = f.severity && f.severity.length > 0;

  if (!hasType && !hasSpeaker && !hasSeverity) return "All markers";

  const speakerName =
    hasSpeaker && f.speaker!.length === 1
      ? (speakerLabels[f.speaker![0]] ?? `Speaker ${f.speaker![0] + 1}`)
      : null;

  const typeLabel =
    hasType && f.type!.length === 1
      ? f.type![0].charAt(0).toUpperCase() + f.type![0].slice(1)
      : null;

  const severityLabel =
    hasSeverity && f.severity!.length === 1
      ? f.severity![0].charAt(0).toUpperCase() + f.severity![0].slice(1)
      : null;

  if (typeLabel && speakerName) return `${typeLabel} markers by ${speakerName}`;
  if (typeLabel && severityLabel) return `${severityLabel} ${typeLabel} markers`;
  if (typeLabel) return `All ${typeLabel} markers`;
  if (speakerName) return `All markers by ${speakerName}`;
  if (severityLabel) return `All ${severityLabel} markers`;

  return "Filtered markers";
}
