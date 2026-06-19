"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  FileText,
  Globe2,
  Link as LinkIcon,
  Loader2,
  MonitorPlay,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { bulkIngest } from "@/lib/client/ingest-orchestrator";
import { parseArticleText } from "@/lib/client/text-ingest";
import { readUrlFromClipboard } from "@/lib/client/clipboard-url";
import { sourceAnalysisConsentHeaders } from "@/lib/source-consent";

type Phase =
  | { kind: "idle" }
  | { kind: "fetching" }
  | { kind: "ingesting" }
  | { kind: "done"; title: string; wordCount: number }
  | { kind: "error"; code: string; message: string };

type ArticleIngestResponse = {
  url?: string;
  final_url?: string;
  title?: string;
  description?: string | null;
  text?: string;
  word_count?: number;
  error?: { code: string; message: string };
};

const VALIDATION_ARTICLE_URL = "http://localhost:3000/validation/yentl-synthetic-article.html";

function isValidWebUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isYouTubeUrl(value: string) {
  try {
    const { hostname, pathname, searchParams } = new URL(value.trim());
    const host = hostname.replace(/^(www\.|m\.)/, "");
    if (host === "youtu.be") return pathname.length > 1;
    if (host !== "youtube.com") return false;
    if (pathname === "/watch") return searchParams.has("v");
    return /^\/(embed|shorts)\/[^/?#]+/.test(pathname);
  } catch {
    return false;
  }
}

function isDirectMediaUrl(value: string) {
  try {
    const { pathname } = new URL(value.trim());
    return /\.(mp3|wav|m4a|mp4|mov|ogg|webm|opus|flac)$/i.test(pathname);
  } catch {
    return false;
  }
}

function hostLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Web page";
  }
}

function errorCopy(code: string, message: string) {
  if (code === "SSRF_BLOCKED") return "Yentl cannot import private or local network URLs.";
  if (code === "UNSUPPORTED_PAGE") return message;
  if (code === "NO_READABLE_TEXT") return message;
  if (code === "PAGE_TOO_LARGE") return message;
  return message || "Yentl could not import this page.";
}

export function WebUrlIngestPane() {
  const router = useRouter();
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setSource = useSession((s) => s.setSource);
  const initialUrl = useSession((s) =>
    s.source.kind === "text_doc" && s.source.intent === "web_url"
      ? s.source.source_url ?? ""
      : "",
  );
  const [url, setUrl] = useState(initialUrl);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [clipboardStatus, setClipboardStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handoffRef = useRef(false);

  useEffect(() => () => {
    if (!handoffRef.current) abortRef.current?.abort();
  }, []);

  const trimmedUrl = url.trim();
  const isValid = isValidWebUrl(trimmedUrl);
  const isBusy = phase.kind === "fetching" || phase.kind === "ingesting";
  const canAnalyze = isValid && !isBusy;

  const handleBack = useCallback(() => {
    abortRef.current?.abort();
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const switchToYouTube = useCallback((nextUrl = trimmedUrl) => {
    setSource({ kind: "youtube", video_id: "", url: nextUrl });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource, trimmedUrl]);

  const switchToMediaUrl = useCallback((nextUrl = trimmedUrl) => {
    setSource({ kind: "media_url", url: nextUrl });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource, trimmedUrl]);

  const switchToBrowserTab = useCallback(() => {
    setSource({ kind: "browser_tab", url: trimmedUrl, title: hostLabel(trimmedUrl) });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource, trimmedUrl]);

  const switchToTextDocument = useCallback(() => {
    setSource({ kind: "text_doc", filename: "", mime: "", byte_count: 0 });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource]);

  const handleAnalyze = useCallback(async (urlOverride?: string) => {
    const analysisUrl = (urlOverride ?? trimmedUrl).trim();
    if (isBusy || !isValidWebUrl(analysisUrl)) return;
    if (isYouTubeUrl(analysisUrl)) {
      switchToYouTube(analysisUrl);
      return;
    }
    if (isDirectMediaUrl(analysisUrl)) {
      switchToMediaUrl(analysisUrl);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ kind: "fetching" });

    try {
      const res = await fetch("/api/article-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...sourceAnalysisConsentHeaders(),
        },
        body: JSON.stringify({ url: analysisUrl }),
        signal: ac.signal,
      });
      const data = (await res.json()) as ArticleIngestResponse;
      if (ac.signal.aborted) return;

      if (!res.ok || data.error || !data.text) {
        const error = data.error ?? { code: "FETCH_FAILED", message: "Yentl could not import this page." };
        setPhase({ kind: "error", code: error.code, message: errorCopy(error.code, error.message) });
        return;
      }

      const title = data.title || hostLabel(data.final_url || analysisUrl);
      const text = data.text.trim();
      const segments = parseArticleText(text);
      if (segments.length === 0) {
        setPhase({
          kind: "error",
          code: "NO_READABLE_TEXT",
          message: "Yentl could not build a transcript from the extracted page text.",
        });
        return;
      }

      setSource({
        kind: "text_doc",
        filename: title,
        mime: "text/html",
        byte_count: text.length,
        intent: "web_url",
        initial_text: text,
        source_url: data.final_url || analysisUrl,
      });

      setPhase({ kind: "ingesting" });
      handoffRef.current = true;
      await bulkIngest(segments, { signal: ac.signal });
      if (!ac.signal.aborted) {
        setPhase({ kind: "done", title, wordCount: data.word_count ?? text.split(/\s+/).filter(Boolean).length });
        router.push("/session?view=overview");
      }
    } catch (error) {
      handoffRef.current = false;
      if ((error as Error).name === "AbortError") return;
      setPhase({
        kind: "error",
        code: "FETCH_FAILED",
        message: error instanceof Error ? error.message : "Yentl could not import this page.",
      });
    }
  }, [isBusy, router, setSource, switchToMediaUrl, switchToYouTube, trimmedUrl]);

  const handleLoadValidationArticle = useCallback(async () => {
    if (isBusy) return;
    setClipboardStatus(null);
    setUrl(VALIDATION_ARTICLE_URL);
    if (phase.kind === "error") setPhase({ kind: "idle" });
    await handleAnalyze(VALIDATION_ARTICLE_URL);
  }, [handleAnalyze, isBusy, phase.kind]);

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
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-cream-2 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-soft px-3 py-1 text-[11px] font-semibold text-teal">
            <Globe2 className="h-3.5 w-3.5" aria-hidden />
            Web page
          </div>

          <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-ink sm:text-[34px]">
            Paste a page URL
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
            Yentl will pull readable page text when it can. YouTube and direct media links are routed to their dedicated live-player paths.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="sr-only" htmlFor="web-url-input">
              Web page URL
            </label>
            <input
              id="web-url-input"
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setClipboardStatus(null);
                if (phase.kind === "error") setPhase({ kind: "idle" });
              }}
              placeholder="https://example.com/article"
              className="min-h-12 rounded-lg border border-line bg-cream px-4 text-[14px] text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15"
              disabled={isBusy}
            />
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={!canAnalyze}
              className="yentl-action-button inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-[14px] font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-ink/90 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
              {phase.kind === "fetching" ? "Reading page" : phase.kind === "ingesting" ? "Building analysis" : "Analyze URL"}
            </button>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              disabled={isBusy}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-cream px-4 text-[13px] font-medium text-ink-2 transition-colors hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Paste URL from clipboard"
            >
              <ClipboardPaste className="h-4 w-4" aria-hidden />
              Paste
            </button>
          </div>

          {validationDemoEnabled() && !isBusy && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleLoadValidationArticle()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-teal/25 bg-teal-soft px-3 text-[12.5px] font-semibold text-teal transition-colors hover:bg-teal/10"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Load validation article
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

          {trimmedUrl && isValid && (
            <div className="mt-4 rounded-lg border border-line bg-cream px-4 py-3 text-[13px] leading-relaxed text-ink-3">
              {isYouTubeUrl(trimmedUrl) ? (
                <span className="inline-flex items-center gap-2 text-teal">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  YouTube link detected. This will open the live watch workspace.
                </span>
              ) : isDirectMediaUrl(trimmedUrl) ? (
                <span className="inline-flex items-center gap-2 text-teal">
                  <LinkIcon className="h-4 w-4" aria-hidden />
                  Direct media link detected. This will use media transcription.
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal" aria-hidden />
                  Readable-page import will try <span className="font-mono">{hostLabel(trimmedUrl)}</span>.
                </span>
              )}
            </div>
          )}

          {!trimmedUrl && (
            <div className="mt-4 rounded-lg border border-line bg-cream px-4 py-3 text-[13px] text-ink-3">
              Paste the URL once. Yentl will pick the best branch from there.
            </div>
          )}

          {phase.kind === "error" && (
            <div className="mt-5 rounded-lg border border-amber/40 bg-amber-soft p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-2" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink">This URL needs a fallback</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-amber-2">{phase.message}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
                    {articleRecoveryGuidance(phase.code)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={switchToBrowserTab}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-[12.5px] font-medium text-ink-2"
                    >
                      <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
                      Use Chrome tab
                    </button>
                    <button
                      type="button"
                      onClick={() => switchToMediaUrl()}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-[12.5px] font-medium text-ink-2"
                    >
                      <LinkIcon className="h-3.5 w-3.5" aria-hidden />
                      Try media URL
                    </button>
                    <button
                      type="button"
                      onClick={switchToTextDocument}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-[12.5px] font-medium text-ink-2"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                      Paste text
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase.kind === "done" && (
            <div className="mt-5 rounded-lg border border-green/25 bg-green-soft px-4 py-3 text-[13px] text-green">
              Imported {phase.wordCount} words from {phase.title}. Opening analysis.
            </div>
          )}
        </section>

        <aside className="grid gap-3">
          <section className="rounded-lg border border-line bg-cream p-5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              URL routing
            </div>
            <div className="grid gap-2 text-[12.5px] text-ink-3">
              <UrlRoute label="YouTube" body="Playable live workspace with synced captions or tab audio." />
              <UrlRoute label="Article/text page" body="Readable text import, then claims and markers." />
              <UrlRoute label="Direct media" body="MP3, MP4, WebM, or hosted media transcription." />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function UrlRoute({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-3">
      <div className="text-[12.5px] font-semibold text-ink-2">{label}</div>
      <p className="mt-0.5 leading-snug">{body}</p>
    </div>
  );
}

function articleRecoveryGuidance(code: string) {
  switch (code) {
    case "SSRF_BLOCKED":
      return "Private or local pages cannot be fetched safely. If you can see the page in Chrome, use browser-tab capture; if you have the article text, paste it directly.";
    case "UNSUPPORTED_PAGE":
      return "This URL is probably not a readable article page. Try the media URL path for direct files, browser-tab capture for player pages, or paste the visible text.";
    case "NO_READABLE_TEXT":
      return "The page loaded but did not expose enough readable article text. Browser-tab capture or pasted text keeps the source in play without losing context.";
    case "PAGE_TOO_LARGE":
      return "The page is too large for one import. Paste the relevant section or capture the visible tab so Yentl can focus on the material you mean.";
    default:
      return "Choose the source path that matches what you have: visible webpage, direct media file, or article text.";
  }
}

function validationDemoEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.NEXT_PUBLIC_YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}
