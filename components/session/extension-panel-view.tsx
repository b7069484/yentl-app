"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Captions,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Radio,
  RefreshCw,
  Square,
} from "lucide-react";
import {
  checkBrowserTabCaptureStatus,
  stopBrowserTabCapture,
} from "@/components/session/ExtensionBridge";
import { useSession, type BrowserTabCaptureStatus } from "@/lib/client/session-store";
import type { DevilAdvocateBrief, DevilAdvocateState } from "@/lib/client/session-store";
import { exportSession } from "@/lib/client/export-actions";
import { saveSession } from "@/lib/client/session-storage";
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

function displayVerdict(label: ClaimCard["primary_label"]) {
  return label.replaceAll("_", " ");
}

function verdictTone(label: ClaimCard["primary_label"]) {
  if (label === "FALSE" || label === "MISLEADING" || label === "OMISSION") {
    return "border-red-soft bg-red-soft/45 text-red";
  }
  if (label === "PARTIAL" || label === "UNVERIFIABLE") {
    return "border-amber/35 bg-amber-50 text-amber-900";
  }
  if (label === "TRUE" || label === "MOSTLY_TRUE") {
    return "border-green/20 bg-green-soft text-green";
  }
  return "border-line bg-cream text-ink-3";
}

function severityTone(severity: RhetoricMarker["severity"]) {
  if (severity === "blatant") return "border-red-soft bg-red-soft/45 text-red";
  if (severity === "clear") return "border-amber/35 bg-amber-50 text-amber-900";
  return "border-line bg-cream text-ink-3";
}

function claimInsight(claims: ClaimCard[]) {
  const visible = claims.filter((claim) => claim.status !== "checking");
  const falseOrMisleading = visible.filter((claim) =>
    claim.primary_label === "FALSE" ||
    claim.primary_label === "MISLEADING" ||
    claim.primary_label === "OMISSION",
  );
  const unresolved = visible.filter((claim) =>
    claim.primary_label === "UNVERIFIABLE" || claim.primary_label === "PARTIAL",
  );

  if (visible.length === 0) {
    return {
      headline: "No claims yet",
      detail: "Yentl has not extracted a checkable claim from this page or audio yet.",
      tone: "border-line bg-cream text-ink-3",
    };
  }

  if (falseOrMisleading.length > 0) {
    return {
      headline: `${visible.length} claims · ${falseOrMisleading.length} false/misleading`,
      detail: "Review these first. They are the highest-risk factual moments in this panel.",
      tone: "border-red-soft bg-red-soft/45 text-red",
    };
  }

  if (unresolved.length > 0) {
    return {
      headline: `${visible.length} claims · ${unresolved.length} need evidence`,
      detail: "These are checkable, but Yentl needs stronger source support before calling them.",
      tone: "border-amber/35 bg-amber-50 text-amber-900",
    };
  }

  return {
    headline: `${visible.length} claims checked`,
    detail: "No false or misleading claim has been surfaced yet.",
    tone: "border-green/20 bg-green-soft text-green",
  };
}

function markerInsight(markers: RhetoricMarker[]) {
  const strong = markers.filter((marker) => marker.severity === "clear" || marker.severity === "blatant");

  if (markers.length === 0) {
    return {
      headline: "No markers yet",
      detail: "Rhetorical markers will appear when Yentl detects fallacies, bias, or loaded phrasing.",
      tone: "border-line bg-cream text-ink-3",
    };
  }

  return {
    headline: `${markers.length} markers · ${strong.length} clear/blatant`,
    detail: "Open the marker details below for the phrase, pattern, and why it matters.",
    tone: strong.length > 0
      ? "border-amber/35 bg-amber-50 text-amber-900"
      : "border-line bg-cream text-ink-3",
  };
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
    const demoStatus = {
      phase: "transcribing",
      title: source.title,
      url: source.url,
      message:
        "Preview mode: showing the transcript, claims, and markers the extension panel should display during a live run.",
      updatedAt: Date.now(),
    } as const;

    state.setBrowserTabStatus(demoStatus);
    const demoStatusTimer = window.setTimeout(() => {
      useSession.getState().setBrowserTabStatus({
        ...demoStatus,
        updatedAt: Date.now(),
      });
    }, 0);
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
    useSession.getState().setDevilAdvocate({
      state: "fresh",
      brief: VALIDATION_DEVIL_ADVOCATE,
      at: Date.now(),
    });

    return () => window.clearTimeout(demoStatusTimer);
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

const VALIDATION_DEVIL_ADVOCATE = {
  stance: "A skeptic would ask whether the budget increase claim is being framed before the source documents are visible.",
  strongest_counterarguments: [
    "A 12 percent increase may be accurate but incomplete without the base budget.",
    "Weekend hours and repairs are plausible uses, but the preview lacks a city source.",
    "Criticism about certainty may be fair rhetoric rather than a factual contradiction.",
  ],
  weakest_assumption: "The weakest assumption is that the preview transcript contains enough evidence to judge the budget claim.",
  questions: [
    "Where is the official budget document?",
    "Does the audit address the same fiscal year as the claim?",
  ],
  confidence: "medium" as const,
  model: "xai/grok-4.1-fast-reasoning",
} satisfies DevilAdvocateBrief;

export function ExtensionPanelView() {
  useValidationDemo();

  const [activeTab, setActiveTab] = useState<PanelTab>("transcript");
  const [workspaceState, setWorkspaceState] = useState<"idle" | "saving" | "error">("idle");
  const source = useSession((s) => s.source);
  const status = useSession((s) => s.browserTabStatus);
  const transcript = useSession((s) => s.transcript);
  const interim = useSession((s) => s.interim);
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const devilAdvocate = useSession((s) => s.devilAdvocate);
  const startedAt = useSession((s) => s.startedAt);
  const endedAt = useSession((s) => s.endedAt);

  const phase: Phase = endedAt ? "stopped" : status.phase;
  const meta = PHASE_META[phase] ?? PHASE_META.idle;
  const Icon = meta.icon;
  const transcriptRows = transcript.slice(-20).reverse();
  const claimRows = claims.filter((claim) => claim.status !== "checking").slice().reverse();
  const markerRows = markers.slice().reverse();
  const host = sourceHost(source, status);
  const claimSnapshot = claimInsight(claims);
  const markerSnapshot = markerInsight(markers);
  const transcriptTime = formatTime(transcriptDuration(transcript));
  const hasContent = transcript.length > 0 || claimRows.length > 0 || markerRows.length > 0;

  async function openFullWorkspace() {
    const popup = window.open("about:blank", "_blank");
    setWorkspaceState("saving");
    try {
      const session = useSession.getState().toSession();
      const meta = await saveSession(session, {
        name: session.title || sourceTitle(source, status),
      });
      const href = `${window.location.origin}/session?restore=${encodeURIComponent(meta.id)}&view=overview`;
      if (popup) {
        popup.location.href = href;
      } else {
        window.open(href, "_blank", "noopener,noreferrer");
      }
      setWorkspaceState("idle");
    } catch (error) {
      popup?.close();
      console.error("open full workspace failed", error);
      setWorkspaceState("error");
    }
  }

  function exportCurrent(kind: "report" | "markdown" | "json") {
    exportSession(useSession.getState().toSession(), kind);
  }

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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-3">
          <section className="rounded-lg border border-line bg-paper p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-[22px] leading-tight text-ink">
                  {meta.heading}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                  {status.message ?? meta.body}
                </p>
              </div>
            </div>
          </section>

          <div
            role="tablist"
            aria-label="Yentl panel views"
            className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-paper p-1 shadow-sm"
          >
            <PanelTabButton
              active={activeTab === "transcript"}
              label="Transcript"
              value={transcriptTime}
              onClick={() => setActiveTab("transcript")}
            />
            <PanelTabButton
              active={activeTab === "claims"}
              label="Claims"
              value={String(claimRows.length)}
              onClick={() => setActiveTab("claims")}
            />
            <PanelTabButton
              active={activeTab === "markers"}
              label="Markers"
              value={String(markerRows.length)}
              onClick={() => setActiveTab("markers")}
            />
          </div>

          {activeTab === "transcript" && (
            <section role="tabpanel" aria-label="Transcript" className="rounded-lg border border-line bg-paper shadow-sm">
              <div className="border-b border-line px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4">
                    <Captions className="h-4 w-4" aria-hidden />
                    Live transcript
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-900">Claim</span>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-900">Bias</span>
                    <span className="rounded-full bg-red-soft/55 px-2 py-0.5 text-red">Fallacy</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 px-4 pb-4 pt-3">
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
                  <TranscriptSegmentCard
                    key={`${segment.start}-${segment.end}-${segment.text}`}
                    segment={segment}
                    claims={claimRows}
                    markers={markerRows}
                  />
                ))}
              </div>
            </section>
          )}

          {activeTab === "claims" && (
            <section role="tabpanel" aria-label="Claims" className="space-y-3">
              <InsightPill
                label="Claim status"
                headline={claimSnapshot.headline}
                detail={claimSnapshot.detail}
                tone={claimSnapshot.tone}
              />

              <div className="rounded-lg border border-line bg-paper shadow-sm">
                <div className="border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4">
                  Claim checks
                </div>
                <div className="space-y-3 px-4 pb-4 pt-3">
                  {claimRows.length === 0 && (
                    <p className="rounded-lg border border-dashed border-line bg-cream px-3 py-3 text-[12.5px] leading-relaxed text-ink-4">
                      Yentl has not extracted a checkable claim from this page or audio yet.
                    </p>
                  )}
                  {claimRows.map((claim, index) => (
                    <ClaimCardItem key={claim.id} claim={claim} open={index === 0} />
                  ))}
                </div>
              </div>

              <DevilAdvocatePanel state={devilAdvocate} />
            </section>
          )}

          {activeTab === "markers" && (
            <section role="tabpanel" aria-label="Markers" className="space-y-3">
              <InsightPill
                label="Marker status"
                headline={markerSnapshot.headline}
                detail={markerSnapshot.detail}
                tone={markerSnapshot.tone}
              />

              <div className="rounded-lg border border-line bg-paper shadow-sm">
                <div className="border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4">
                  Markers
                </div>
                <div className="space-y-3 px-4 pb-4 pt-3">
                  {markerRows.length === 0 && (
                    <p className="rounded-lg border border-dashed border-line bg-cream px-3 py-3 text-[12.5px] leading-relaxed text-ink-4">
                      Rhetorical markers will appear when Yentl detects fallacies, bias, or loaded phrasing.
                    </p>
                  )}
                  {markerRows.map((marker, index) => (
                    <MarkerCardItem key={marker.id} marker={marker} open={index === 0} />
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-line bg-paper p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openFullWorkspace}
                disabled={!hasContent || workspaceState === "saving"}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-[12.5px] font-semibold text-ink-2 hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                {workspaceState === "saving" ? "Opening..." : "Full workspace"}
              </button>
              <button
                type="button"
                onClick={() => exportCurrent("report")}
                disabled={!hasContent}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-[12.5px] font-semibold text-ink-2 hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Report
              </button>
            </div>
            <details className="mt-2 rounded-lg border border-line bg-cream">
              <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-ink-2">
                Export files
              </summary>
              <div className="grid grid-cols-2 gap-2 border-t border-line p-2">
                <button
                  type="button"
                  onClick={() => exportCurrent("markdown")}
                  disabled={!hasContent}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => exportCurrent("json")}
                  disabled={!hasContent}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  JSON
                </button>
              </div>
            </details>
            {workspaceState === "error" && (
              <p className="mt-2 rounded-md border border-red-soft bg-red-soft/35 px-3 py-2 text-[12px] text-red">
                Could not open the saved workspace. Try the report export instead.
              </p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

type PanelTab = "transcript" | "claims" | "markers";

function PanelTabButton({
  active,
  label,
  value,
  onClick,
}: {
  active: boolean;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-w-0 rounded-md px-2 py-2 text-left transition ${
        active
          ? "bg-ink text-paper shadow-sm"
          : "bg-transparent text-ink-3 hover:bg-cream-2 hover:text-ink"
      }`}
    >
      <span className="block truncate text-[10px] font-bold uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="mt-0.5 block truncate font-mono text-[17px] leading-none">
        {value}
      </span>
    </button>
  );
}

function transcriptDuration(transcript: TranscriptSegment[]) {
  return transcript.reduce((max, segment) => Math.max(max, segment.end), 0);
}

function overlapsSegment(segment: TranscriptSegment, start: number, end: number) {
  return end >= segment.start && start <= segment.end;
}

type TranscriptAnnotation = {
  id: string;
  kind: "claim" | "bias" | "fallacy";
  label: string;
  detail: string;
  phrase: string;
  priority: number;
};

function annotationsForSegment(
  segment: TranscriptSegment,
  claims: ClaimCard[],
  markers: RhetoricMarker[],
): TranscriptAnnotation[] {
  const claimAnnotations = claims
    .filter((claim) => overlapsSegment(segment, claim.utterance_start, claim.utterance_end))
    .map((claim) => ({
      id: claim.id,
      kind: "claim" as const,
      label: displayVerdict(claim.primary_label),
      detail: `${displayVerdict(claim.primary_label)} · ${claim.score}/100 · ${claim.claim_text}`,
      phrase: claim.claim_text,
      priority: 1,
    }));

  const markerAnnotations = markers
    .filter((marker) => overlapsSegment(segment, marker.start_time, marker.end_time))
    .map((marker) => {
      const kind = marker.type === "fallacy" ? "fallacy" as const : "bias" as const;
      return {
        id: marker.id,
        kind,
        label: marker.display,
        detail: `${marker.display} · ${marker.severity}: ${marker.explanation || marker.excerpt}`,
        phrase: marker.excerpt,
        priority: kind === "fallacy" ? 3 : 2,
      };
    });

  return [...claimAnnotations, ...markerAnnotations];
}

function annotationTone(annotation: TranscriptAnnotation) {
  if (annotation.kind === "fallacy") return "border-red-soft bg-red-soft/60 text-red";
  if (annotation.kind === "bias") return "border-orange-300 bg-orange-100 text-orange-950";
  return "border-yellow-300 bg-yellow-100 text-yellow-950";
}

function findPhraseRange(text: string, phrase: string) {
  const cleanPhrase = phrase.trim().replace(/[.!?]+$/, "");
  if (!cleanPhrase) return null;
  const exact = text.toLowerCase().indexOf(cleanPhrase.toLowerCase());
  if (exact >= 0) return { start: exact, end: exact + cleanPhrase.length };

  const words = cleanPhrase.match(/[A-Za-z0-9'$%]+/g) ?? [];
  for (let length = Math.min(words.length, 7); length >= 3; length -= 1) {
    for (let startWord = 0; startWord <= words.length - length; startWord += 1) {
      const candidate = words.slice(startWord, startWord + length).join(" ");
      const index = text.toLowerCase().indexOf(candidate.toLowerCase());
      if (index >= 0) return { start: index, end: index + candidate.length };
    }
  }

  return null;
}

function highlightedTranscriptText(segment: TranscriptSegment, annotations: TranscriptAnnotation[]) {
  const text = segment.text;
  const ranges = annotations
    .map((annotation) => ({
      annotation,
      range: findPhraseRange(text, annotation.phrase) ?? { start: 0, end: text.length },
    }))
    .sort((a, b) => {
      if (a.range.start !== b.range.start) return a.range.start - b.range.start;
      return b.annotation.priority - a.annotation.priority;
    })
    .reduce<Array<{ annotation: TranscriptAnnotation; range: { start: number; end: number } }>>((kept, candidate) => {
      if (candidate.range.end <= candidate.range.start) return kept;
      const overlaps = kept.some((item) =>
        candidate.range.start < item.range.end && candidate.range.end > item.range.start,
      );
      if (!overlaps) kept.push(candidate);
      return kept;
    }, []);

  if (ranges.length === 0) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const item of ranges) {
    if (item.range.start > cursor) {
      parts.push(text.slice(cursor, item.range.start));
    }
    const highlighted = text.slice(item.range.start, item.range.end);
    parts.push(
      <span
        key={`${item.annotation.id}-${item.range.start}`}
        tabIndex={0}
        title={item.annotation.detail}
        className={`rounded border px-1 py-0.5 font-medium ${annotationTone(item.annotation)}`}
      >
        {highlighted}
      </span>,
    );
    cursor = item.range.end;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

function TranscriptSegmentCard({
  segment,
  claims,
  markers,
}: {
  segment: TranscriptSegment;
  claims: ClaimCard[];
  markers: RhetoricMarker[];
}) {
  const annotations = annotationsForSegment(segment, claims, markers);

  return (
    <article className="rounded-lg border border-line bg-cream px-3 py-3">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
        <span>{speakerName(segment)}</span>
        <span className="tabular-nums">{formatTime(segment.start)}</span>
      </div>
      <p className="text-[13.5px] leading-relaxed text-ink-2">
        {highlightedTranscriptText(segment, annotations)}
      </p>
      {annotations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {annotations.map((annotation) => (
            <span
              key={annotation.id}
              title={annotation.detail}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${annotationTone(annotation)}`}
            >
              {annotation.kind === "claim" ? "Claim" : annotation.kind} · {annotation.label}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function ClaimCardItem({ claim, open }: { claim: ClaimCard; open: boolean }) {
  return (
    <details open={open} className="rounded-lg border border-line bg-cream">
      <summary className="cursor-pointer px-3 py-3">
        <div className="inline-flex max-w-full flex-col gap-2 align-top">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${verdictTone(claim.primary_label)}`}>
              {displayVerdict(claim.primary_label)}
            </span>
            <span className="font-mono text-[10.5px] text-ink-4">
              {claim.score}/100 · {formatTime(claim.utterance_start)}
            </span>
          </div>
          <span className="text-left text-[13px] font-semibold leading-snug text-ink">
            {claim.claim_text}
          </span>
        </div>
      </summary>
      <div className="space-y-3 border-t border-line px-3 py-3 text-[12.5px] leading-relaxed text-ink-3">
        {claim.explanation && <p>{claim.explanation}</p>}
        {claim.sources.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-4">
              Sources
            </div>
            <ul className="space-y-1">
              {claim.sources.slice(0, 3).map((source) => (
                <li key={source.url} className="truncate">
                  {source.title || source.domain || source.url}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function MarkerCardItem({ marker, open }: { marker: RhetoricMarker; open: boolean }) {
  const isFallacy = marker.type === "fallacy";

  return (
    <details open={open} className="rounded-lg border border-line bg-cream">
      <summary className="cursor-pointer px-3 py-3">
        <div className="inline-flex max-w-full flex-col gap-2 align-top">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
              isFallacy ? "border-red-soft bg-red-soft/45 text-red" : severityTone(marker.severity)
            }`}
            >
              {isFallacy ? "fallacy" : marker.type} · {marker.severity}
            </span>
            <span className="font-mono text-[10.5px] text-ink-4">
              {formatTime(marker.start_time)}
            </span>
          </div>
          <span className="text-left text-[13px] font-semibold leading-snug text-ink">
            {marker.display}
          </span>
        </div>
      </summary>
      <div className="space-y-2 border-t border-line px-3 py-3 text-[12.5px] leading-relaxed text-ink-3">
        <p className="font-medium text-ink-2">
          &quot;{marker.excerpt}&quot;
        </p>
        {marker.explanation && <p>{marker.explanation}</p>}
      </div>
    </details>
  );
}

function DevilAdvocatePanel({ state }: { state: DevilAdvocateState }) {
  const brief = state && "brief" in state ? state.brief : null;
  const isLoading = state?.state === "warming" || state?.state === "refreshing";
  const isError = state?.state === "error";

  return (
    <section className="rounded-lg border border-line bg-paper p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Devil&apos;s advocate
        </div>
        {brief?.model && (
          <span className="rounded-full border border-line bg-cream px-2 py-0.5 font-mono text-[10px] text-ink-4">
            Grok
          </span>
        )}
      </div>

      {!brief && !isLoading && !isError && (
        <p className="rounded-lg border border-dashed border-line bg-cream px-3 py-3 text-[12.5px] leading-relaxed text-ink-4">
          Grok will stress-test the analysis once Yentl has a few transcript lines.
        </p>
      )}

      {isLoading && !brief && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-[12.5px] leading-relaxed text-blue-900">
          Asking Grok for the strongest opposing read.
        </p>
      )}

      {isError && !brief && (
        <p className="rounded-lg border border-red-soft bg-red-soft/35 px-3 py-3 text-[12.5px] leading-relaxed text-red">
          Grok Devil&apos;s Advocate is not available right now.
        </p>
      )}

      {brief && (
        <div className="space-y-3">
          <div className="rounded-lg border border-amber/35 bg-amber-50 px-3 py-3 text-amber-900">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] opacity-75">
              Challenge · {brief.confidence} confidence
            </div>
            <p className="text-[13px] font-semibold leading-relaxed">
              {brief.stance}
            </p>
            {isLoading && (
              <p className="mt-2 text-[11.5px] opacity-75">
                Refreshing this challenge as the transcript develops.
              </p>
            )}
          </div>

          <details className="rounded-lg border border-line bg-cream">
            <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-ink-2">
              Counterpoints and questions
            </summary>
            <div className="space-y-3 border-t border-line px-3 py-3 text-[12.5px] leading-relaxed text-ink-3">
              <ol className="list-decimal space-y-2 pl-4">
                {brief.strongest_counterarguments.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ol>
              <div className="rounded-lg border border-line bg-paper px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-4">
                  Weakest assumption
                </div>
                <p className="mt-1">{brief.weakest_assumption}</p>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-4">
                  Ask next
                </div>
                <ul className="list-disc space-y-1 pl-4">
                  {brief.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}

function InsightPill({
  label,
  headline,
  detail,
  tone,
}: {
  label: string;
  headline: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-3 ${tone}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-75">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-semibold leading-snug">
        {headline}
      </div>
      <div className="mt-1 text-[11.5px] leading-snug opacity-85">
        {detail}
      </div>
    </div>
  );
}
