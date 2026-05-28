"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  buildLiveSignalSummary,
  type SignalDatum,
} from "@/components/session/live-signal";
import {
  LiveMetricExpander,
  YentlLiveReadCard,
  type LiveReadSignal,
  type LiveSignalMetric,
} from "@/components/session/live-analysis-rail";
import { useSession, type BrowserTabCaptureStatus } from "@/lib/client/session-store";
import type { DevilAdvocateBrief, DevilAdvocateState } from "@/lib/client/session-store";
import { exportSession } from "@/lib/client/export-actions";
import { loadSession, saveSession, type SavedSessionMeta } from "@/lib/client/session-storage";
import { VERDICT } from "@/lib/client/verdict-theme";
import type { ClaimCard, RhetoricMarker, Session, SessionSource, TranscriptSegment } from "@/lib/types";

type Phase = BrowserTabCaptureStatus["phase"];
type PanelMetricKey = "pulse" | "claims" | "heat" | "evidence";

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
  tab_changed: {
    label: "Return to source",
    heading: "Return to the captured tab",
    body: "Yentl is still tied to the original tab. Return there to keep the source page and analysis together, or choose another source path.",
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
  return VERDICT[label].short;
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

type ExtensionReadSignal = LiveReadSignal;

const EXTENSION_READ_VISUALS: Record<
  ExtensionReadSignal["tone"],
  Pick<ExtensionReadSignal, "colorStops" | "background" | "overlay" | "amplitude" | "blend" | "speed">
> = {
  calm: {
    colorStops: ["#0f4c81", "#38bdf8", "#13315c"],
    background: "radial-gradient(circle at 12% 14%, rgba(56, 189, 248, 0.72), transparent 34%), linear-gradient(135deg, #07172d, #0f4c81 54%, #13294b)",
    overlay: "linear-gradient(135deg, rgba(10,20,45,.58), rgba(15,76,129,.18))",
    amplitude: 0.45,
    blend: 0.78,
    speed: 0.55,
  },
  productive: {
    colorStops: ["#14532d", "#22c55e", "#0f766e"],
    background: "radial-gradient(circle at 16% 16%, rgba(34,197,94,.78), transparent 34%), linear-gradient(135deg, #052e1a, #14532d 52%, #0f766e)",
    overlay: "linear-gradient(135deg, rgba(6,41,29,.52), rgba(21,128,61,.18))",
    amplitude: 0.66,
    blend: 0.66,
    speed: 0.72,
  },
  contentious: {
    colorStops: ["#7c2d12", "#f59e0b", "#ea580c"],
    background: "radial-gradient(circle at 18% 12%, rgba(245,158,11,.86), transparent 34%), radial-gradient(circle at 86% 20%, rgba(234,88,12,.72), transparent 38%), linear-gradient(135deg, #431407, #7c2d12 48%, #b45309)",
    overlay: "linear-gradient(135deg, rgba(67,30,12,.52), rgba(180,83,9,.2))",
    amplitude: 0.94,
    blend: 0.52,
    speed: 0.95,
  },
  misleading: {
    colorStops: ["#713f12", "#facc15", "#f97316"],
    background: "radial-gradient(circle at 14% 14%, rgba(250,204,21,.78), transparent 34%), radial-gradient(circle at 88% 22%, rgba(249,115,22,.58), transparent 38%), linear-gradient(135deg, #422006, #713f12 52%, #9a3412)",
    overlay: "linear-gradient(135deg, rgba(66,32,6,.56), rgba(234,179,8,.18))",
    amplitude: 0.88,
    blend: 0.54,
    speed: 0.9,
  },
  heated: {
    colorStops: ["#7f1d1d", "#ef4444", "#be123c"],
    background: "radial-gradient(circle at 18% 12%, rgba(239,68,68,.9), transparent 34%), radial-gradient(circle at 86% 18%, rgba(190,18,60,.78), transparent 38%), linear-gradient(135deg, #450a0a, #7f1d1d 50%, #9f1239)",
    overlay: "linear-gradient(135deg, rgba(55,7,21,.54), rgba(185,28,28,.22))",
    amplitude: 1.18,
    blend: 0.42,
    speed: 1.18,
  },
  mixed: {
    colorStops: ["#7f1d1d", "#f59e0b", "#2563eb"],
    background: "radial-gradient(circle at 16% 14%, rgba(239,68,68,.72), transparent 33%), radial-gradient(circle at 72% 12%, rgba(245,158,11,.66), transparent 33%), radial-gradient(circle at 88% 72%, rgba(37,99,235,.58), transparent 36%), linear-gradient(135deg, #2e1065, #7f1d1d 46%, #1e3a8a)",
    overlay: "linear-gradient(135deg, rgba(34,20,49,.56), rgba(127,29,29,.2))",
    amplitude: 1.04,
    blend: 0.48,
    speed: 1.05,
  },
};

function extensionReadSignal({
  meta,
  phase,
  sourceName,
  transcriptCount,
  claims,
  markers,
  message,
}: {
  meta: typeof PHASE_META[Phase];
  phase: Phase;
  sourceName: string;
  transcriptCount: number;
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  message?: string;
}): ExtensionReadSignal {
  const visibleClaims = claims.filter((claim) => claim.status !== "checking");
  const riskyClaims = visibleClaims.filter((claim) =>
    claim.primary_label === "FALSE" ||
    claim.primary_label === "MISLEADING" ||
    claim.primary_label === "OMISSION",
  );
  const strongMarkers = markers.filter((marker) => marker.severity === "clear" || marker.severity === "blatant");

  if (phase === "error") {
    return { tone: "heated", label: meta.label, headline: meta.heading, body: message ?? meta.body, ...EXTENSION_READ_VISUALS.heated };
  }
  if (riskyClaims.length > 0) {
    return {
      tone: "heated",
      label: "Claim surfaced",
      headline: "A high-risk claim needs the foreground.",
      body: `${riskyClaims.length} false, misleading, or omitted-context claim${riskyClaims.length === 1 ? "" : "s"} surfaced while ${sourceName} played.`,
      ...EXTENSION_READ_VISUALS.heated,
    };
  }
  if (strongMarkers.length > 0) {
    return {
      tone: "misleading",
      label: "Yellow flag",
      headline: "Yentl hears tricky framing.",
      body: `${strongMarkers.length} clear rhetoric marker${strongMarkers.length === 1 ? "" : "s"} detected. Watch for loaded phrasing before it becomes a factual shortcut.`,
      ...EXTENSION_READ_VISUALS.misleading,
    };
  }
  if (phase === "transcribing" || phase === "capturing") {
    return {
      tone: transcriptCount > 0 ? "mixed" : "productive",
      label: meta.label,
      headline: transcriptCount > 0 ? "Yentl is reading this page live." : meta.heading,
      body: transcriptCount > 0
        ? `${transcriptCount} transcript line${transcriptCount === 1 ? "" : "s"} captured. Claims, markers, and evidence checks will keep updating here.`
        : message ?? meta.body,
      ...(transcriptCount > 0 ? EXTENSION_READ_VISUALS.mixed : EXTENSION_READ_VISUALS.productive),
    };
  }
  if (phase === "extension_connected") {
    return { tone: "productive", label: meta.label, headline: meta.heading, body: message ?? meta.body, ...EXTENSION_READ_VISUALS.productive };
  }
  return { tone: "calm", label: meta.label, headline: meta.heading, body: message ?? meta.body, ...EXTENSION_READ_VISUALS.calm };
}

type PanelMetric = LiveSignalMetric<PanelMetricKey>;

function panelMetrics(summary: ReturnType<typeof buildLiveSignalSummary>): PanelMetric[] {
  return [
    {
      key: "pulse",
      label: "Pulse",
      value: summary.liveState.value,
      caption: summary.liveState.detail,
      detailTitle: `Pulse: ${summary.liveState.value}`,
      detailBody: "Pulse tracks the live capture state, speech arrival, pacing, and whether Yentl is actively hearing the source.",
      tooltip: "Live rhythm, capture state, and speech arrival.",
      tone: summary.liveState.tone,
    },
    {
      key: "claims",
      label: "Claims",
      value: summary.claimRisk.value,
      caption: summary.claimRisk.detail,
      detailTitle: `Claims: ${summary.claimRisk.value}`,
      detailBody: "Claims counts checkable assertions and whether any have become high-risk, incomplete, or source-backed.",
      tooltip: "Checkable assertions and factual risk.",
      tone: summary.claimRisk.tone,
    },
    {
      key: "heat",
      label: "Heat",
      value: summary.rhetoricHeat.value,
      caption: summary.rhetoricHeat.detail,
      detailTitle: `Heat: ${summary.rhetoricHeat.value}`,
      detailBody: "Heat tracks loaded phrasing, escalation, evasiveness, and misleading speech patterns.",
      tooltip: "Rhetorical pressure and misleading speech.",
      tone: summary.rhetoricHeat.tone,
    },
    {
      key: "evidence",
      label: "Evidence",
      value: summary.evidenceState.value,
      caption: summary.evidenceState.detail,
      detailTitle: `Evidence: ${summary.evidenceState.value}`,
      detailBody: "Evidence shows whether Yentl has source support or still needs a baseline, citation, date range, or document trail.",
      tooltip: "Source support and unresolved evidence needs.",
      tone: summary.evidenceState.tone,
    },
  ];
}

function mirrorSessionToPopupStorage(
  popup: Window,
  meta: SavedSessionMeta,
  session: Session,
): Promise<void> {
  let popupIndexedDb: IDBFactory | undefined;
  try {
    popupIndexedDb = popup.indexedDB;
  } catch {
    return Promise.resolve();
  }
  if (!popupIndexedDb) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const req = popupIndexedDb.open("yentl", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sessions")) {
        const store = db.createObjectStore("sessions", { keyPath: "id" });
        store.createIndex("saved_at", "saved_at", { unique: false });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("sessions", "readwrite");
      tx.objectStore("sessions").put({ ...meta, session });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}

function phaseSignal(phase: Phase, transcriptCount: number): SignalDatum {
  if (phase === "error") {
    return {
      label: "Live state",
      value: "Needs attention",
      detail: "Extension capture needs a retry.",
      tone: "red",
    };
  }

  if (phase === "no_audio_detected") {
    return {
      label: "Live state",
      value: "No speech yet",
      detail: "Connected, but no speech is arriving.",
      tone: "amber",
    };
  }

  if (phase === "idle" || phase === "waiting_for_extension") {
    return {
      label: "Live state",
      value: "Waiting",
      detail: "Waiting for same-page extension capture.",
      tone: "amber",
    };
  }

  if (phase === "stopped") {
    return {
      label: "Live state",
      value: "Stopped",
      detail: "Capture has ended.",
      tone: "neutral",
    };
  }

  if (phase === "transcribing") {
    return {
      label: "Live state",
      value: "Transcribing",
      detail: transcriptCount > 0
        ? `${transcriptCount} transcript line${transcriptCount === 1 ? "" : "s"} captured.`
        : "Speech is being converted into transcript lines.",
      tone: "green",
    };
  }

  return {
    label: "Live state",
    value: phase === "capturing" ? "Hearing" : "Connected",
    detail: transcriptCount > 0
      ? `${transcriptCount} transcript line${transcriptCount === 1 ? "" : "s"} captured.`
      : "Extension capture is attached to this page.",
    tone: "green",
  };
}

function useValidationDemo() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") !== "validation") return;
    if (!validationDemoEnabled()) return;

    let state = useSession.getState();
    const source = {
      kind: "browser_tab" as const,
      title: params.get("title") ?? "Fixture video",
      url: `${window.location.origin}/validation/extension-panel-preview.html`,
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

function validationDemoEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  if (process.env.NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  return process.env.NODE_ENV !== "production";
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
  const [expandedMetric, setExpandedMetric] = useState<PanelMetricKey | null>(null);
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
  const transcriptRows = transcript.slice(-20).reverse();
  const claimRows = claims.filter((claim) => claim.status !== "checking").slice().reverse();
  const markerRows = markers.slice().reverse();
  const claimSnapshot = claimInsight(claims);
  const markerSnapshot = markerInsight(markers);
  const hasContent = transcript.length > 0 || claimRows.length > 0 || markerRows.length > 0;
  const liveSignal = useMemo(
    () => phaseSignal(phase, transcript.length),
    [phase, transcript.length],
  );
  const signalSummary = useMemo(
    () => buildLiveSignalSummary({
      claims,
      markers,
      liveState: liveSignal,
    }),
    [claims, liveSignal, markers],
  );
  const readSignal = useMemo(
    () => extensionReadSignal({
      meta,
      phase,
      sourceName: sourceTitle(source, status),
      transcriptCount: transcript.length,
      claims,
      markers,
      message: status.message,
    }),
    [claims, markers, meta, phase, source, status, transcript.length],
  );
  const metrics = useMemo(() => panelMetrics(signalSummary), [signalSummary]);

  async function openFullWorkspace() {
    const popup = window.open("about:blank", "_blank");
    setWorkspaceState("saving");
    try {
      const session = useSession.getState().toSession();
      const meta = await saveSession(session, {
        name: session.title || sourceTitle(source, status),
      });
      await loadSession(meta.id);
      const href = `${window.location.origin}/session?restore=${encodeURIComponent(meta.id)}&view=overview`;
      if (popup) {
        await mirrorSessionToPopupStorage(popup, meta, session);
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
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-3">
          <ExtensionReadCard signal={readSignal} />

          <ExtensionMetricExpander
            metrics={metrics}
            expandedMetric={expandedMetric}
            onToggleMetric={(metric) => {
              setExpandedMetric((current) => (current === metric ? null : metric));
            }}
          />

          <div
            role="tablist"
            aria-label="Yentl panel views"
            className="grid grid-cols-2 gap-1.5 rounded-lg border border-line bg-paper p-1.5 shadow-sm"
          >
            <PanelTabButton
              active={activeTab === "transcript"}
              label="Transcript"
              onClick={() => setActiveTab("transcript")}
            />
            <PanelTabButton
              active={activeTab === "findings"}
              label="Findings"
              onClick={() => setActiveTab("findings")}
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

          {activeTab === "findings" && (
            <section role="tabpanel" aria-label="Findings" className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <InsightPill
                  label="Claim status"
                  headline={claimSnapshot.headline}
                  detail={claimSnapshot.detail}
                  tone={claimSnapshot.tone}
                />
                <InsightPill
                  label="Marker status"
                  headline={markerSnapshot.headline}
                  detail={markerSnapshot.detail}
                  tone={markerSnapshot.tone}
                />
              </div>

              <div className="rounded-lg border border-line bg-paper shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4">
                    Claim checks
                  </div>
                  <span className="rounded-full border border-line bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-3">
                    {claimRows.length}
                  </span>
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

              <div className="rounded-lg border border-line bg-paper shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-4">
                    Markers
                  </div>
                  <span className="rounded-full border border-line bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-3">
                    {markerRows.length}
                  </span>
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

              <DevilAdvocatePanel state={devilAdvocate} />
            </section>
          )}

        </div>
      </div>

      <section className="border-t border-line bg-paper/95 p-3 shadow-[0_-10px_30px_rgba(20,18,16,0.06)]">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={checkBrowserTabCaptureStatus}
            className="yentl-action-button inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-cream px-3 text-[12px] font-semibold text-ink-2 transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal-soft/70 active:translate-y-0 active:scale-[0.99]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Check
          </button>
          <button
            type="button"
            onClick={stopBrowserTabCapture}
            className="yentl-action-button inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-soft bg-red-soft/35 px-3 text-[12px] font-semibold text-red transition-all hover:-translate-y-0.5 hover:bg-red-soft/55 active:translate-y-0 active:scale-[0.99]"
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
            Stop
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={openFullWorkspace}
            disabled={!hasContent || workspaceState === "saving"}
            className="yentl-action-button inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-[12px] font-semibold text-ink-2 transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal-soft/70 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {workspaceState === "saving" ? "Saving..." : "Open snapshot"}
          </button>
          <button
            type="button"
            onClick={() => exportCurrent("report")}
            disabled={!hasContent}
            className="yentl-action-button inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-[12px] font-semibold text-ink-2 transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal-soft/70 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Report
          </button>
        </div>

        <details className="mt-2 rounded-md border border-line bg-cream">
          <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-ink-2">
            Export files
          </summary>
          <div className="grid grid-cols-2 gap-2 border-t border-line p-2">
            <button
              type="button"
              onClick={() => exportCurrent("markdown")}
              disabled={!hasContent}
              className="yentl-action-button inline-flex items-center justify-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 transition-all hover:-translate-y-0.5 hover:bg-cream-2 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Markdown
            </button>
            <button
              type="button"
              onClick={() => exportCurrent("json")}
              disabled={!hasContent}
              className="yentl-action-button inline-flex items-center justify-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 transition-all hover:-translate-y-0.5 hover:bg-cream-2 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              JSON
            </button>
          </div>
        </details>
        {workspaceState === "error" && (
          <p className="mt-2 rounded-md border border-red-soft bg-red-soft/35 px-3 py-2 text-[12px] text-red">
            Could not open the saved snapshot. Try the report export instead.
          </p>
        )}
      </section>
    </section>
  );
}

type PanelTab = "transcript" | "findings";

function ExtensionReadCard({ signal }: { signal: ExtensionReadSignal }) {
  return (
    <YentlLiveReadCard
      signal={signal}
      testId="extension-yentl-read"
    />
  );
}

function ExtensionMetricExpander({
  metrics,
  expandedMetric,
  onToggleMetric,
}: {
  metrics: PanelMetric[];
  expandedMetric: PanelMetricKey | null;
  onToggleMetric: (metric: PanelMetricKey) => void;
}) {
  return (
    <LiveMetricExpander
      metrics={metrics}
      expandedMetric={expandedMetric}
      onToggleMetric={onToggleMetric}
      testId="extension-metric-expander"
      className="mt-3"
    />
  );
}

function PanelTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`yentl-action-button min-h-9 min-w-0 rounded-md px-3 text-center text-[12px] font-bold transition-all ${
        active
          ? "bg-ink text-white shadow-sm"
          : "bg-cream text-ink-3 hover:bg-teal-soft hover:text-teal"
      }`}
    >
      {label}
    </button>
  );
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
