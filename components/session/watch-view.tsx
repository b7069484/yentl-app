"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  ListChecks,
  Radio,
  Target,
  Video,
} from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { onFinalUtterance, runSynthesisNow } from "@/lib/client/orchestrator";
import type { MediaAdapter } from "@/lib/client/media-adapter";
import { createYouTubeAdapter } from "@/lib/client/youtube-adapter";
import { createAudioAdapter } from "@/lib/client/audio-adapter";
import { VerdictChip } from "@/components/session/chips";
import { MarkerChip } from "@/components/session/chips";
import {
  buildLiveSignalSummary,
  WatchSignalBoard,
  type SignalDatum,
} from "@/components/session/live-signal";
import { ReassignSpeakerMenu } from "@/components/session/reassign-speaker-menu";
import { paletteFor } from "@/lib/client/speaker-palette";
import { cn } from "@/lib/utils";
import type { ClaimCard, RhetoricMarker, SessionSource, TranscriptSegment } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ── Annotation row (claim or marker rendered under a transcript line) ─────────

type AnnotationItem =
  | { kind: "claim"; item: ClaimCard }
  | { kind: "marker"; item: RhetoricMarker };

function sourceDisplay(source: SessionSource): { label: string; title: string; meta: string } {
  switch (source.kind) {
    case "youtube":
      return {
        label: "YouTube",
        title: source.title || "YouTube video",
        meta: [source.channel, source.video_id].filter(Boolean).join(" · ") || source.url,
      };
    case "audio_file":
      return {
        label: "Audio file",
        title: source.filename || "Uploaded audio",
        meta: source.mime || "Local media",
      };
    case "media_url":
      return {
        label: "Media URL",
        title: "Direct media source",
        meta: source.url,
      };
    case "browser_tab":
      return {
        label: "Browser tab",
        title: source.title || "Live tab audio",
        meta: source.url || "Extension capture",
      };
    case "mic":
      return {
        label: "Microphone",
        title: "Live room audio",
        meta: "Microphone session",
      };
    case "text_doc":
      return {
        label: "Text document",
        title: source.filename || "Transcript",
        meta: source.mime || "Pasted text",
      };
  }
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-line bg-cream px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
        {icon}
        {label}
      </div>
      <div className="font-mono text-[18px] font-semibold leading-none text-ink">
        {value}
      </div>
    </div>
  );
}

const EMPTY_PENDING_YOUTUBE_CAPTIONS: TranscriptSegment[] = [];
const noopAppendFinal = () => {};
const noopClearPendingYouTubeCaptions = () => {};

function WatchSourceHeader({
  source,
  ready,
  transcriptCount,
  claimsCount,
  markersCount,
}: {
  source: SessionSource;
  ready: boolean;
  transcriptCount: number;
  claimsCount: number;
  markersCount: number;
}) {
  const display = sourceDisplay(source);

  return (
    <section className="mb-4 rounded-lg border border-line bg-paper p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-soft px-2.5 py-1 text-[11px] font-semibold text-teal">
            <Video className="h-3.5 w-3.5" aria-hidden />
            {display.label}
          </div>
          <h1 className="truncate font-serif text-[26px] font-medium leading-tight text-ink sm:text-[30px]">
            {display.title}
          </h1>
          <p className="mt-1 truncate text-[13px] text-ink-3">{display.meta}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          <MetricPill
            icon={<Radio className="h-3.5 w-3.5" aria-hidden />}
            label="Player"
            value={ready ? "Ready" : "Loading"}
          />
          <MetricPill
            icon={<ListChecks className="h-3.5 w-3.5" aria-hidden />}
            label="Transcript"
            value={transcriptCount}
          />
          <MetricPill
            icon={<Target className="h-3.5 w-3.5" aria-hidden />}
            label="Claims"
            value={claimsCount}
          />
          <MetricPill
            icon={<FileSearch className="h-3.5 w-3.5" aria-hidden />}
            label="Markers"
            value={markersCount}
          />
        </div>
      </div>
    </section>
  );
}

function EvidenceQueue({
  claims,
  markers,
  onSeek,
}: {
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  onSeek: (seconds: number) => void;
}) {
  const visibleClaims = claims.slice(0, 3);
  const visibleMarkers = markers.slice(0, 2);
  const isEmpty = visibleClaims.length === 0 && visibleMarkers.length === 0;

  return (
    <section
      className="rounded-lg border border-line bg-paper p-4 shadow-sm"
      data-testid="watch-evidence-queue"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Evidence queue
          </h2>
          <p className="mt-1 text-[12px] text-ink-4">
            Jump from a finding to the exact moment in the source.
          </p>
        </div>
        <span className="rounded-full border border-line bg-cream px-2 py-0.5 text-[11px] text-ink-3">
          {claims.length + markers.length} total
        </span>
      </div>

      {isEmpty ? (
        <div className="rounded-md border border-line bg-cream px-3 py-4 text-[12.5px] text-ink-3">
          Claims and markers will appear here as Yentl extracts them from the transcript.
        </div>
      ) : (
        <div className="grid gap-2">
          {visibleClaims.map((claim) => (
            <button
              key={claim.id}
              type="button"
              onClick={() => onSeek(claim.utterance_start)}
              className="group rounded-md border border-line bg-cream px-3 py-2.5 text-left transition-colors hover:border-teal/40 hover:bg-teal-soft/70"
              data-testid={`queue-claim-${claim.id}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <VerdictChip
                  verdict={claim.status === "checking" ? "CHECKING" : claim.primary_label}
                  score={claim.status === "checking" ? undefined : claim.score}
                />
                <span className="font-mono text-[10px] text-ink-4">
                  {formatTime(claim.utterance_start)}
                </span>
              </div>
              <div className="line-clamp-2 text-[12.5px] leading-snug text-ink-2">
                {claim.claim_text}
              </div>
            </button>
          ))}

          {visibleMarkers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={() => onSeek(marker.start_time)}
              className="group rounded-md border border-line bg-cream px-3 py-2.5 text-left transition-colors hover:border-teal/40 hover:bg-teal-soft/70"
              data-testid={`queue-marker-${marker.id}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <MarkerChip
                  type={marker.type}
                  display={marker.display}
                  severity={marker.severity}
                />
                <span className="font-mono text-[10px] text-ink-4">
                  {formatTime(marker.start_time)}
                </span>
              </div>
              <div className="line-clamp-2 text-[12.5px] leading-snug text-ink-2">
                {marker.excerpt}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function AnnotationRow({
  annotation,
  onSeek,
}: {
  annotation: AnnotationItem;
  onSeek: (seconds: number) => void;
}) {
  const ts =
    annotation.kind === "claim"
      ? annotation.item.utterance_start
      : annotation.item.start_time;
  const text =
    annotation.kind === "claim"
      ? annotation.item.claim_text
      : annotation.item.excerpt;

  const detailHref =
    annotation.kind === "claim"
      ? `/session/detail/claim/${annotation.item.id}`
      : `/session/detail/marker/${annotation.item.id}`;

  return (
    <div
      className="flex items-center gap-2 pl-4 w-full group"
      data-testid={`annotation-${annotation.kind}-${annotation.item.id}`}
    >
      <span className="w-px self-stretch bg-line-strong flex-shrink-0" aria-hidden />

      {/* Chip: seek on click */}
      <button
        type="button"
        onClick={() => onSeek(ts)}
        className="flex-shrink-0 cursor-pointer"
        data-testid="annotation-chip-btn"
      >
        {annotation.kind === "claim" ? (
          <VerdictChip
            verdict={annotation.item.status === "checking" ? "CHECKING" : annotation.item.primary_label}
            score={annotation.item.status === "checking" ? undefined : annotation.item.score}
          />
        ) : (
          <MarkerChip
            type={annotation.item.type}
            display={annotation.item.display}
            severity={annotation.item.severity}
          />
        )}
      </button>

      {/* Quote text + chevron: navigate to L3 detail */}
      <Link
        href={detailHref}
        className="flex items-center gap-0.5 flex-1 min-w-0 group/link"
        data-testid="annotation-detail-link"
      >
        <span className="font-serif italic text-[11px] text-ink-3 truncate flex-1 min-w-0 group-hover/link:underline group-hover/link:text-ink-2 transition-colors">
          &ldquo;{text}&rdquo;
        </span>
        <ChevronRight
          className="h-3 w-3 text-ink-4 group-hover/link:text-ink-2 transition-colors opacity-40 group-hover/link:opacity-100 flex-shrink-0"
          data-testid="annotation-chevron"
          aria-hidden
        />
      </Link>
    </div>
  );
}

// ── TranscriptLine ────────────────────────────────────────────────────────────

type LineState = "past" | "current" | "future";

function TranscriptLine({
  segment,
  transcriptIndex,
  state,
  annotations,
  onSeek,
  lineRef,
  showSpeakers,
}: {
  segment: TranscriptSegment;
  transcriptIndex: number;
  state: LineState;
  annotations: AnnotationItem[];
  onSeek: (seconds: number) => void;
  lineRef?: (el: HTMLButtonElement | null) => void;
  showSpeakers: boolean;
}) {
  const isCurrent = state === "current";
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        ref={lineRef}
        onClick={() => onSeek(segment.start)}
        className={[
          "w-full text-left flex items-start gap-2.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
          isCurrent
            ? "ring-2 ring-teal/50 bg-teal-soft"
            : "hover:bg-paper-2",
        ].join(" ")}
        data-testid={`transcript-seg-${segment.start}`}
        data-is-current={isCurrent ? "true" : undefined}
        data-line-state={state}
      >
        {/* Timecode */}
        <span className={[
          "text-[10px] tabular-nums mt-0.5 flex-shrink-0 w-8",
          state === "future" ? "text-ink-5" : "text-ink-4",
        ].join(" ")}>
          {formatTime(segment.start)}
        </span>

        {/* Current marker */}
        {isCurrent ? (
          <span className="text-[10px] text-teal mt-0.5 flex-shrink-0" aria-hidden>
            ▶
          </span>
        ) : (
          <span className="w-[10px] flex-shrink-0" aria-hidden />
        )}

        {/* Text */}
        <span
          className={[
            "text-[13px] leading-snug flex-1 min-w-0",
            state === "current" && "text-ink font-medium",
            state === "past" && "text-ink-2",
            state === "future" && "text-ink-4",
          ].filter(Boolean).join(" ")}
        >
          {segment.text}
        </span>
      </button>

      {/* Speaker reassign badge — only visible when diarization is active and
          the segment is past or current so future lines don't get spoilers. */}
      {showSpeakers && state !== "future" && segment.speaker_id !== null && (
        <div className="ml-10 mb-0.5" onClick={(e) => e.stopPropagation()}>
          <ReassignSpeakerMenu
            transcriptIndex={transcriptIndex}
            speakerId={segment.speaker_id}
          />
        </div>
      )}

      {/* Inline annotations for this line (only when the line is past or current —
          future annotations would be a spoiler) */}
      {state !== "future" && annotations.length > 0 && (
        <div className="flex flex-col gap-1 ml-3 mb-1">
          {annotations.map((ann) => (
            <AnnotationRow
              key={`${ann.kind}-${ann.item.id}`}
              annotation={ann}
              onSeek={onSeek}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── WatchView ─────────────────────────────────────────────────────────────────

export function WatchView() {
  const source = useSession((s) => s.source);
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const synthesis = useSession((s) => s.synthesis);
  const transcript = useSession((s) => s.transcript);
  const speakers = useSession((s) => s.speakers);
  const pendingYouTubeCaptions = useSession(
    (s) => s.pendingYouTubeCaptions ?? EMPTY_PENDING_YOUTUBE_CAPTIONS,
  );
  const appendFinal = useSession((s) => s.appendFinal ?? noopAppendFinal);
  const clearPendingYouTubeCaptions = useSession(
    (s) => s.clearPendingYouTubeCaptions ?? noopClearPendingYouTubeCaptions,
  );

  // Show speaker badges + reassign affordance once there are ≥2 distinct speakers
  const showSpeakers = speakers.length >= 2;

  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MediaAdapter | null>(null);
  const transcriptPanelRef = useRef<HTMLDivElement>(null);
  const [playerState, setPlayerState] = useState({
    sourceKey: "",
    currentTime: 0,
    ready: false,
    playbackStarted: false,
  });

  // Track current segment ref for auto-scroll
  const currentSegRef = useRef<HTMLButtonElement | null>(null);
  const nextYouTubeCaptionIndexRef = useRef(0);
  const releasedYouTubeCaptionKeysRef = useRef<Set<string>>(new Set());
  const synthesisTimerRef = useRef<number | null>(null);

  // Derive the "source key" to re-mount the adapter only when the actual
  // media changes (not on every render).
  const sourceKey = useMemo(() => {
    if (source.kind === "youtube") return `youtube:${source.video_id}`;
    if (source.kind === "audio_file") return `audio_file:${source.blob_url}`;
    if (source.kind === "media_url") return `media_url:${source.url}`;
    return source.kind;
  }, [source]);
  const currentTime = playerState.sourceKey === sourceKey ? playerState.currentTime : 0;
  const ready = playerState.sourceKey === sourceKey && playerState.ready;
  const playbackStarted =
    playerState.sourceKey === sourceKey && playerState.playbackStarted;

  // Set up the adapter on mount / when source changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let localAdapter: MediaAdapter | null = null;

    async function setupAdapter() {
      try {
        if (source.kind === "youtube") {
          localAdapter = await createYouTubeAdapter({
            container: el!,
            videoId: source.video_id,
            onTimeUpdate: (t) => {
              if (!cancelled) {
                setPlayerState((state) => ({
                  sourceKey,
                  currentTime: t,
                  ready: state.sourceKey === sourceKey ? state.ready : false,
                  playbackStarted:
                    state.sourceKey === sourceKey
                      ? state.playbackStarted || t > 0.2
                      : t > 0.2,
                }));
              }
            },
            onReady: () => {
              if (!cancelled) {
                setPlayerState((state) => ({
                  sourceKey,
                  currentTime: state.sourceKey === sourceKey ? state.currentTime : 0,
                  ready: true,
                  playbackStarted:
                    state.sourceKey === sourceKey ? state.playbackStarted : false,
                }));
              }
            },
          });
        } else if (source.kind === "audio_file") {
          localAdapter = await createAudioAdapter({
            container: el!,
            src: source.blob_url,
            onTimeUpdate: (t) => {
              if (!cancelled) {
                setPlayerState((state) => ({
                  sourceKey,
                  currentTime: t,
                  ready: state.sourceKey === sourceKey ? state.ready : false,
                  playbackStarted:
                    state.sourceKey === sourceKey
                      ? state.playbackStarted || t > 0.2
                      : t > 0.2,
                }));
              }
            },
            onReady: () => {
              if (!cancelled) {
                setPlayerState((state) => ({
                  sourceKey,
                  currentTime: state.sourceKey === sourceKey ? state.currentTime : 0,
                  ready: true,
                  playbackStarted:
                    state.sourceKey === sourceKey ? state.playbackStarted : false,
                }));
              }
            },
          });
        } else if (source.kind === "media_url") {
          localAdapter = await createAudioAdapter({
            container: el!,
            src: source.url,
            onTimeUpdate: (t) => {
              if (!cancelled) {
                setPlayerState((state) => ({
                  sourceKey,
                  currentTime: t,
                  ready: state.sourceKey === sourceKey ? state.ready : false,
                  playbackStarted:
                    state.sourceKey === sourceKey
                      ? state.playbackStarted || t > 0.2
                      : t > 0.2,
                }));
              }
            },
            onReady: () => {
              if (!cancelled) {
                setPlayerState((state) => ({
                  sourceKey,
                  currentTime: state.sourceKey === sourceKey ? state.currentTime : 0,
                  ready: true,
                  playbackStarted:
                    state.sourceKey === sourceKey ? state.playbackStarted : false,
                }));
              }
            },
          });
        }

        if (cancelled) {
          localAdapter?.destroy();
        } else {
          adapterRef.current = localAdapter;
        }
      } catch (e) {
        console.error("WatchView adapter setup failed", e);
      }
    }

    void setupAdapter();

    return () => {
      cancelled = true;
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
    // sourceKey captures the identity of the media; re-run only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  useEffect(() => {
    nextYouTubeCaptionIndexRef.current = 0;
    releasedYouTubeCaptionKeysRef.current = new Set();
    if (synthesisTimerRef.current !== null) {
      window.clearTimeout(synthesisTimerRef.current);
      synthesisTimerRef.current = null;
    }
  }, [sourceKey]);

  useEffect(() => {
    if (source.kind !== "youtube") return;
    if (!playbackStarted) return;
    if (pendingYouTubeCaptions.length === 0) return;

    const RELEASE_LOOKAHEAD_SEC = 0.35;
    const MAX_RELEASES_PER_TICK = 4;
    let releasedThisTick = 0;

    while (
      nextYouTubeCaptionIndexRef.current < pendingYouTubeCaptions.length &&
      releasedThisTick < MAX_RELEASES_PER_TICK
    ) {
      const segment = pendingYouTubeCaptions[nextYouTubeCaptionIndexRef.current];
      if (segment.start > currentTime + RELEASE_LOOKAHEAD_SEC) break;

      const key = `${segment.start}:${segment.end}:${segment.text}`;
      if (!releasedYouTubeCaptionKeysRef.current.has(key)) {
        releasedYouTubeCaptionKeysRef.current.add(key);
        appendFinal(segment);
        releasedThisTick += 1;
        void onFinalUtterance(segment).catch((error) => {
          console.warn("WatchView YouTube live analysis failed", error);
        });
      }

      nextYouTubeCaptionIndexRef.current += 1;
    }

    if (releasedThisTick > 0 && synthesisTimerRef.current === null) {
      synthesisTimerRef.current = window.setTimeout(() => {
        synthesisTimerRef.current = null;
        void runSynthesisNow();
      }, 4000);
    }

    if (nextYouTubeCaptionIndexRef.current >= pendingYouTubeCaptions.length) {
      clearPendingYouTubeCaptions();
    }
  }, [
    appendFinal,
    clearPendingYouTubeCaptions,
    currentTime,
    pendingYouTubeCaptions,
    playbackStarted,
    source.kind,
  ]);

  useEffect(() => () => {
    if (synthesisTimerRef.current !== null) {
      window.clearTimeout(synthesisTimerRef.current);
    }
  }, []);

  // Auto-scroll to current segment when it changes
  useEffect(() => {
    if (currentSegRef.current) {
      currentSegRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [currentTime]);

  // Current segment: the LAST one whose start <= currentTime.
  // When currentTime is 0 (no playback yet), this is null — no line highlighted.
  const currentSegStart = useMemo((): number | null => {
    let cur: TranscriptSegment | null = null;
    for (const seg of transcript) {
      if (seg.start <= currentTime) {
        cur = seg;
      }
    }
    return cur ? cur.start : null;
  }, [transcript, currentTime]);

  // Derive the active speaker from the current segment (for the player ring).
  const currentSpeakerId = useMemo((): number | null => {
    if (currentSegStart === null) return null;
    const seg = transcript.find((s) => s.start === currentSegStart);
    return seg?.speaker_id ?? null;
  }, [transcript, currentSegStart]);

  // Classify each transcript line as past / current / future based on
  // currentTime + the chosen current segment.
  const lineState = useCallback((seg: TranscriptSegment): LineState => {
    if (currentSegStart !== null && seg.start === currentSegStart) return "current";
    if (seg.start < currentTime) return "past";
    return "future";
  }, [currentSegStart, currentTime]);

  // Build annotation map: segment.start → list of AnnotationItems.
  // Annotations are anchored to the segment whose time range covers their
  // utterance_start (claim) or start_time (marker). They render only when the
  // anchor line is past or current — future-line annotations would be spoilers.
  const annotationMap = useMemo((): Map<number, AnnotationItem[]> => {
    const map = new Map<number, AnnotationItem[]>();

    if (transcript.length === 0) return map;

    const ANNOTATION_OVERLAP = 1.0;

    function findSegmentStart(time: number): number | null {
      for (const seg of transcript) {
        if (seg.start <= time && time <= seg.end + ANNOTATION_OVERLAP) {
          return seg.start;
        }
      }
      return null;
    }

    for (const claim of claims) {
      const segStart = findSegmentStart(claim.utterance_start);
      if (segStart !== null) {
        const arr = map.get(segStart) ?? [];
        arr.push({ kind: "claim", item: claim });
        map.set(segStart, arr);
      }
    }

    for (const marker of markers) {
      const segStart = findSegmentStart(marker.start_time);
      if (segStart !== null) {
        const arr = map.get(segStart) ?? [];
        arr.push({ kind: "marker", item: marker });
        map.set(segStart, arr);
      }
    }

    return map;
  }, [transcript, claims, markers]);

  const totalCount = claims.length + markers.length;
  const liveState = useMemo<SignalDatum>(() => {
    if (!ready) {
      return {
        label: "Live state",
        value: "Loading",
        detail: "Player is connecting to the source.",
        tone: "amber",
      };
    }

    if (transcript.length === 0) {
      if (source.kind === "youtube" && pendingYouTubeCaptions.length > 0) {
        return {
          label: "Live state",
          value: playbackStarted ? "Listening" : "Armed",
          detail: playbackStarted
            ? "Yentl is releasing captions against the playhead."
            : "Press play to begin synced transcript and analysis.",
          tone: "amber",
        };
      }

      return {
        label: "Live state",
        value: "Ready",
        detail: "Player is ready. Waiting for transcript lines.",
        tone: "amber",
      };
    }

    return {
      label: "Live state",
      value: currentTime > 0 ? "Synced" : "Ready",
      detail: `${transcript.length} transcript line${transcript.length === 1 ? "" : "s"} linked to playback.`,
      tone: "green",
    };
  }, [currentTime, pendingYouTubeCaptions.length, playbackStarted, ready, source.kind, transcript.length]);
  const signalSummary = useMemo(
    () => buildLiveSignalSummary({
      claims,
      markers,
      liveState,
    }),
    [claims, markers, liveState],
  );

  const handleSeek = useCallback((seconds: number) => {
    adapterRef.current?.seekTo(seconds);
  }, []);

  // Capture ref to the current segment's button for auto-scroll
  const setCurrentSegRef = useCallback(
    (start: number) => (el: HTMLButtonElement | null) => {
      if (start === currentSegStart) {
        currentSegRef.current = el;
      }
    },
    [currentSegStart],
  );

  // ── Player + transcript layout ───────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-4 sm:px-6 md:px-8">
      <WatchSourceHeader
        source={source}
        ready={ready}
        transcriptCount={transcript.length}
        claimsCount={claims.length}
        markersCount={markers.length}
      />

      <div className="mb-5">
        <WatchSignalBoard summary={signalSummary} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.62fr)_minmax(360px,0.38fr)]">

        {/* Player column */}
        <div className="space-y-4">
          <div
            className={cn(
              "overflow-hidden rounded-lg border-[3px] bg-paper shadow-sm transition-colors duration-300",
              currentSpeakerId !== null
                ? paletteFor(currentSpeakerId).border
                : "border-transparent",
            )}
            data-testid="player-wrapper"
          >
            <div className="overflow-hidden rounded-sm bg-ink">
              {source.kind === "youtube" ? (
                <div className="aspect-video w-full" ref={containerRef} data-testid="player-container" />
              ) : (
                <div
                  className="flex min-h-[120px] items-center justify-center p-4"
                  ref={containerRef}
                  data-testid="player-container"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-3 py-2 text-[11px] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" aria-hidden />
                <span className="font-mono tabular-nums text-ink">
                  {formatTime(currentTime)}
                </span>
                {ready ? "synced" : "loading player"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green" aria-hidden />
                Transcript-linked review
              </span>
            </div>
          </div>

          <EvidenceQueue claims={claims} markers={markers} onSeek={handleSeek} />
        </div>

        {/* Transcript + synthesis column */}
        <div className="flex min-h-0 flex-col gap-4">

          {/* Synthesis card */}
          {synthesis && "text" in synthesis && (
            <div
              className="rounded-lg border border-line bg-paper p-4 shadow-sm"
              data-testid="synthesis-card"
            >
              <div className="text-[10.5px] tracking-[.12em] uppercase text-ink-4 font-bold mb-2">
                Yentl&rsquo;s read
              </div>
              <p className="text-[13.5px] text-ink-2 leading-relaxed">
                {synthesis.text}
              </p>
            </div>
          )}

          {/* Status bar */}
          <div className="flex items-baseline justify-between gap-3 text-[11px] text-ink-3">
            <span className="font-mono tabular-nums">
              <span className="text-ink font-semibold">{formatTime(currentTime)}</span>
              {" · "}
              {ready ? "playing" : "loading"}
            </span>
            <span data-testid="status-counter">
              {totalCount > 0
                ? `${claims.length} claim${claims.length !== 1 ? "s" : ""} · ${markers.length} marker${markers.length !== 1 ? "s" : ""}`
                : "Analysing…"}
            </span>
          </div>

          {/* Transcript panel */}
          <div
            ref={transcriptPanelRef}
            className="flex max-h-[64vh] min-h-[360px] flex-col gap-0.5 overflow-y-auto rounded-lg border border-line bg-paper p-2 shadow-sm"
            data-testid="transcript-panel"
          >
            {/* Header */}
            <div className="text-[9.5px] tracking-[.12em] uppercase text-ink-4 font-bold px-3 py-1.5 border-b border-line mb-1">
              Transcript
            </div>

            {/* Empty state */}
            {transcript.length === 0 && (
              <div
                className="text-[12px] italic text-ink-4 py-4 text-center"
                data-testid="transcript-loading"
              >
                {source.kind === "youtube" && pendingYouTubeCaptions.length > 0
                  ? "Press play to start live synced transcript..."
                  : "Loading transcript..."}
              </div>
            )}

            {/* Transcript lines — all visible; past/current/future styled differently */}
            {transcript.map((seg, segIdx) => {
              const state = lineState(seg);
              const annotations = annotationMap.get(seg.start) ?? [];
              return (
                <TranscriptLine
                  key={seg.start}
                  segment={seg}
                  transcriptIndex={segIdx}
                  state={state}
                  annotations={annotations}
                  onSeek={handleSeek}
                  lineRef={state === "current" ? setCurrentSegRef(seg.start) : undefined}
                  showSpeakers={showSpeakers}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
