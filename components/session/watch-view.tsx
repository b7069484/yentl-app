"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useSession } from "@/lib/client/session-store";
import type { MediaAdapter } from "@/lib/client/media-adapter";
import { createYouTubeAdapter } from "@/lib/client/youtube-adapter";
import { createAudioAdapter } from "@/lib/client/audio-adapter";
import { VerdictChip } from "@/components/session/chips";
import { MarkerChip } from "@/components/session/chips";
import { ReassignSpeakerMenu } from "@/components/session/reassign-speaker-menu";
import type { ClaimCard, RhetoricMarker, TranscriptSegment } from "@/lib/types";

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

  return (
    <button
      type="button"
      onClick={() => onSeek(ts)}
      className="flex items-center gap-2 pl-4 text-left w-full group cursor-pointer"
      data-testid={`annotation-${annotation.kind}-${annotation.item.id}`}
    >
      <span className="w-px self-stretch bg-line-strong flex-shrink-0" aria-hidden />
      {annotation.kind === "claim" ? (
        <VerdictChip
          verdict={annotation.item.primary_label}
          score={annotation.item.score}
        />
      ) : (
        <MarkerChip
          type={annotation.item.type}
          display={annotation.item.display}
          severity={annotation.item.severity}
        />
      )}
      <span className="font-serif italic text-[11px] text-ink-3 truncate flex-1 min-w-0 group-hover:text-ink-2 transition-colors">
        &ldquo;{text}&rdquo;
      </span>
    </button>
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

  // Show speaker badges + reassign affordance once there are ≥2 distinct speakers
  const showSpeakers = speakers.length >= 2;

  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MediaAdapter | null>(null);
  const transcriptPanelRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [ready, setReady] = useState(false);

  // Track current segment ref for auto-scroll
  const currentSegRef = useRef<HTMLButtonElement | null>(null);

  // Derive the "source key" to re-mount the adapter only when the actual
  // media changes (not on every render).
  const sourceKey = useMemo(() => {
    if (source.kind === "youtube") return `youtube:${source.video_id}`;
    if (source.kind === "audio_file") return `audio_file:${source.blob_url}`;
    if (source.kind === "media_url") return `media_url:${source.url}`;
    return source.kind;
  }, [source]);

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
              if (!cancelled) setCurrentTime(t);
            },
            onReady: () => {
              if (!cancelled) setReady(true);
            },
          });
        } else if (source.kind === "audio_file") {
          localAdapter = await createAudioAdapter({
            container: el!,
            src: source.blob_url,
            onTimeUpdate: (t) => {
              if (!cancelled) setCurrentTime(t);
            },
            onReady: () => {
              if (!cancelled) setReady(true);
            },
          });
        } else if (source.kind === "media_url") {
          localAdapter = await createAudioAdapter({
            container: el!,
            src: source.url,
            onTimeUpdate: (t) => {
              if (!cancelled) setCurrentTime(t);
            },
            onReady: () => {
              if (!cancelled) setReady(true);
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
    <div className="px-6 md:px-8 pt-4 pb-12 max-w-[1280px] mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Player column */}
        <div className="bg-ink rounded-lg overflow-hidden">
          {source.kind === "youtube" ? (
            <div className="aspect-video w-full" ref={containerRef} data-testid="player-container" />
          ) : (
            <div
              className="p-4 flex items-center justify-center min-h-[120px]"
              ref={containerRef}
              data-testid="player-container"
            />
          )}
        </div>

        {/* Transcript + synthesis column */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* Synthesis card */}
          {synthesis && "text" in synthesis && (
            <div
              className="bg-paper border border-line rounded-lg p-4"
              data-testid="synthesis-card"
            >
              <div className="text-[10.5px] tracking-[.12em] uppercase text-ink-4 font-bold mb-2">
                Yenta&rsquo;s read
              </div>
              <p className="text-[13.5px] text-ink-2 leading-relaxed">
                {synthesis.text}
              </p>
            </div>
          )}

          {/* Status bar */}
          <div className="flex justify-between items-baseline text-[11px] text-ink-3">
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
            className="flex flex-col gap-0.5 overflow-y-auto max-h-[60vh] rounded-lg bg-paper border border-line p-2"
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
                Loading transcript…
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
