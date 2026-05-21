"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Captions,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Radio,
  RefreshCw,
  SearchCheck,
  Square,
} from "lucide-react";
import {
  checkBrowserTabCaptureStatus,
  stopBrowserTabCapture,
} from "@/components/session/ExtensionBridge";
import { useSession, type BrowserTabCaptureStatus } from "@/lib/client/session-store";
import type { ClaimCard, RhetoricMarker, SessionSource, TranscriptSegment } from "@/lib/types";

type Phase = BrowserTabCaptureStatus["phase"];

const PHASE_META: Record<
  Phase,
  {
    label: string;
    heading: string;
    body: string;
    icon: typeof Loader2;
    shell: string;
    dot: string;
  }
> = {
  idle: {
    label: "Preparing",
    heading: "Yentl is opening beside this page",
    body: "Keep the media visible here. The extension will attach the tab audio stream and start the transcript as soon as speech arrives.",
    icon: Loader2,
    shell: "border-blue-200 bg-blue-50 text-blue-800",
    dot: "bg-blue-500",
  },
  waiting_for_extension: {
    label: "Waiting",
    heading: "Waiting for the extension",
    body: "Click the Yentl extension on this same media page. The video and analysis should remain side by side.",
    icon: Radio,
    shell: "border-blue-200 bg-blue-50 text-blue-800",
    dot: "bg-blue-500",
  },
  extension_connected: {
    label: "Connected",
    heading: "Connected to this page",
    body: "Play the video or audio. Yentl is attached here and will add transcript lines as speech is detected.",
    icon: CheckCircle2,
    shell: "border-green/20 bg-green-soft text-green",
    dot: "bg-green",
  },
  capturing: {
    label: "Audio arriving",
    heading: "Audio is arriving",
    body: "Yentl is hearing the tab. Final transcript lines and evidence cards will populate below.",
    icon: Radio,
    shell: "border-green/20 bg-green-soft text-green",
    dot: "bg-green animate-pulse",
  },
  transcribing: {
    label: "Transcribing",
    heading: "Building the live transcript",
    body: "Transcript lines are landing. Claims, markers, and synthesis will follow as the session develops.",
    icon: Captions,
    shell: "border-green/20 bg-green-soft text-green",
    dot: "bg-green animate-pulse",
  },
  no_audio_detected: {
    label: "No speech yet",
    heading: "Connected, but no speech yet",
    body: "Yentl has the tab stream, but no words have been transcribed. Confirm the media is playing, unmuted, and contains speech.",
    icon: AlertTriangle,
    shell: "border-amber/35 bg-amber-50 text-amber-900",
    dot: "bg-amber",
  },
  stopped: {
    label: "Stopped",
    heading: "Capture stopped",
    body: "The tab capture has ended. Open the full workspace to review or start a fresh source from Yentl.",
    icon: Square,
    shell: "border-line bg-cream-2 text-ink-2",
    dot: "bg-ink-4",
  },
  error: {
    label: "Needs attention",
    heading: "The extension needs attention",
    body: "Reload the media page and extension, then click Yentl again while the media is visible.",
    icon: AlertTriangle,
    shell: "border-red-soft bg-red-soft/50 text-red",
    dot: "bg-red",
  },
};

function sourceTitle(source: SessionSource, status: BrowserTabCaptureStatus) {
  if (source.kind === "browser_tab" && source.title) return source.title;
  if (status.title) return status.title;
  return "This browser tab";
}

function sourceHost(source: SessionSource, status: BrowserTabCaptureStatus) {
  const url = source.kind === "browser_tab" ? source.url : status.url;
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function speakerName(segment: TranscriptSegment) {
  if (segment.speaker_id === null) return "Speaker";
  return `Speaker ${segment.speaker_id + 1}`;
}

function latestClaims(claims: ClaimCard[]) {
  return claims
    .filter((claim) => claim.status !== "checking")
    .slice(-3)
    .reverse();
}

function latestMarkers(markers: RhetoricMarker[]) {
  return markers.slice(-3).reverse();
}

function useValidationDemo() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") !== "validation") return;

    let state = useSession.getState();
    const source = {
      kind: "browser_tab" as const,
      title: params.get("title") ?? "Fixture video",
      url: "http://localhost:3000/validation/extension-panel-preview.html",
    };

    state.setSource(source);
    if (!state.startedAt) {
      state.startSession(`Browser tab: ${source.title}`);
    }

    state = useSession.getState();
    state.setSource({ ...source, ...(state.source.kind === "browser_tab" ? state.source : {}) });
    state.setBrowserTabStatus({
      phase: "transcribing",
      title: source.title,
      url: source.url,
      message:
        "Preview mode: showing the transcript, claims, and markers the extension panel should display during a live run.",
      updatedAt: Date.now(),
    });
    state.setRecording(true);

    if (state.transcript.length === 0) {
      for (const segment of VALIDATION_TRANSCRIPT) {
        useSession.getState().appendFinal(segment);
      }
    }

    const latest = useSession.getState();
    if (!latest.claims.some((claim) => claim.id === VALIDATION_CLAIM.id)) {
      latest.addClaim(VALIDATION_CLAIM);
    }
    if (!latest.markers.some((marker) => marker.id === VALIDATION_MARKER.id)) {
      latest.addMarker(VALIDATION_MARKER);
    }
  }, []);
}

const VALIDATION_TRANSCRIPT: TranscriptSegment[] = [
  {
    text: "Welcome to the Yentl validation panel. The city library budget increased by 12 percent this year.",
    start: 0,
    end: 6,
    is_final: true,
    speaker_id: 0,
  },
  {
    text: "Officials say the increase will fund weekend hours, staff training, and repairs to the children's reading room.",
    start: 6,
    end: 13,
    is_final: true,
    speaker_id: 0,
  },
  {
    text: "Critics argue the proposal sounds certain before the audit has been released.",
    start: 13,
    end: 18,
    is_final: true,
    speaker_id: 1,
  },
  {
    text: "Yentl should keep the media, transcript, claims, and rhetoric markers visible together.",
    start: 18,
    end: 24,
    is_final: true,
    speaker_id: 0,
  },
];

const VALIDATION_CLAIM: ClaimCard = {
  id: "validation-claim-library-budget",
  claim_text: "The city library budget increased by 12 percent this year.",
  utterance_start: 0,
  utterance_end: 6,
  speaker_id: 0,
  topic: "public budget",
  topic_secondary: "libraries",
  primary_label: "UNVERIFIABLE",
  score: 46,
  annotations: ["Preview fixture"],
  explanation: "The statement is checkable, but the preview fixture does not include source documents.",
  status: "confirmed",
  sources: [],
};

const VALIDATION_MARKER: RhetoricMarker = {
  id: "validation-marker-certainty-before-audit",
  type: "rhetoric",
  name: "premature-certainty",
  display: "Premature certainty",
  excerpt: "sounds certain before the audit has been released",
  speaker_id: 1,
  start_time: 13,
  end_time: 18,
  severity: "clear",
  explanation: "The phrasing flags confidence before the evidence is available.",
};

export function ExtensionPanelView() {
  useValidationDemo();

  const source = useSession((s) => s.source);
  const status = useSession((s) => s.browserTabStatus);
  const transcript = useSession((s) => s.transcript);
  const interim = useSession((s) => s.interim);
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const startedAt = useSession((s) => s.startedAt);
  const endedAt = useSession((s) => s.endedAt);

  const phase: Phase = endedAt ? "stopped" : status.phase;
  const meta = PHASE_META[phase] ?? PHASE_META.idle;
  const Icon = meta.icon;
  const transcriptRows = transcript.slice(-8).reverse();
  const claimRows = latestClaims(claims);
  const markerRows = latestMarkers(markers);
  const host = sourceHost(source, status);

  return (
    <section className="flex h-dvh min-h-screen flex-col overflow-hidden bg-cream text-ink">
      <header className="border-b border-line bg-paper/95 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`mb-2 inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.shell}`}
            >
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              <span className="truncate">{meta.label}</span>
            </div>
            <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">
              {sourceTitle(source, status)}
            </h1>
            {host && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-ink-4">
                {host}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={checkBrowserTabCaptureStatus}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-cream text-ink-2 hover:bg-cream-2"
              aria-label="Check extension status"
              title="Check extension status"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={stopBrowserTabCapture}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-soft bg-red-soft/35 text-red hover:bg-red-soft/55"
              aria-label="Stop tab capture"
              title="Stop tab capture"
            >
              <Square className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-paper p-4 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-soft text-teal">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <h2 className="font-serif text-[23px] leading-tight text-ink">
              {meta.heading}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
              {status.message ?? meta.body}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric label="Transcript" value={String(transcript.length)} />
              <Metric
                label="Claims"
                value={String(claims.filter((claim) => claim.status !== "checking").length)}
              />
              <Metric label="Markers" value={String(markers.length)} />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-paper shadow-sm">
            <PanelHeader icon={<Captions className="h-4 w-4" aria-hidden />} label="Live transcript" />
            <div className="space-y-3 px-4 pb-4">
              {transcriptRows.length === 0 && !interim && (
                <p className="rounded-lg border border-dashed border-line bg-cream px-3 py-3 text-[12.5px] leading-relaxed text-ink-4">
                  {startedAt
                    ? "Waiting for the first finalized transcript line."
                    : "The transcript will start after the extension confirms capture."}
                </p>
              )}
              {interim && (
                <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12.5px] italic leading-relaxed text-blue-900">
                  {interim}
                </p>
              )}
              {transcriptRows.map((segment) => (
                <article key={`${segment.start}-${segment.end}-${segment.text}`} className="rounded-lg border border-line bg-cream px-3 py-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                    <span>{speakerName(segment)}</span>
                    <span className="tabular-nums">{formatTime(segment.start)}</span>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-ink-2">
                    {segment.text}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-paper shadow-sm">
            <PanelHeader icon={<SearchCheck className="h-4 w-4" aria-hidden />} label="Evidence queue" />
            <div className="space-y-3 px-4 pb-4">
              {claimRows.length === 0 && markerRows.length === 0 && (
                <p className="rounded-lg border border-dashed border-line bg-cream px-3 py-3 text-[12.5px] leading-relaxed text-ink-4">
                  Claims and rhetorical markers will appear here as Yentl finds checkable moments.
                </p>
              )}
              {claimRows.map((claim) => (
                <article key={claim.id} className="rounded-lg border border-line bg-cream px-3 py-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-blue-600">
                    <span>{claim.primary_label.replaceAll("_", " ")}</span>
                    <span>{claim.score}/100</span>
                  </div>
                  <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-2">
                    {claim.claim_text}
                  </p>
                </article>
              ))}
              {markerRows.map((marker) => (
                <article key={marker.id} className="rounded-lg border border-line bg-cream px-3 py-3">
                  <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-amber-800">
                    {marker.display}
                  </div>
                  <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-2">
                    {marker.excerpt}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <Link
            href="/session"
            target="_blank"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper px-3 py-3 text-[13px] font-semibold text-ink-2 shadow-sm hover:bg-cream-2"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Open full workspace
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-cream px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold leading-none text-ink">
        {value}
      </div>
    </div>
  );
}

function PanelHeader({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4">
      {icon}
      {label}
    </div>
  );
}
