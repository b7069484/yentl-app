"use client";
import type { ReactNode } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { HomeOverview } from "@/components/session/home-overview";
import { TranscriptView } from "@/components/session/TranscriptView";
import { FilteredList } from "@/components/session/filtered-list";
import { WatchView } from "@/components/session/watch-view";
import { ExtensionPanelView } from "@/components/session/extension-panel-view";
import { SourceRouter } from "@/lib/client/source-router";
import { PLAYABLE_SOURCE_KINDS } from "@/lib/source-kinds";
import { AIDisclosureFooter } from "@/components/session/AIDisclosureFooter";
import { SessionTimer } from "@/components/session/SessionTimer";
import { TwoPartyDisclosure } from "@/components/session/TwoPartyDisclosure";
import { ClaimsLiveRegion } from "@/components/session/ClaimsLiveRegion";
import { loadSession } from "@/lib/client/session-storage";
import type { ClaimCard, RhetoricMarker, SessionSource, Speaker, TranscriptSegment } from "@/lib/types";

export default function SessionPage() {
  return (
    <div id="main-content" className="flex flex-1 flex-col">
      <SessionTimer />
      <Suspense>
        <SessionPageInner />
      </Suspense>
      <ClaimsLiveRegion />
    </div>
  );
}

function SessionPageInner() {
  const sp = useSearchParams();
  const view = sp.get("view") || "overview";
  const sourceParam = sp.get("source");
  const titleParam = sp.get("title");
  const restoreParam = sp.get("restore");
  const sharedTitleParam = sp.get("title");
  const sharedTextParam = sp.get("text");
  const sharedUrlParam = sp.get("url");
  const isExtensionPanel = sp.get("surface") === "extension-panel";
  const isValidationDemo = validationDemoEnabled() && sp.get("demo") === "validation";
  const sampleParam = isValidationDemo ? sp.get("sample") : null;
  const startedAt = useSession((s) => s.startedAt);
  const source = useSession((s) => s.source);
  const sourceKind = source.kind;
  const prerecordStage = useSession((s) => s.prerecordStage);
  const setSource = useSession((s) => s.setSource);
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setBrowserTabStatus = useSession((s) => s.setBrowserTabStatus);
  const reset = useSession((s) => s.reset);
  const restoreSession = useSession((s) => s.restoreSession);
  const startSession = useSession((s) => s.startSession);
  const appendFinal = useSession((s) => s.appendFinal);
  const addClaim = useSession((s) => s.addClaim);
  const addMarker = useSession((s) => s.addMarker);
  const ensureSpeaker = useSession((s) => s.ensureSpeaker);
  const setRecording = useSession((s) => s.setRecording);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const appliedShareTargetKey = useRef<string | null>(null);
  const router = useRouter();

  const shouldRedirect = !sampleParam && view === "watch" && !PLAYABLE_SOURCE_KINDS.has(sourceKind);
  const shouldShowRecordingDisclosure =
    prerecordStage === "selected" &&
    (sourceKind === "mic" || sourceKind === "browser_tab");

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/session?view=overview");
    }
  }, [shouldRedirect, router]);

  useEffect(() => {
    if (
      startedAt ||
      restoreParam ||
      sampleParam ||
      isExtensionPanel ||
      sourceParam === "browser-tab" ||
      sourceParam === "youtube"
    ) {
      return;
    }

    const shareTargetKey = [
      sharedTitleParam ?? "",
      sharedTextParam ?? "",
      sharedUrlParam ?? "",
    ].join("\u0000");
    const sharedSource = sourceFromSharedTargetParams({
      title: sharedTitleParam,
      text: sharedTextParam,
      url: sharedUrlParam,
    });

    if (!sharedSource || appliedShareTargetKey.current === shareTargetKey) return;

    appliedShareTargetKey.current = shareTargetKey;
    reset();
    setSource(sharedSource);
    setPrerecordStage("selected");
    router.replace("/session");
  }, [
    isExtensionPanel,
    restoreParam,
    reset,
    router,
    sampleParam,
    setPrerecordStage,
    setSource,
    sharedTextParam,
    sharedTitleParam,
    sharedUrlParam,
    sourceParam,
    startedAt,
  ]);

  useEffect(() => {
    if (!restoreParam) return;
    if (startedAt) {
      router.replace("/session?view=overview");
      return;
    }
    let cancelled = false;

    async function restoreSavedSession() {
      setRestoreError(null);
      try {
        const saved = await loadSession(restoreParam ?? "");
        if (cancelled) return;
        restoreSession(saved.session);
        router.replace("/session?view=overview");
      } catch (error) {
        if (cancelled) return;
        setRestoreError(error instanceof Error ? error.message : "Could not restore this workspace.");
      }
    }

    void restoreSavedSession();

    return () => {
      cancelled = true;
    };
  }, [restoreParam, restoreSession, router, startedAt]);

  useEffect(() => {
    if (!sampleParam || startedAt) return;
    let cancelled = false;

    async function loadSample() {
      setSampleError(null);
      try {
        const res = await fetch(`/api/corpus-sample?id=${encodeURIComponent(sampleParam ?? "")}`);
        const data = await res.json() as CorpusSampleResponse | CorpusSampleError;
        if (!res.ok || "error" in data) {
          throw new Error("error" in data ? data.error.message : "Could not load validation demo.");
        }
        if (cancelled) return;

        reset();
        setSource(data.source);
        startSession(`Validation demo: ${data.title}`);
        setRecording(false);
        for (const speaker of data.speakers) ensureSpeaker(speaker.id);
        for (const segment of data.segments) appendFinal(segment);
        for (const claim of data.claims) addClaim(claim);
        for (const marker of data.markers) addMarker(marker);
      } catch (error) {
        if (cancelled) return;
        setSampleError(error instanceof Error ? error.message : "Could not load validation demo.");
      }
    }

    void loadSample();

    return () => {
      cancelled = true;
    };
  }, [
    addClaim,
    addMarker,
    appendFinal,
    ensureSpeaker,
    reset,
    sampleParam,
    setRecording,
    setSource,
    startSession,
    startedAt,
  ]);

  useEffect(() => {
    if (startedAt) return;
    if (sourceParam !== "browser-tab") return;
    if (isExtensionPanel && isValidationDemo) return;
    const needsSource =
      source.kind !== "browser_tab" ||
      (!!titleParam && source.title !== titleParam);
    if (needsSource) {
      setSource({
        ...(source.kind === "browser_tab" ? { ...source } : {}),
        kind: "browser_tab",
        ...(titleParam ? { title: titleParam } : {}),
      });
    }
    if (prerecordStage !== "selected") {
      setPrerecordStage("selected");
    }
    if (source.kind !== "browser_tab") {
      setBrowserTabStatus({
        phase: "waiting_for_extension",
        title: titleParam ?? undefined,
        message: "Waiting for the Yentl extension to attach to this page.",
        updatedAt: Date.now(),
      });
    }
  }, [isExtensionPanel, isValidationDemo, prerecordStage, source, sourceParam, startedAt, setBrowserTabStatus, setPrerecordStage, setSource, titleParam]);

  useEffect(() => {
    if (startedAt) return;
    if (sourceParam !== "youtube") return;
    const normalizedUrl = normalizeSharedUrl(sharedUrlParam);
    if (!normalizedUrl || !isYouTubeUrl(normalizedUrl)) return;

    const needsSource =
      source.kind !== "youtube" ||
      source.url !== normalizedUrl ||
      (!!titleParam && source.title !== titleParam);
    if (needsSource) {
      setSource({
        kind: "youtube",
        video_id: "",
        url: normalizedUrl,
        ...(titleParam ? { title: titleParam } : {}),
      });
    }
    if (prerecordStage !== "selected") {
      setPrerecordStage("selected");
    }
  }, [prerecordStage, setPrerecordStage, setSource, sharedUrlParam, source, sourceParam, startedAt, titleParam]);

  if (isExtensionPanel) {
    return <ExtensionPanelView />;
  }

  if (restoreParam && !startedAt) {
    if (restoreError) {
      return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-[760px] flex-col items-center justify-center px-5 text-center">
          <div className="font-serif text-[34px] leading-tight text-ink">
            Saved snapshot not found
          </div>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-3">
            Yentl could not find that browser-local saved session on this
            device. It may have been deleted, saved in another browser, or
            cleared with site data.
          </p>
          <div className="mt-5 rounded-lg border border-red-soft bg-red-soft px-4 py-3 text-[13px] text-red">
            {restoreError}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sessions"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-cream-2 px-4 text-[13px] font-medium text-ink-2 transition-colors hover:bg-paper"
            >
              Open local saves
            </Link>
            <Link
              href="/session"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal px-4 text-[13px] font-medium text-white transition-colors hover:bg-teal-2"
            >
              Start a new analysis
            </Link>
          </div>
        </main>
      );
    }
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-[760px] flex-col items-center justify-center px-5 text-center">
        <div className="font-serif text-[34px] leading-tight text-ink">
          Opening workspace
        </div>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-3">
          Yentl is restoring the captured transcript, claims, markers, and report state.
        </p>
        {restoreError && (
          <div className="mt-5 rounded-lg border border-red-soft bg-red-soft px-4 py-3 text-[13px] text-red">
            {restoreError}
          </div>
        )}
      </main>
    );
  }

  if (sampleParam && !startedAt) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-[760px] flex-col items-center justify-center px-5 text-center">
        <div className="font-serif text-[34px] leading-tight text-ink">
          Loading validation demo
        </div>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-3">
          Yentl is loading a prepared transcript, claim, and marker workspace for{" "}
          <span className="font-mono text-ink-2">{sampleParam}</span>.
        </p>
        {sampleError && (
          <div className="mt-5 rounded-lg border border-red-soft bg-red-soft px-4 py-3 text-[13px] text-red">
            {sampleError}
          </div>
        )}
      </main>
    );
  }

  if (!startedAt) {
    return (
      <>
        {shouldShowRecordingDisclosure && <TwoPartyDisclosure />}
        <SourceRouter />
      </>
    );
  }

  if (shouldRedirect) {
    return null;
  }

  let content: ReactNode;
  switch (view) {
    case "transcript":
      content = <TranscriptView variant="compact" />;
      break;
    case "claims":
    case "markers":
      content = <FilteredList />;
      break;
    case "watch":
      content = <WatchView />;
      break;
    case "overview":
    default:
      content = <HomeOverview />;
      break;
  }

  return (
    <>
      {content}
      <AIDisclosureFooter />
    </>
  );
}

function validationDemoEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  if (process.env.NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  return process.env.NODE_ENV !== "production";
}

type CorpusSampleResponse = {
  id: string;
  title: string;
  category: string;
  url: string;
  source: SessionSource;
  speakers: Speaker[];
  segments: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
};

type CorpusSampleError = {
  error: {
    code: string;
    message: string;
  };
};

function sourceFromSharedTargetParams({
  title,
  text,
  url,
}: {
  title: string | null;
  text: string | null;
  url: string | null;
}): SessionSource | null {
  const sharedUrl = normalizeSharedUrl(url) ?? extractFirstHttpUrl(text) ?? extractFirstHttpUrl(title);

  if (sharedUrl) {
    if (isYouTubeUrl(sharedUrl)) {
      return {
        kind: "youtube",
        video_id: "",
        url: sharedUrl,
        ...(title?.trim() ? { title: title.trim().slice(0, 160) } : {}),
      };
    }

    if (isDirectMediaUrl(sharedUrl)) {
      return { kind: "media_url", url: sharedUrl };
    }

    return {
      kind: "text_doc",
      filename: "",
      mime: "text/html",
      byte_count: 0,
      intent: "web_url",
      source_url: sharedUrl,
      ...(title?.trim() ? { initial_text: title.trim().slice(0, 160) } : {}),
    };
  }

  const initialText = [title, text]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n\n")
    .slice(0, 1_048_576);

  if (!initialText) return null;

  return {
    kind: "text_doc",
    filename: "Shared text",
    mime: "text/plain",
    byte_count: initialText.length,
    initial_text: initialText,
  };
}

function normalizeSharedUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractFirstHttpUrl(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/https?:\/\/[^\s<>"']+/i);
  if (!match?.[0]) return null;
  return normalizeSharedUrl(match[0].replace(/[),.;!?]+$/, ""));
}

function isYouTubeUrl(value: string): boolean {
  try {
    const { hostname, pathname, searchParams } = new URL(value);
    const host = hostname.replace(/^(www\.|m\.)/, "");
    if (host === "youtu.be") return pathname.length > 1;
    if (host !== "youtube.com") return false;
    if (pathname === "/watch") return searchParams.has("v");
    return /^\/(embed|shorts)\/[^/?#]+/.test(pathname);
  } catch {
    return false;
  }
}

function isDirectMediaUrl(value: string): boolean {
  try {
    const { pathname } = new URL(value);
    return /\.(mp3|wav|m4a|mp4|mov|ogg|webm|opus|flac)(?:$|\?)/i.test(pathname);
  } catch {
    return false;
  }
}
