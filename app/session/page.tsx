"use client";
import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
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
  const sampleParam = sp.get("sample");
  const isExtensionPanel = sp.get("surface") === "extension-panel";
  const isValidationDemo = sp.get("demo") === "validation";
  const startedAt = useSession((s) => s.startedAt);
  const source = useSession((s) => s.source);
  const sourceKind = source.kind;
  const prerecordStage = useSession((s) => s.prerecordStage);
  const setSource = useSession((s) => s.setSource);
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setBrowserTabStatus = useSession((s) => s.setBrowserTabStatus);
  const reset = useSession((s) => s.reset);
  const startSession = useSession((s) => s.startSession);
  const appendFinal = useSession((s) => s.appendFinal);
  const addClaim = useSession((s) => s.addClaim);
  const addMarker = useSession((s) => s.addMarker);
  const ensureSpeaker = useSession((s) => s.ensureSpeaker);
  const setRecording = useSession((s) => s.setRecording);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const router = useRouter();

  const shouldRedirect = !sampleParam && view === "watch" && !PLAYABLE_SOURCE_KINDS.has(sourceKind);
  const shouldMoveProjectView = view === "flows";

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/session?view=overview");
    }
  }, [shouldRedirect, router]);

  useEffect(() => {
    if (shouldMoveProjectView) {
      router.replace("/project/flows");
    }
  }, [shouldMoveProjectView, router]);

  useEffect(() => {
    if (!sampleParam || startedAt) return;
    let cancelled = false;

    async function loadSample() {
      setSampleError(null);
      try {
        const res = await fetch(`/api/corpus-sample?id=${encodeURIComponent(sampleParam ?? "")}`);
        const data = await res.json() as CorpusSampleResponse | CorpusSampleError;
        if (!res.ok || "error" in data) {
          throw new Error("error" in data ? data.error.message : "Could not load corpus sample.");
        }
        if (cancelled) return;

        reset();
        setSource(data.source);
        startSession(`Corpus sample: ${data.title}`);
        setRecording(false);
        for (const speaker of data.speakers) ensureSpeaker(speaker.id);
        for (const segment of data.segments) appendFinal(segment);
        for (const claim of data.claims) addClaim(claim);
        for (const marker of data.markers) addMarker(marker);
      } catch (error) {
        if (cancelled) return;
        setSampleError(error instanceof Error ? error.message : "Could not load corpus sample.");
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

  if (shouldMoveProjectView) return null;

  if (isExtensionPanel) {
    return <ExtensionPanelView />;
  }

  if (sampleParam && !startedAt) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-[760px] flex-col items-center justify-center px-5 text-center">
        <div className="font-serif text-[34px] leading-tight text-ink">
          Loading corpus sample
        </div>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-3">
          Yentl is loading the proven transcript, claim, and marker replay for{" "}
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
        <TwoPartyDisclosure />
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
