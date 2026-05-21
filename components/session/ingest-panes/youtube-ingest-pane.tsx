"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  MonitorPlay,
  Play,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { bulkIngest } from "@/lib/client/ingest-orchestrator";
import type { TranscriptSegment } from "@/lib/types";

/**
 * Lightweight client-side YouTube URL check.
 * Returns the video ID string if parseable, null otherwise.
 * Mirrors the logic in lib/server/youtube-captions.ts so the server
 * remains the canonical validator; this is just for instant UI feedback.
 */
function parseYouTubeUrlClient(url: string): string | null {
  if (!url) return null;
  try {
    const { hostname, pathname, searchParams } = new URL(url);
    const host = hostname.replace(/^(www\.|m\.)/, "");
    if (host === "youtu.be") {
      const id = pathname.slice(1);
      return id ? id : null;
    }
    if (host === "youtube.com") {
      if (pathname === "/watch") return searchParams.get("v");
      const m = pathname.match(/^\/(embed|shorts)\/([^/?#]+)/);
      if (m) return m[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | { kind: "idle" }
  | { kind: "fetching" }
  | { kind: "ingesting" }
  | { kind: "done" }
  | { kind: "error"; code: string; message: string };

interface YoutubeIngestResponse {
  video_id?: string;
  url?: string;
  title?: string;
  channel?: string;
  transcript_segments?: TranscriptSegment[];
  error?: { code: string; message: string };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function YoutubeIngestPane() {
  const router = useRouter();
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setSource = useSession((s) => s.setSource);

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const handoffRef = useRef(false);

  // Abort in-flight requests on unmount
  useEffect(() => () => {
    if (!handoffRef.current) abortRef.current?.abort();
  }, []);

  /** True when the URL parses as a valid YouTube URL */
  const trimmedUrl = url.trim();
  const videoId = parseYouTubeUrlClient(trimmedUrl);
  const isValidUrl = videoId !== null;
  const isBusy = phase.kind === "fetching" || phase.kind === "ingesting";

  const handleFetch = useCallback(async () => {
    if (!isValidUrl || isBusy) return;

    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ kind: "fetching" });

    try {
      const res = await fetch("/api/youtube-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
        signal: ac.signal,
      });

      const data: YoutubeIngestResponse = await res.json();

      if (ac.signal.aborted) return;

      // Structured error envelope
      if (data.error) {
        setPhase({ kind: "error", code: data.error.code, message: data.error.message });
        return;
      }

      if (!data.transcript_segments || !data.video_id) {
        setPhase({
          kind: "error",
          code: "NETWORK_ERROR",
          message: "Unexpected response from server.",
        });
        return;
      }

      // Set session source
      setSource({
        kind: "youtube",
        video_id: data.video_id,
        url: trimmedUrl,
        ...(data.title ? { title: data.title } : {}),
        ...(data.channel ? { channel: data.channel } : {}),
      });

      // Bulk ingest captions
      setPhase({ kind: "ingesting" });
      handoffRef.current = true;
      await bulkIngest(data.transcript_segments, { signal: ac.signal });

      if (!ac.signal.aborted) {
        setPhase({ kind: "done" });
        router.push("/session?view=watch");
      }
    } catch (e: unknown) {
      handoffRef.current = false;
      if ((e as Error).name === "AbortError") return;
      const message = e instanceof Error ? e.message : String(e);
      setPhase({ kind: "error", code: "NETWORK_ERROR", message });
    }
  }, [trimmedUrl, isValidUrl, isBusy, setSource, router]);

  const handleBack = useCallback(() => {
    abortRef.current?.abort();
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const handleUrlChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Clear errors when user edits the URL
    if (phase.kind === "error") setPhase({ kind: "idle" });
  }, [phase.kind]);

  const switchToBrowserTab = useCallback(() => {
    abortRef.current?.abort();
    setSource({ kind: "browser_tab" });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource]);

  const switchToAudioFile = useCallback(() => {
    abortRef.current?.abort();
    setSource({
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename: "",
      mime: "",
    });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource]);

  const switchToMediaUrl = useCallback(() => {
    abortRef.current?.abort();
    setSource({ kind: "media_url", url: "" });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 md:px-8">
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors hover:text-ink-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-soft px-3 py-1 text-[11px] font-semibold text-teal">
            <Play className="h-3.5 w-3.5" aria-hidden />
            YouTube captions
          </div>

          <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-ink sm:text-[34px]">
            Bring in a YouTube video
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
            If captions are public, Yentl builds the Watch view from the video,
            transcript, claims, markers, and evidence anchors.
          </p>

          <div className="mt-6 grid gap-3">
            <label htmlFor="youtube-url" className="text-[12px] font-semibold text-ink-2">
              YouTube URL
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="youtube-url"
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isBusy || phase.kind === "done"}
                className="min-h-11 flex-1 rounded-lg border border-ink-5 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-4 focus:border-ink-3 focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="YouTube URL"
              />
              <button
                type="button"
                onClick={handleFetch}
                disabled={!isValidUrl || isBusy || phase.kind === "done"}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Fetch captions
              </button>
            </div>

            <UrlReadiness videoId={videoId} url={trimmedUrl} />
          </div>

          <FetchProgress phase={phase} />

          {phase.kind === "done" && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-green/25 bg-green-soft px-4 py-3 text-[13px] text-ink-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
              <div>
                <div className="font-semibold text-ink">Captions loaded.</div>
                <div className="mt-0.5 text-ink-3">Opening the synchronized Watch view now.</div>
              </div>
            </div>
          )}

          <YoutubeErrorRecovery
            phase={phase}
            onBrowserTab={switchToBrowserTab}
            onAudioFile={switchToAudioFile}
            onMediaUrl={switchToMediaUrl}
          />
        </section>

        <aside className="grid gap-3">
          <VideoPreviewCard videoId={videoId} />
          <RecoveryLadder
            onBrowserTab={switchToBrowserTab}
            onAudioFile={switchToAudioFile}
            onMediaUrl={switchToMediaUrl}
          />
        </aside>
      </div>
    </div>
  );
}

function UrlReadiness({ videoId, url }: { videoId: string | null; url: string }) {
  if (!url) {
    return (
      <div className="rounded-md border border-line bg-cream px-3 py-2 text-[12px] text-ink-3">
        Paste a watch, shorts, embed, or youtu.be link.
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="rounded-md border border-amber/50 bg-amber-soft px-3 py-2 text-[12px] text-amber-2">
        That link is not a supported YouTube URL yet.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-green/25 bg-green-soft px-3 py-2 text-[12px] text-ink-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-green" aria-hidden />
      Video recognized
      <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] text-ink-3">
        {videoId}
      </span>
    </div>
  );
}

function FetchProgress({ phase }: { phase: Phase }) {
  if (phase.kind !== "fetching" && phase.kind !== "ingesting") return null;

  const steps = [
    {
      label: "Find video",
      state: "done",
    },
    {
      label: "Check public captions",
      state: phase.kind === "fetching" ? "active" : "done",
    },
    {
      label: "Build transcript",
      state: phase.kind === "ingesting" ? "active" : "waiting",
    },
    {
      label: "Open Watch view",
      state: "waiting",
    },
  ] as const;

  return (
    <div className="mt-5 rounded-lg border border-line bg-cream p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
        <Loader2 className="h-4 w-4 animate-spin text-teal" aria-hidden />
        Preparing video analysis
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.label}
            className="rounded-md border border-line bg-paper px-3 py-2 text-[11.5px] text-ink-3"
          >
            <span
              className={[
                "mb-1 block h-1.5 rounded-full",
                step.state === "done" && "bg-green",
                step.state === "active" && "bg-teal motion-safe:animate-pulse",
                step.state === "waiting" && "bg-line-strong",
              ].filter(Boolean).join(" ")}
              aria-hidden
            />
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoPreviewCard({ videoId }: { videoId: string | null }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
      <div className="border-b border-line-soft px-4 py-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Video preview
        </h2>
      </div>
      {videoId ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youtubeThumbnail(videoId)}
            alt="YouTube video thumbnail"
            className="aspect-video w-full bg-ink object-cover"
          />
          <div className="grid gap-2 p-4 text-[12.5px] text-ink-3">
            <div className="font-mono text-[11px] text-ink-4">youtube:{videoId}</div>
            <div className="rounded-md border border-line bg-cream px-3 py-2">
              Public captions are the fastest path. If they are missing, switch
              straight to tab capture.
            </div>
          </div>
        </>
      ) : (
        <div className="grid min-h-[220px] place-items-center bg-cream p-6 text-center">
          <div>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-soft text-teal">
              <Play className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-[13px] font-medium text-ink-2">Waiting for a video link</p>
            <p className="mt-1 text-[12px] text-ink-3">Thumbnail and caption check appear here.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function RecoveryLadder({
  onBrowserTab,
  onAudioFile,
  onMediaUrl,
}: {
  onBrowserTab: () => void;
  onAudioFile: () => void;
  onMediaUrl: () => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-paper p-4 shadow-sm">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        If captions fail
      </h2>
      <div className="mt-3 grid gap-2">
        <RecoveryButton
          icon={<MonitorPlay className="h-4 w-4" aria-hidden />}
          title="Browser tab"
          detail="Best for any video on any page."
          onClick={onBrowserTab}
        />
        <RecoveryButton
          icon={<Upload className="h-4 w-4" aria-hidden />}
          title="Audio file"
          detail="Use when you already have the media."
          onClick={onAudioFile}
        />
        <RecoveryButton
          icon={<LinkIcon className="h-4 w-4" aria-hidden />}
          title="Media URL"
          detail="Direct MP3, MP4, or podcast feed."
          onClick={onMediaUrl}
        />
      </div>
    </section>
  );
}

function RecoveryButton({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md border border-line bg-cream px-3 py-2.5 text-left transition-colors hover:border-teal/40 hover:bg-teal-soft/70"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-paper text-teal">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink-2">{title}</span>
        <span className="block text-[11.5px] leading-snug text-ink-3">{detail}</span>
      </span>
    </button>
  );
}

function YoutubeErrorRecovery({
  phase,
  onBrowserTab,
  onAudioFile,
  onMediaUrl,
}: {
  phase: Phase;
  onBrowserTab: () => void;
  onAudioFile: () => void;
  onMediaUrl: () => void;
}) {
  if (phase.kind !== "error") return null;

  const recoverable =
    phase.code === "NO_CAPTIONS" ||
    phase.code === "PRIVATE" ||
    phase.code === "YT_DLP_MISSING";

  const message =
    phase.code === "NO_CAPTIONS"
      ? "No captions available on this video. Yentl can still listen to the playing tab, ingest an audio file, or process a direct media URL."
      : phase.code === "INVALID_URL"
        ? "That doesn't look like a YouTube URL. Paste a link from youtube.com or youtu.be."
        : phase.code === "PRIVATE"
          ? "This video is private, age-restricted, or unavailable in your region. If you can play it in your browser, tab capture is the better route."
          : phase.code === "YT_DLP_MISSING"
            ? "The server is not configured for YouTube caption ingest right now. Browser tab capture or Audio file can keep you moving."
            : `Could not fetch captions: ${phase.message}`;

  return (
    <div className="mt-5 rounded-lg border border-amber/60 bg-amber-soft p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-2" aria-hidden />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">Caption import stopped</div>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-2">{message}</p>
        </div>
      </div>

      {recoverable && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onBrowserTab}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-ink/90"
          >
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
            Browser tab
          </button>
          <button
            type="button"
            onClick={onAudioFile}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-amber/60 bg-paper px-3 py-2 text-[12px] font-medium text-ink-2 transition-colors hover:bg-cream"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Audio file
          </button>
          <button
            type="button"
            onClick={onMediaUrl}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-amber/60 bg-paper px-3 py-2 text-[12px] font-medium text-ink-2 transition-colors hover:bg-cream"
          >
            <LinkIcon className="h-3.5 w-3.5" aria-hidden />
            Media URL
          </button>
        </div>
      )}
    </div>
  );
}
