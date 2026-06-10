"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Globe2,
  Link as LinkIcon,
  Loader2,
  MonitorPlay,
  Route,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { bulkIngest } from "@/lib/client/ingest-orchestrator";
import { friendlyApiErrorMessage } from "@/lib/client/api-errors";
import { readUrlFromClipboard } from "@/lib/client/clipboard-url";
import { sourceAnalysisConsentHeaders } from "@/lib/source-consent";
import type { TranscriptSegment, Speaker } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "ingesting" }
  | { kind: "done" }
  | { kind: "error"; code: string; message: string };

type UrlReadiness =
  | { kind: "empty"; title: string; body: string }
  | { kind: "invalid"; title: string; body: string }
  | { kind: "direct"; title: string; body: string; extension: string }
  | { kind: "unknown"; title: string; body: string };

interface MediaIngestResponse {
  utterances?: TranscriptSegment[];
  speakers?: Speaker[];
  mime?: string;
  error?: { code: string; message: string };
}

const VALIDATION_MEDIA_URL = "http://localhost:3000/validation/yentl-synthetic-panel.wav";

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

function mediaUrlReadiness(value: string): UrlReadiness {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      kind: "empty",
      title: "Paste a direct audio or video URL",
      body: "Examples: a podcast MP3, an MP4 file, or a hosted WebM clip.",
    };
  }

  if (!isValidUrlFormat(trimmed)) {
    return {
      kind: "invalid",
      title: "Yentl needs an http or https URL",
      body: "Local files and private network addresses are checked server-side and may be blocked.",
    };
  }

  try {
    const pathname = new URL(trimmed).pathname.toLowerCase();
    const match = pathname.match(/\.([a-z0-9]+)$/);
    const extension = match?.[1] ?? "";
    if (["mp3", "wav", "m4a", "mp4", "ogg", "webm"].includes(extension)) {
      return {
        kind: "direct",
        title: "Direct media URL recognized",
        body: "Yentl will fetch the media, transcribe it, then open Watch.",
        extension: extension.toUpperCase(),
      };
    }
  } catch {
    // isValidUrlFormat already rejected malformed values.
  }

  return {
    kind: "unknown",
    title: "URL accepted; server will verify the media type",
    body: "If this is a normal webpage with a player, browser-tab capture keeps the page and Yentl side by side.",
  };
}

/** Map server error codes to user-friendly messages. */
function errorMessage(
  code: string,
  serverMessage: string,
  status = 200,
  retryAfterSec?: string | null,
): string {
  switch (code) {
    case "SOURCE_CONSENT_REQUIRED":
    case "RATE_LIMITED":
    case "RATE_LIMIT_UNAVAILABLE":
      return friendlyApiErrorMessage({
        status,
        code,
        message: serverMessage,
        retryAfterSec,
      });
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
  const initialUrl = useSession((s) => (s.source.kind === "media_url" ? s.source.url : ""));

  const [url, setUrl] = useState(initialUrl);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [clipboardStatus, setClipboardStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handoffRef = useRef(false);

  // Abort any in-flight request on unmount
  useEffect(() => () => {
    if (!handoffRef.current) abortRef.current?.abort();
  }, []);

  const isValidUrl = isValidUrlFormat(url);
  const isBusy = phase.kind === "processing" || phase.kind === "ingesting";
  const readiness = mediaUrlReadiness(url);

  const handleProcess = useCallback(async (urlOverride?: string) => {
    const mediaUrl = (urlOverride ?? url).trim();
    if (!isValidUrlFormat(mediaUrl) || isBusy) return;

    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ kind: "processing" });

    try {
      const res = await fetch("/api/media-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...sourceAnalysisConsentHeaders(),
        },
        body: JSON.stringify({ url: mediaUrl }),
        signal: ac.signal,
      });

      const data: MediaIngestResponse = await res.json();

      if (ac.signal.aborted) return;

      if (data.error) {
        setPhase({
          kind: "error",
          code: data.error.code,
          message: errorMessage(
            data.error.code,
            data.error.message,
            res.status,
            res.headers?.get?.("Retry-After") ?? null,
          ),
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
      setSource({ kind: "media_url", url: mediaUrl });

      // Bulk ingest
      setPhase({ kind: "ingesting" });
      handoffRef.current = true;
      await bulkIngest(data.utterances, { signal: ac.signal, speakers: data.speakers });

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
  }, [url, isBusy, setSource, router]);

  const handleLoadValidationMedia = useCallback(async () => {
    if (isBusy) return;
    setClipboardStatus(null);
    setUrl(VALIDATION_MEDIA_URL);
    if (phase.kind === "error") setPhase({ kind: "idle" });
    await handleProcess(VALIDATION_MEDIA_URL);
  }, [handleProcess, isBusy, phase.kind]);

  const handleBack = useCallback(() => {
    abortRef.current?.abort();
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const switchToBrowserTab = useCallback(() => {
    abortRef.current?.abort();
    setSource({ kind: "browser_tab" });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource]);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
      setClipboardStatus(null);
      // Clear error when user edits URL
      if (phase.kind === "error") setPhase({ kind: "idle" });
    },
    [phase.kind],
  );

  const handlePasteFromClipboard = useCallback(async () => {
    const result = await readUrlFromClipboard();
    if (!result.ok) {
      setClipboardStatus({ kind: "error", message: result.message });
      return;
    }

    setUrl(result.url);
    setClipboardStatus({ kind: "success", message: "URL pasted from clipboard." });
    if (phase.kind === "error") setPhase({ kind: "idle" });
  }, [phase.kind]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 md:px-8">
      {/* Back link */}
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-cream-2 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-soft px-3 py-1 text-[11px] font-semibold text-teal">
            <LinkIcon className="h-3.5 w-3.5" aria-hidden />
            Direct media URL
          </div>

          <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-ink sm:text-[34px]">
            Paste a media URL
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
            Use this for a direct podcast MP3, MP4, WebM, or hosted audio/video
            file. If you have a webpage with a player, the browser-tab path is
            usually the better fit.
          </p>

          {/* URL input + button */}
          <div className="mt-6 grid gap-3">
            <label htmlFor="media-url" className="text-[12px] font-semibold text-ink-2">
              Media URL
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="media-url"
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com/episode.mp3"
                disabled={isBusy || phase.kind === "done"}
                className="min-h-11 flex-1 rounded-lg border border-ink-5 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-4 focus:border-ink-3 focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Media URL"
              />
              <button
                type="button"
                onClick={() => void handleProcess()}
                disabled={!isValidUrl || isBusy || phase.kind === "done"}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden />
                )}
                Process
              </button>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isBusy || phase.kind === "done"}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-cream px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Paste media URL from clipboard"
              >
                <ClipboardPaste className="h-4 w-4" aria-hidden />
                Paste
              </button>
            </div>
          </div>

          {validationDemoEnabled() && !isBusy && phase.kind !== "done" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleLoadValidationMedia()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-teal/25 bg-teal-soft px-3 text-[12.5px] font-semibold text-teal transition-colors hover:bg-teal/10"
              >
                <LinkIcon className="h-4 w-4" aria-hidden />
                Load validation media URL
              </button>
            </div>
          )}

          {clipboardStatus && (
            <div
              role="status"
              className={[
                "mt-3 rounded-lg border px-4 py-2 text-[12.5px]",
                clipboardStatus.kind === "success"
                  ? "border-green/25 bg-green-soft text-green"
                  : "border-amber/40 bg-amber-soft text-amber-2",
              ].join(" ")}
            >
              {clipboardStatus.message}
            </div>
          )}

          <UrlReadinessCard readiness={readiness} onBrowserTab={switchToBrowserTab} />

          <MediaProgress phase={phase} />

          {/* Done state */}
          {phase.kind === "done" && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-green/25 bg-green-soft px-4 py-3 text-[13px] text-ink-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
              <div>
                <div className="font-semibold text-ink">Transcription complete.</div>
                <div className="mt-0.5 text-ink-3">Opening the synchronized Watch view now.</div>
              </div>
            </div>
          )}

          {/* Error state */}
          {phase.kind === "error" && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber/40 bg-amber-soft px-4 py-3 text-[13px]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-2" />
              <span className="text-amber-2">{phase.message}</span>
            </div>
          )}
        </section>

        <aside className="grid gap-3">
          <section className="rounded-lg border border-line bg-cream p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              <Route className="h-3.5 w-3.5" aria-hidden />
              Intake route
            </div>
            <div className="grid gap-2">
              <MediaStep label="1. Verify URL" body="Yentl checks that the URL is public and safe to fetch." />
              <MediaStep label="2. Transcribe media" body="Supported audio/video is sent through the transcript pipeline." />
              <MediaStep label="3. Open Watch" body="The transcript, claims, markers, and source stay together." />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-paper p-4">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
              <MonitorPlay className="h-4 w-4 text-teal" aria-hidden />
              Webpage with a player?
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              Use browser-tab capture when the source is an article page, livestream,
              LMS page, social clip, or player that is not a direct file URL.
            </p>
            <button
              type="button"
              onClick={switchToBrowserTab}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2.5 text-[13px] font-medium text-ink-2 hover:bg-cream-2"
            >
              Use browser tab instead
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function UrlReadinessCard({
  readiness,
  onBrowserTab,
}: {
  readiness: UrlReadiness;
  onBrowserTab: () => void;
}) {
  if (readiness.kind === "empty") {
    return (
      <div className="mt-4 rounded-lg border border-line bg-cream px-4 py-3 text-[12.5px] text-ink-3">
        <div className="font-semibold text-ink-2">{readiness.title}</div>
        <div className="mt-0.5">{readiness.body}</div>
      </div>
    );
  }

  if (readiness.kind === "invalid") {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber/40 bg-amber-soft px-4 py-3 text-[12.5px] text-amber-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <div className="font-semibold">{readiness.title}</div>
          <div className="mt-0.5">{readiness.body}</div>
        </div>
      </div>
    );
  }

  if (readiness.kind === "direct") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-green/25 bg-green-soft px-4 py-3 text-[12.5px] text-ink-2">
        <CheckCircle2 className="h-4 w-4 text-green" aria-hidden />
        <span className="font-semibold">{readiness.title}</span>
        <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] text-ink-3">
          {readiness.extension}
        </span>
        <span className="basis-full text-ink-3">{readiness.body}</span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-teal/25 bg-teal-soft px-4 py-3 text-[12.5px] text-ink-3">
      <div className="flex items-center gap-2 font-semibold text-teal">
        <Globe2 className="h-4 w-4" aria-hidden />
        {readiness.title}
      </div>
      <div className="mt-1">{readiness.body}</div>
      <button
        type="button"
        onClick={onBrowserTab}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-teal/25 bg-paper px-3 py-2 text-[12px] font-medium text-ink-2 hover:border-teal/40"
      >
        Switch to browser tab
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function MediaProgress({ phase }: { phase: Phase }) {
  if (phase.kind !== "processing" && phase.kind !== "ingesting") return null;

  const steps = [
    { label: "Fetch media", state: phase.kind === "processing" ? "active" : "done" },
    { label: "Transcribe", state: phase.kind === "processing" ? "active" : "done" },
    { label: "Build workspace", state: phase.kind === "ingesting" ? "active" : "waiting" },
    { label: "Open Watch", state: "waiting" },
  ] as const;

  return (
    <div className="mt-5 rounded-lg border border-line bg-cream p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
        <Loader2 className="h-4 w-4 animate-spin text-teal" aria-hidden />
        {phase.kind === "processing" ? "Transcribing media" : "Feeding transcript to Yentl"}
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

function MediaStep({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-3">
      <div className="text-[12.5px] font-semibold text-ink-2">{label}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{body}</div>
    </div>
  );
}

function validationDemoEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.NEXT_PUBLIC_YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}
