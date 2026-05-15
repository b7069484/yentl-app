"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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

  // Abort in-flight requests on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  /** True when the URL parses as a valid YouTube URL */
  const videoId = parseYouTubeUrlClient(url);
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
        body: JSON.stringify({ url }),
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
        url,
        ...(data.title ? { title: data.title } : {}),
        ...(data.channel ? { channel: data.channel } : {}),
      });

      // Bulk ingest captions
      setPhase({ kind: "ingesting" });
      await bulkIngest(data.transcript_segments, { signal: ac.signal });

      if (!ac.signal.aborted) {
        setPhase({ kind: "done" });
        router.push("/session?view=watch");
      }
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return;
      const message = e instanceof Error ? e.message : String(e);
      setPhase({ kind: "error", code: "NETWORK_ERROR", message });
    }
  }, [url, isValidUrl, isBusy, setSource]);

  const handleBack = useCallback(() => {
    abortRef.current?.abort();
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Clear errors when user edits the URL
    if (phase.kind === "error") setPhase({ kind: "idle" });
  }, [phase.kind]);

  return (
    <div className="max-w-[680px] mx-auto px-6 pt-8 pb-12">
      {/* Back link */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>

      <h1 className="font-serif text-[22px] text-ink mb-1">Paste a YouTube URL</h1>
      <p className="text-[13px] text-ink-3 mb-6">
        Captions are fetched from YouTube — no download required.
      </p>

      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={isBusy || phase.kind === "done"}
          className="flex-1 rounded-lg border border-ink-5 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink-3 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="YouTube URL"
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={!isValidUrl || isBusy || phase.kind === "done"}
          className="inline-flex items-center gap-2 rounded-lg bg-ink text-bg text-[14px] font-medium px-4 py-2 hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
          Fetch captions
        </button>
      </div>

      {/* Processing status */}
      {phase.kind === "fetching" && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-3">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Fetching captions from YouTube…
        </div>
      )}

      {phase.kind === "ingesting" && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-3">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Feeding captions to fact-checker…
        </div>
      )}

      {/* Done state */}
      {phase.kind === "done" && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Captions loaded — session is live.
        </div>
      )}

      {/* Error states */}
      {phase.kind === "error" && (
        <div className="mt-4 flex items-start gap-2 text-[13px] bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            {phase.code === "NO_CAPTIONS" ? (
              <span className="text-amber-800">
                No captions available on this video. Try downloading the audio and
                dropping it in the{" "}
                <strong>Audio file</strong> source instead.
              </span>
            ) : phase.code === "INVALID_URL" ? (
              <span className="text-amber-800">
                That doesn&rsquo;t look like a YouTube URL. Paste a link from{" "}
                youtube.com or youtu.be.
              </span>
            ) : phase.code === "PRIVATE" ? (
              <span className="text-amber-800">
                This video is private, age-restricted, or unavailable in your region.
              </span>
            ) : (
              <span className="text-amber-800">
                Could not fetch captions: {phase.message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
