"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { bulkIngest } from "@/lib/client/ingest-orchestrator";
import type { TranscriptSegment, Speaker } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "ingesting" }
  | { kind: "done" }
  | { kind: "error"; code: string; message: string };

interface MediaIngestResponse {
  utterances?: TranscriptSegment[];
  speakers?: Speaker[];
  mime?: string;
  error?: { code: string; message: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lightweight client-side URL sanity check — just validates parseable URL format. */
function isValidUrlFormat(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const { protocol } = new URL(value.trim());
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Map server error codes to user-friendly messages. */
function errorMessage(code: string, serverMessage: string): string {
  switch (code) {
    case "SSRF_BLOCKED":
      return "URLs to private / local addresses aren't allowed.";
    case "INVALID_URL":
      return "That doesn't look like a valid URL.";
    case "UNSUPPORTED_MEDIA":
      return `We only support direct audio/video URLs (MP3, WAV, M4A, MP4, OGG, WebM). Got: ${serverMessage}`;
    case "TRANSCRIBE_FAILED":
      return `Transcription failed. ${serverMessage}`;
    default:
      return serverMessage || "An unexpected error occurred.";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaUrlIngestPane() {
  const router = useRouter();
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setSource = useSession((s) => s.setSource);

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight request on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const isValidUrl = isValidUrlFormat(url);
  const isBusy = phase.kind === "processing" || phase.kind === "ingesting";

  const handleProcess = useCallback(async () => {
    if (!isValidUrl || isBusy) return;

    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ kind: "processing" });

    try {
      const res = await fetch("/api/media-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: ac.signal,
      });

      const data: MediaIngestResponse = await res.json();

      if (ac.signal.aborted) return;

      if (data.error) {
        setPhase({
          kind: "error",
          code: data.error.code,
          message: errorMessage(data.error.code, data.error.message),
        });
        return;
      }

      if (!data.utterances) {
        setPhase({
          kind: "error",
          code: "NETWORK_ERROR",
          message: "Unexpected response from server.",
        });
        return;
      }

      // Set session source
      setSource({ kind: "media_url", url: url.trim() });

      // Bulk ingest
      setPhase({ kind: "ingesting" });
      await bulkIngest(data.utterances, { signal: ac.signal });

      if (!ac.signal.aborted) {
        setPhase({ kind: "done" });
        router.push("/session?view=overview");
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

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
      // Clear error when user edits URL
      if (phase.kind === "error") setPhase({ kind: "idle" });
    },
    [phase.kind],
  );

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

      <h1 className="font-serif text-[22px] text-ink mb-1">Paste a media URL</h1>
      <p className="text-[13px] text-ink-3 mb-6">
        Direct podcast MP3, MP4, or any audio/video URL
      </p>

      {/* URL input + button */}
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://example.com/episode.mp3"
          disabled={isBusy || phase.kind === "done"}
          className="flex-1 rounded-lg border border-ink-5 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink-3 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Media URL"
        />
        <button
          type="button"
          onClick={handleProcess}
          disabled={!isValidUrl || isBusy || phase.kind === "done"}
          className="inline-flex items-center gap-2 rounded-lg bg-ink text-bg text-[14px] font-medium px-4 py-2 hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
          Process →
        </button>
      </div>

      {/* Processing status */}
      {phase.kind === "processing" && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-3">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Transcribing media via Deepgram…
        </div>
      )}

      {phase.kind === "ingesting" && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-3">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Feeding to fact-checker…
        </div>
      )}

      {/* Done state */}
      {phase.kind === "done" && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Transcription complete — session is live.
        </div>
      )}

      {/* Error state */}
      {phase.kind === "error" && (
        <div className="mt-4 flex items-start gap-2 text-[13px] bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <span className="text-amber-800">{phase.message}</span>
        </div>
      )}
    </div>
  );
}
