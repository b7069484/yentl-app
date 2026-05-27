"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useSession } from "@/lib/client/session-store";
import type {
  ClaimCard,
  RhetoricMarker,
  SessionSource,
  Speaker,
  TranscriptSegment,
} from "@/lib/types";

type Props = {
  sampleId: string | null;
  children: ReactNode;
};

export function ValidationSampleHydrator({ sampleId, children }: Props) {
  const startedAt = useSession((s) => s.startedAt);
  const reset = useSession((s) => s.reset);
  const setSource = useSession((s) => s.setSource);
  const startSession = useSession((s) => s.startSession);
  const setRecording = useSession((s) => s.setRecording);
  const ensureSpeaker = useSession((s) => s.ensureSpeaker);
  const appendFinal = useSession((s) => s.appendFinal);
  const addClaim = useSession((s) => s.addClaim);
  const addMarker = useSession((s) => s.addMarker);
  const [error, setError] = useState<string | null>(null);

  const shouldLoad = validationDemoEnabled() && Boolean(sampleId) && !startedAt;

  useEffect(() => {
    if (!shouldLoad || !sampleId) return;
    let cancelled = false;
    const id = sampleId;

    async function loadSample() {
      setError(null);
      try {
        const res = await fetch(`/api/corpus-sample?id=${encodeURIComponent(id)}`);
        const data = (await res.json()) as CorpusSampleResponse | CorpusSampleError;
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
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load validation demo.");
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
    sampleId,
    setRecording,
    setSource,
    shouldLoad,
    startSession,
  ]);

  if (!sampleId || !validationDemoEnabled()) return <>{children}</>;
  if (startedAt) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[760px] flex-col items-center justify-center px-5 text-center">
      <div className="font-serif text-[34px] leading-tight text-ink">
        Loading validation demo
      </div>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-3">
        Yentl is loading prepared transcript, claim, marker, and source context for{" "}
        <span className="font-mono text-ink-2">{sampleId}</span>.
      </p>
      {error && (
        <div className="mt-5 rounded-lg border border-red-soft bg-red-soft px-4 py-3 text-[13px] text-red">
          {error}
        </div>
      )}
    </main>
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
