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
import type { ClaimCard, RhetoricMarker, Speaker } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function speakerLabel(speakerId: number | null, speakers: Speaker[]): string {
  if (speakerId === null) return "?";
  const found = speakers.find((sp) => sp.id === speakerId);
  return found?.label ?? `Speaker ${speakerId + 1}`;
}

// ── Event union ───────────────────────────────────────────────────────────────

type RevealedClaimEvent = {
  kind: "claim";
  item: ClaimCard;
  ts: number;
};

type RevealedMarkerEvent = {
  kind: "marker";
  item: RhetoricMarker;
  ts: number;
};

type RevealedEvent = RevealedClaimEvent | RevealedMarkerEvent;

// ── RevealedRow ───────────────────────────────────────────────────────────────

function RevealedRow({
  event,
  isLatest,
  onSeek,
  speakers,
}: {
  event: RevealedEvent;
  isLatest: boolean;
  onSeek: (seconds: number) => void;
  speakers: Speaker[];
}) {
  const label =
    event.kind === "claim"
      ? speakerLabel(event.item.speaker_id, speakers)
      : speakerLabel(event.item.speaker_id, speakers);

  const quote =
    event.kind === "claim" ? event.item.claim_text : event.item.excerpt;

  const avatarIndex =
    ((event.kind === "claim" ? (event.item.speaker_id ?? 0) : (event.item.speaker_id ?? 0)) % 6) + 1;

  return (
    <button
      type="button"
      onClick={() => onSeek(event.ts)}
      className={[
        "w-full text-left flex items-center gap-3 px-3.5 py-2.5 bg-paper border rounded-[10px] cursor-pointer hover:border-line-strong transition-all",
        isLatest
          ? "border-amber/60 ring-1 ring-amber/20 animate-fade-in"
          : "border-line",
      ].join(" ")}
      data-testid={`revealed-row-${event.item.id}`}
    >
      {/* Timestamp */}
      <span className="text-[10px] text-ink-4 tabular-nums flex-shrink-0 w-9">
        {formatTime(event.ts)}
      </span>

      {/* Speaker avatar */}
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0 bg-spk-${avatarIndex}`}
        aria-hidden
      >
        {label[0]}
      </span>

      {/* Chip */}
      {event.kind === "claim" ? (
        <VerdictChip
          verdict={event.item.primary_label}
          score={event.item.score}
        />
      ) : (
        <MarkerChip
          type={event.item.type}
          display={event.item.display}
          severity={event.item.severity}
        />
      )}

      {/* Quote */}
      <span className="font-serif italic text-[13px] text-ink-3 flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        &ldquo;{quote}&rdquo;
      </span>
    </button>
  );
}

// ── WatchView ─────────────────────────────────────────────────────────────────

export function WatchView() {
  const source = useSession((s) => s.source);
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const synthesis = useSession((s) => s.synthesis);
  const speakers = useSession((s) => s.speakers);

  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MediaAdapter | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [ready, setReady] = useState(false);

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

  // Merge claims + markers into a chronological list of events.
  const revealed = useMemo((): RevealedEvent[] => {
    const events: RevealedEvent[] = [
      ...claims.map(
        (c): RevealedClaimEvent => ({ kind: "claim", item: c, ts: c.utterance_start }),
      ),
      ...markers.map(
        (m): RevealedMarkerEvent => ({ kind: "marker", item: m, ts: m.start_time }),
      ),
    ];
    return events
      .filter((e) => e.ts <= currentTime + 0.5)
      .sort((a, b) => a.ts - b.ts);
  }, [claims, markers, currentTime]);

  const totalCount = claims.length + markers.length;

  const handleSeek = useCallback((seconds: number) => {
    adapterRef.current?.seekTo(seconds);
  }, []);

  // ── No-media fallback ────────────────────────────────────────────────────────

  if (source.kind === "mic" || source.kind === "text_doc") {
    return (
      <div
        className="px-6 pt-12 pb-12 max-w-[680px] mx-auto text-center text-ink-3"
        data-testid="no-media-message"
      >
        <div className="font-serif text-[20px] text-ink-2 mb-2">
          No media to watch
        </div>
        <div className="text-[13px]">
          This session was ingested from{" "}
          {source.kind === "mic" ? "live microphone" : "text"} — there&rsquo;s
          no playable media. See the Overview or Transcript tabs.
        </div>
      </div>
    );
  }

  // ── Player + analysis layout ──────────────────────────────────────────────────

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

        {/* Analysis column */}
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
            <span data-testid="revealed-counter">
              {revealed.length} of {totalCount} revealed
            </span>
          </div>

          {/* Revealed events list */}
          <div
            className="flex flex-col gap-2 overflow-y-auto max-h-[60vh]"
            data-testid="revealed-list"
          >
            {revealed.length === 0 && totalCount > 0 && (
              <div
                className="text-[12px] italic text-ink-4 py-3 text-center"
                data-testid="press-play-hint"
              >
                Press play. Claims and markers will appear as the playhead reaches them.
              </div>
            )}
            {revealed.length === 0 && totalCount === 0 && (
              <div className="text-[12px] italic text-ink-4 py-3 text-center">
                No claims or markers extracted from this media.
              </div>
            )}
            {revealed.map((event, idx) => (
              <RevealedRow
                key={event.item.id}
                event={event}
                isLatest={idx === revealed.length - 1}
                onSeek={handleSeek}
                speakers={speakers}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
