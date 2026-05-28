"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
} from "react";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MonitorPlay,
  Play,
  Radio,
  Save,
  StopCircle,
  Video,
} from "lucide-react";
import { SaveSessionDialog } from "@/components/session/SaveSessionDialog";
import {
  LiveMetricExpander,
  YentlLiveReadCard,
  type LiveReadSignal,
  type LiveReadTone,
  type LiveSignalMetric,
} from "@/components/session/live-analysis-rail";
import { useSession } from "@/lib/client/session-store";
import type { MediaAdapter } from "@/lib/client/media-adapter";
import { createYouTubeAdapter } from "@/lib/client/youtube-adapter";
import { openDeepgramStream } from "@/lib/client/deepgram-stream";
import {
  displayAudioCaptureMessage,
  startDisplayAudioCapture,
  type DisplayAudioCaptureHandle,
} from "@/lib/client/display-audio-capture";
import { onFinalUtterance, runSynthesisNow } from "@/lib/client/orchestrator";
import { friendlyApiErrorMessage } from "@/lib/client/api-errors";
import { sourceAnalysisConsentHeaders } from "@/lib/source-consent";
import type { TranscriptSegment } from "@/lib/types";

/**
 * Lightweight client-side YouTube URL check.
 * The server remains canonical; this only gives instant player feedback.
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
      const match = pathname.match(/^\/(embed|shorts)\/([^/?#]+)/);
      if (match) return match[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type SpeakerLabel = {
  id: number;
  name: string;
};

type TranscriptTurn = {
  key: string;
  speakerId: number;
  speakerName: string;
  start: number;
  end: number;
  text: string;
};

function cleanSpeakerName(value: string | null | undefined): string | null {
  const cleaned = (value ?? "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(Network|Channel|Show|Podcast|Official)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:|,\-]+|[\s:|,\-]+$/g, "")
    .trim();
  return cleaned.length > 1 ? cleaned : null;
}

function expandHostName(name: string, channel: string | null | undefined): string {
  const cleanedName = cleanSpeakerName(name) ?? "Speaker 1";
  const cleanedChannel = cleanSpeakerName(channel);
  if (!cleanedChannel) return cleanedName;
  const nameParts = cleanedName.split(/\s+/);
  const channelParts = cleanedChannel.split(/\s+/);
  if (
    nameParts.length === 1 &&
    channelParts.length >= 2 &&
    channelParts[0]?.toLowerCase() === nameParts[0]?.toLowerCase()
  ) {
    return `${channelParts[0]} ${channelParts[1]}`;
  }
  return cleanedName;
}

function deriveSpeakerLabels(title: string, channel: string): SpeakerLabel[] {
  const debateMatch = title.match(
    /^(.+?)\s+(?:debates?|interviews?|talks\s+to|speaks\s+with|with|vs\.?|versus)\s+(.+?)(?:\s+(?:in|on|over|about|after|before)\b|[:|-]|$)/i,
  );

  if (debateMatch?.[1] && debateMatch[2]) {
    const first = expandHostName(debateMatch[1], channel);
    const second = cleanSpeakerName(debateMatch[2]) ?? "Speaker 2";
    if (first.toLowerCase() !== second.toLowerCase()) {
      return [
        { id: 0, name: first },
        { id: 1, name: second },
      ];
    }
  }

  const channelSpeaker = cleanSpeakerName(channel);
  return [
    { id: 0, name: channelSpeaker ?? "Speaker 1" },
    { id: 1, name: "Speaker 2" },
  ];
}

function speakerNameFor(labels: SpeakerLabel[], speakerId: number): string {
  return labels.find((label) => label.id === speakerId)?.name ?? `Speaker ${speakerId + 1}`;
}

function stripCaptionCue(text: string): { text: string; hadCue: boolean } {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const cleaned = trimmed.replace(/^(?:>{1,2}|[-–—])\s*/, "").trim();
  return { text: cleaned, hadCue: cleaned !== trimmed };
}

function inferCaptionSpeakerId(text: string, previousSpeakerId: number, hadCue: boolean): number {
  const lower = text.toLowerCase();
  const looksLikeQuestioner =
    /^(let me ask|why would|but why|why should|getting tax breaks|anyone who starts|course they do|of course they do|would taxpayers|what you're saying)/.test(lower);
  const looksLikeResponder =
    /^(well|they don't|no problem|i can|i have to|that's just|the investors|my job|but here's why|everybody)/.test(lower);

  if (looksLikeQuestioner) return 0;
  if (looksLikeResponder) return 1;
  if (hadCue) return previousSpeakerId === 0 ? 1 : 0;
  return previousSpeakerId;
}

function findMidCaptionSpeakerPivot(text: string, speakerId: number): { index: number; nextSpeakerId: number } | null {
  const questionerPhrases = [
    /\bbut why\b/i,
    /\bwhy should\b/i,
    /\bof course they do\b/i,
    /\bcourse they do\b/i,
    /\banyone who starts\b/i,
    /\bgetting tax breaks\b/i,
  ];
  const responderPhrases = [
    /\bwell,?\s+everybody\b/i,
    /\bno problem\b/i,
    /\bthey don't\b/i,
    /\bi have to\b/i,
  ];
  const patterns = speakerId === 1 ? questionerPhrases : responderPhrases;

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.index && match.index > 10) {
      return { index: match.index, nextSpeakerId: speakerId === 1 ? 0 : 1 };
    }
  }

  return null;
}

function splitMixedCaptionSegment(
  segment: TranscriptSegment,
  speakerId: number,
  text: string,
): TranscriptSegment[] {
  const pivot = findMidCaptionSpeakerPivot(text, speakerId);
  if (!pivot) return [{ ...segment, text, speaker_id: speakerId, is_final: true }];

  const firstText = text.slice(0, pivot.index).trim();
  const secondText = text.slice(pivot.index).trim();
  if (!firstText || !secondText) {
    return [{ ...segment, text, speaker_id: speakerId, is_final: true }];
  }

  const duration = Math.max(0.2, segment.end - segment.start);
  const pivotRatio = Math.min(0.85, Math.max(0.15, pivot.index / text.length));
  const pivotTime = segment.start + duration * pivotRatio;

  return [
    {
      ...segment,
      text: firstText,
      end: pivotTime,
      speaker_id: speakerId,
      is_final: true,
    },
    {
      ...segment,
      text: secondText,
      start: pivotTime,
      speaker_id: pivot.nextSpeakerId,
      is_final: true,
    },
  ];
}

function buildTranscriptTurns(segments: TranscriptSegment[], speakerLabels: SpeakerLabel[]): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];

  for (const segment of segments) {
    const { text } = stripCaptionCue(segment.text);
    if (!text) continue;

    const speakerId = typeof segment.speaker_id === "number" ? segment.speaker_id : 0;
    const last = turns.at(-1);
    if (last && last.speakerId === speakerId && segment.start - last.end < 8) {
      last.end = Math.max(last.end, segment.end);
      last.text = `${last.text} ${text}`.replace(/\s+/g, " ").trim();
      continue;
    }

    turns.push({
      key: `${segment.start}:${segment.end}:${speakerId}`,
      speakerId,
      speakerName: speakerNameFor(speakerLabels, speakerId),
      start: segment.start,
      end: segment.end,
      text,
    });
  }

  return turns;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "launching" }
  | { kind: "armed"; total: number }
  | { kind: "live"; released: number; total: number }
  | { kind: "error"; code: string; message: string };

type TabAudioCaptureState =
  | { kind: "idle" }
  | { kind: "starting"; message: string }
  | { kind: "capturing"; startedAt: number }
  | { kind: "error"; message: string };

type DeepgramLiveStream = Awaited<ReturnType<typeof openDeepgramStream>>;

type PreviewState =
  | { kind: "idle" }
  | { kind: "loading"; videoId: string }
  | { kind: "ready"; data: YoutubePreviewResponse }
  | { kind: "error"; videoId: string; message: string };

interface YoutubePreviewResponse {
  video_id: string;
  url: string;
  title: string | null;
  channel: string | null;
  thumbnail_url: string;
  thumbnail_source: "youtube-oembed" | "youtube-static";
  caption_precheck: "checked-on-fetch";
  error?: { code: string; message: string };
}

interface YoutubeIngestResponse {
  video_id?: string;
  url?: string;
  title?: string;
  channel?: string;
  thumbnail_url?: string;
  transcript_segments?: TranscriptSegment[];
  error?: { code: string; message: string };
}

function youtubePreviewForVideo(preview: PreviewState, videoId: string | null): PreviewState {
  if (!videoId) return { kind: "idle" };
  if (preview.kind === "loading" && preview.videoId === videoId) return preview;
  if (preview.kind === "error" && preview.videoId === videoId) return preview;
  if (preview.kind === "ready" && preview.data.video_id === videoId) return preview;
  return { kind: "idle" };
}

function stopDisplayAudioHandles(
  displayCaptureRef: { current: DisplayAudioCaptureHandle | null },
  deepgramRef: { current: DeepgramLiveStream | null },
) {
  try { displayCaptureRef.current?.stop(); } catch { /* noop */ }
  try { deepgramRef.current?.close(); } catch { /* noop */ }
  displayCaptureRef.current = null;
  deepgramRef.current = null;
}

type MetricKey = "pulse" | "claims" | "heat" | "evidence";
type RailFocus = "transcript" | "findings";

type SignalMetric = LiveSignalMetric<MetricKey>;
type YentlReadSignal = LiveReadSignal;
type YentlReadTone = LiveReadTone;

const READ_TONE_VISUALS: Record<
  YentlReadTone,
  Pick<YentlReadSignal, "colorStops" | "amplitude" | "blend" | "speed" | "background" | "overlay" | "levels">
> = {
  calm: {
    colorStops: ["#0f4c81", "#38bdf8", "#13315c"],
    amplitude: 0.45,
    blend: 0.78,
    speed: 0.55,
    background: "radial-gradient(circle at 18% 12%, rgba(56, 189, 248, 0.72), transparent 34%), radial-gradient(circle at 88% 18%, rgba(37, 99, 235, 0.52), transparent 36%), linear-gradient(135deg, #07172d, #0f4c81 54%, #13294b)",
    overlay: "linear-gradient(135deg, rgba(10, 20, 45, 0.54), rgba(15, 76, 129, 0.18))",
    levels: [0.3, 0.4, 0.22, 0.18],
  },
  productive: {
    colorStops: ["#14532d", "#22c55e", "#0f766e"],
    amplitude: 0.66,
    blend: 0.66,
    speed: 0.72,
    background: "radial-gradient(circle at 16% 16%, rgba(34, 197, 94, 0.78), transparent 34%), radial-gradient(circle at 86% 22%, rgba(20, 184, 166, 0.58), transparent 36%), linear-gradient(135deg, #052e1a, #14532d 52%, #0f766e)",
    overlay: "linear-gradient(135deg, rgba(6, 41, 29, 0.52), rgba(21, 128, 61, 0.18))",
    levels: [0.42, 0.78, 0.32, 0.24],
  },
  contentious: {
    colorStops: ["#7c2d12", "#f59e0b", "#ea580c"],
    amplitude: 0.94,
    blend: 0.52,
    speed: 0.95,
    background: "radial-gradient(circle at 18% 12%, rgba(245, 158, 11, 0.86), transparent 34%), radial-gradient(circle at 86% 20%, rgba(234, 88, 12, 0.72), transparent 38%), linear-gradient(135deg, #431407, #7c2d12 48%, #b45309)",
    overlay: "linear-gradient(135deg, rgba(67, 30, 12, 0.52), rgba(180, 83, 9, 0.2))",
    levels: [0.46, 0.44, 0.82, 0.34],
  },
  misleading: {
    colorStops: ["#713f12", "#facc15", "#f97316"],
    amplitude: 0.88,
    blend: 0.54,
    speed: 0.9,
    background: "radial-gradient(circle at 14% 14%, rgba(250, 204, 21, 0.78), transparent 34%), radial-gradient(circle at 88% 22%, rgba(249, 115, 22, 0.58), transparent 38%), linear-gradient(135deg, #422006, #713f12 52%, #9a3412)",
    overlay: "linear-gradient(135deg, rgba(66, 32, 6, 0.56), rgba(234, 179, 8, 0.18))",
    levels: [0.36, 0.44, 0.86, 0.5],
  },
  heated: {
    colorStops: ["#7f1d1d", "#ef4444", "#be123c"],
    amplitude: 1.18,
    blend: 0.42,
    speed: 1.18,
    background: "radial-gradient(circle at 18% 12%, rgba(239, 68, 68, 0.9), transparent 34%), radial-gradient(circle at 86% 18%, rgba(190, 18, 60, 0.78), transparent 38%), linear-gradient(135deg, #450a0a, #7f1d1d 50%, #9f1239)",
    overlay: "linear-gradient(135deg, rgba(55, 7, 21, 0.54), rgba(185, 28, 28, 0.22))",
    levels: [0.6, 0.36, 0.54, 0.92],
  },
  mixed: {
    colorStops: ["#7f1d1d", "#f59e0b", "#2563eb"],
    amplitude: 1.04,
    blend: 0.48,
    speed: 1.05,
    background: "radial-gradient(circle at 16% 14%, rgba(239, 68, 68, 0.72), transparent 33%), radial-gradient(circle at 72% 12%, rgba(245, 158, 11, 0.66), transparent 33%), radial-gradient(circle at 88% 72%, rgba(37, 99, 235, 0.58), transparent 36%), linear-gradient(135deg, #2e1065, #7f1d1d 46%, #1e3a8a)",
    overlay: "linear-gradient(135deg, rgba(34, 20, 49, 0.56), rgba(127, 29, 29, 0.2))",
    levels: [0.64, 0.52, 0.78, 0.74],
  },
};

function createReadSignal(
  tone: YentlReadTone,
  copy: Pick<YentlReadSignal, "label" | "headline" | "body">,
): YentlReadSignal {
  return { tone, ...READ_TONE_VISUALS[tone], ...copy };
}

function getYentlReadSignal({
  phase,
  noCaptions,
  isTabAudioStarting,
  isTabAudioCapturing,
  hasTabAudioText,
  captionTranscriptCount,
  captionTotal,
  playerReady,
  playbackAttention,
  videoId,
}: {
  phase: Phase;
  noCaptions: boolean;
  isTabAudioStarting: boolean;
  isTabAudioCapturing: boolean;
  hasTabAudioText: boolean;
  captionTranscriptCount: number;
  captionTotal: number;
  playerReady: boolean;
  playbackAttention: boolean;
  videoId: string | null;
}): YentlReadSignal {
  if (phase.kind === "error" && !noCaptions) {
    return createReadSignal("heated", {
      label: "Needs attention",
      headline: "The analysis path hit friction.",
      body: "Yentl can keep the video visible, but this source needs a recovery path before reliable live analysis can continue.",
    });
  }

  if (isTabAudioCapturing && hasTabAudioText) {
    return createReadSignal("mixed", {
      label: "Live listening",
      headline: "Yentl is hearing the video now.",
      body: "Transcript lines are landing against the current playhead. Claims and rhetoric cues can escalate as stronger moments arrive.",
    });
  }

  if (phase.kind === "live" && captionTranscriptCount > 0) {
    return createReadSignal("mixed", {
      label: "Live synced",
      headline: "Yentl is reading with the video.",
      body: `${captionTranscriptCount} timed caption line${captionTranscriptCount === 1 ? "" : "s"} have landed against the current playhead. Claims and rhetoric markers update as the video keeps moving.`,
    });
  }

  if (isTabAudioCapturing) {
    return createReadSignal("productive", {
      label: "Listening",
      headline: "The audio stream is open.",
      body: "Yentl is waiting for speech from the shared tab while the video keeps playing in the workspace.",
    });
  }

  if (playbackAttention) {
    return createReadSignal("contentious", {
      label: "Playback check",
      headline: "Captions are ready, but the player has not advanced.",
      body: "If this browser shows a black player or no play control, use the header fallback actions for tab audio or the Chrome extension. Yentl already has the timed caption track ready.",
    });
  }

  if (phase.kind === "armed") {
    return createReadSignal("productive", {
      label: "Captions armed",
      headline: "Press play when the YouTube controls are visible.",
      body: `${captionTotal} timed caption line${captionTotal === 1 ? "" : "s"} are ready. If the embedded player stays black in this browser, use tab audio or the Chrome extension without losing the transcript track.`,
    });
  }

  if (noCaptions || isTabAudioStarting) {
    return createReadSignal("contentious", {
      label: isTabAudioStarting ? "Audio handoff" : "Caption gap",
      headline: "The player stays here; Yentl needs the tab audio.",
      body: "Public captions are not enough for this video. Share this tab's audio and Yentl will transcribe the playing video directly on the same screen.",
    });
  }

  if (phase.kind === "launching") {
    return createReadSignal("productive", {
      label: "Captions armed",
      headline: "Transcript timing is syncing to the player.",
      body: "Yentl has timed captions and is preparing this workspace so transcript, claims, and markers release with playback.",
    });
  }

  if (phase.kind === "checking") {
    return createReadSignal("contentious", {
      label: "Checking source",
      headline: "Yentl is testing the fastest transcript path.",
      body: "If public captions are available, they become the live clock. If they are not, the same screen can switch into tab-audio capture.",
    });
  }

  if (videoId && playerReady) {
    return createReadSignal("productive", {
      label: "Embed loaded",
      headline: "The video frame has loaded. Start analysis when you are ready.",
      body: "Yentl will try timed captions first. If this browser does not paint the YouTube controls, the Chrome and tab-audio fallbacks stay close.",
    });
  }

  if (videoId) {
    return createReadSignal("calm", {
      label: "Player loading",
      headline: "The video space is coming alive.",
      body: "Once the player is ready, one Start analysis action checks captions and opens the best live-analysis path.",
    });
  }

  return createReadSignal("calm", {
    label: "Paste URL",
    headline: "Bring the video in first.",
    body: "Paste a YouTube link. The player will occupy the left side and Yentl's live read will take over this rail.",
  });
}

function buildSignalMetrics({
  phase,
  playerReady,
  transcriptLines,
  claimsCount,
  markersCount,
  tabAudioCapture,
}: {
  phase: Phase;
  playerReady: boolean;
  transcriptLines: TranscriptSegment[];
  claimsCount: number;
  markersCount: number;
  tabAudioCapture: TabAudioCaptureState;
}): SignalMetric[] {
  const isLive = phase.kind === "live" || tabAudioCapture.kind === "capturing";
  const transcriptCount = transcriptLines.length;
  const heatRising = markersCount > 0 || claimsCount > 0 || isLive;
  const evidenceQueued = claimsCount > 0 || transcriptCount > 0;

  return [
    {
      key: "pulse",
      label: "Pulse",
      value: isLive ? "Hearing" : playerReady ? "Ready" : "Quiet",
      caption: isLive ? "pace + overlap" : playerReady ? "player loaded" : "waiting",
      tone: isLive ? "blue" : "neutral",
      detailTitle: isLive ? "Pulse: active but controlled" : "Pulse: waiting for the first live turn",
      detailBody: isLive
        ? "Yentl is tracking pace, interruptions, and speaker turn shape against the video clock."
        : "The player is ready to become the timing anchor once playback and analysis begin.",
      examples: isLive ? ["pace rising", "overlap watched", "turns grouped"] : ["clock idle", "no speech yet"],
      tooltip:
        "Pulse is Yentl's live read of rhythm: pace, turn-taking, interruptions, and whether the exchange is accelerating or settling.",
    },
    {
      key: "claims",
      label: "Claims",
      value: claimsCount > 0 ? `${claimsCount} open` : "0 open",
      caption: claimsCount > 0 ? "assertions" : "none yet",
      tone: claimsCount > 0 ? "amber" : "neutral",
      detailTitle: claimsCount > 0 ? `Claims: ${claimsCount} unresolved assertion${claimsCount === 1 ? "" : "s"}` : "Claims: no checkable assertion yet",
      detailBody: claimsCount > 0
        ? "Yentl has surfaced checkable statements that need a baseline, source, or contextual qualifier before they become findings."
        : "The live transcript has not produced a concrete factual assertion that needs evidence yet.",
      examples: claimsCount > 0 ? ["baseline missing", "source needed", "context pending"] : ["listening", "no claim surfaced"],
      tooltip:
        "Claims counts checkable assertions that may need evidence, context, or source comparison.",
    },
    {
      key: "heat",
      label: "Heat",
      value: heatRising ? "Rising" : "Calm",
      caption: heatRising ? "contention" : "low pressure",
      tone: heatRising ? "red" : "blue",
      detailTitle: heatRising ? "Heat: pressure is building" : "Heat: calm, low-friction exchange",
      detailBody: heatRising
        ? "Yentl is watching for accusation, loaded phrasing, escalation, and sneaky or misleading framing before it hardens into a verdict."
        : "The exchange is not showing much rhetorical pressure yet; Yentl is keeping the read steady.",
      examples: heatRising ? ["loaded phrasing", "misleading yellow", "red-orange mix"] : ["calm phrasing", "low escalation"],
      tooltip:
        "Heat tracks rhetorical temperature: accusation, pressure, evasiveness, escalation, and misleading speech.",
    },
    {
      key: "evidence",
      label: "Evidence",
      value: evidenceQueued ? "Queued" : "Waiting",
      caption: evidenceQueued ? "source trail" : "no anchor",
      tone: evidenceQueued ? "green" : "neutral",
      detailTitle: evidenceQueued ? "Evidence: waiting for the right anchor" : "Evidence: no source trail needed yet",
      detailBody: evidenceQueued
        ? "Yentl is looking for the missing comparison point, document, date range, or citation that can resolve the current claim."
        : "No evidence lane is active until the transcript gives Yentl a claim with enough shape to check.",
      examples: evidenceQueued ? ["baseline year", "source trail", "verdict pending"] : ["no claim", "no source needed"],
      tooltip:
        "Evidence shows whether Yentl has enough source support to resolve the live claim or needs a missing baseline, citation, or document.",
    },
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function YoutubeIngestPane({
  initialUrlOverride,
}: {
  initialUrlOverride?: string;
} = {}) {
  const reset = useSession((s) => s.reset);
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setRecording = useSession((s) => s.setRecording);
  const setSource = useSession((s) => s.setSource);
  const setInterim = useSession((s) => s.setInterim);
  const appendFinal = useSession((s) => s.appendFinal);
  const setBrowserTabStatus = useSession((s) => s.setBrowserTabStatus);
  const claimsCount = useSession((s) => s.claims.length);
  const markersCount = useSession((s) => s.markers.length);
  const sourceUrl = useSession((s) => (s.source.kind === "youtube" ? s.source.url : ""));
  const initialUrl = initialUrlOverride ?? sourceUrl;

  const [url, setUrl] = useState(initialUrl);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [preview, setPreview] = useState<PreviewState>({ kind: "idle" });
  const [playerReady, setPlayerReady] = useState(false);
  const [playbackAttention, setPlaybackAttention] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [tabAudioCapture, setTabAudioCapture] = useState<TabAudioCaptureState>({ kind: "idle" });
  const [tabAudioTranscript, setTabAudioTranscript] = useState<TranscriptSegment[]>([]);
  const [tabAudioInterim, setTabAudioInterim] = useState("");
  const [captionSegments, setCaptionSegments] = useState<TranscriptSegment[]>([]);
  const [captionTranscript, setCaptionTranscript] = useState<TranscriptSegment[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const handoffRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MediaAdapter | null>(null);
  const currentTimeRef = useRef(0);
  const captionSegmentsRef = useRef<TranscriptSegment[]>([]);
  const captionsArmedRef = useRef(false);
  const captionSpeakerRef = useRef(0);
  const nextCaptionIndexRef = useRef(0);
  const releasedCaptionKeysRef = useRef<Set<string>>(new Set());
  const captionSynthesisTimerRef = useRef<number | null>(null);
  const displayCaptureRef = useRef<DisplayAudioCaptureHandle | null>(null);
  const deepgramRef = useRef<DeepgramLiveStream | null>(null);

  useEffect(() => () => {
    if (!handoffRef.current) abortRef.current?.abort();
    if (captionSynthesisTimerRef.current !== null) {
      window.clearTimeout(captionSynthesisTimerRef.current);
      captionSynthesisTimerRef.current = null;
    }
    stopDisplayAudioHandles(displayCaptureRef, deepgramRef);
    adapterRef.current?.destroy();
    adapterRef.current = null;
  }, []);

  const trimmedUrl = url.trim();
  const videoId = parseYouTubeUrlClient(trimmedUrl);
  const isValidUrl = videoId !== null;
  const isTabAudioActive =
    tabAudioCapture.kind === "starting" || tabAudioCapture.kind === "capturing";
  const showFallbackActions =
    Boolean(videoId) &&
    (playbackAttention ||
      tabAudioCapture.kind !== "idle" ||
      (phase.kind === "error" && phase.code !== "INVALID_URL"));
  const captionsArmed = phase.kind === "armed" || phase.kind === "live";
  const isBusy = phase.kind === "checking" || phase.kind === "launching" || isTabAudioActive;
  const isStartDisabled = !isValidUrl || isBusy || captionsArmed;
  const activePreview = youtubePreviewForVideo(preview, videoId);
  const readyPreview = activePreview.kind === "ready" ? activePreview.data : null;
  const videoTitle = readyPreview?.title ?? (videoId ? "YouTube video" : "Paste a YouTube URL");
  const channel = readyPreview?.channel ?? "YouTube";
  const speakerLabels = useMemo(
    () => deriveSpeakerLabels(videoTitle, channel),
    [videoTitle, channel],
  );

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const clearCaptionRelease = useCallback(() => {
    captionsArmedRef.current = false;
    captionSegmentsRef.current = [];
    setCaptionSegments([]);
    setCaptionTranscript([]);
    captionSpeakerRef.current = 0;
    nextCaptionIndexRef.current = 0;
    releasedCaptionKeysRef.current.clear();
    if (captionSynthesisTimerRef.current !== null) {
      window.clearTimeout(captionSynthesisTimerRef.current);
      captionSynthesisTimerRef.current = null;
    }
  }, []);

  const releaseCaptionsAt = useCallback((time: number) => {
    const segments = captionSegmentsRef.current;
    if (!captionsArmedRef.current || segments.length === 0) return;
    if (time < 0.15 && nextCaptionIndexRef.current === 0) return;

    const releasable: TranscriptSegment[] = [];
    const releaseWindow = time + 0.35;

    while (nextCaptionIndexRef.current < segments.length) {
      const segment = segments[nextCaptionIndexRef.current];
      if (!segment || segment.start > releaseWindow) break;

      const key = `${segment.start}:${segment.end}:${segment.text}`;
      nextCaptionIndexRef.current += 1;
      if (releasedCaptionKeysRef.current.has(key)) continue;
      releasedCaptionKeysRef.current.add(key);
      const { text, hadCue } = stripCaptionCue(segment.text);
      const speakerId = inferCaptionSpeakerId(text, captionSpeakerRef.current, hadCue);
      const splitSegments = splitMixedCaptionSegment(segment, speakerId, text);
      captionSpeakerRef.current =
        splitSegments.at(-1)?.speaker_id ?? speakerId;
      releasable.push(...splitSegments);
    }

    if (releasable.length === 0) return;

    setCaptionTranscript((items) => [...items, ...releasable]);
    for (const segment of releasable) {
      appendFinal(segment);
      void onFinalUtterance(segment).catch((error) => {
        console.warn("YouTube caption analysis failed", error);
      });
    }

    const released = nextCaptionIndexRef.current;
    setPhase({ kind: "live", released, total: segments.length });

    if (captionSynthesisTimerRef.current === null) {
      captionSynthesisTimerRef.current = window.setTimeout(() => {
        captionSynthesisTimerRef.current = null;
        void runSynthesisNow().catch((error) => {
          console.warn("YouTube caption synthesis failed", error);
        });
      }, 4000);
    }
  }, [appendFinal]);

  useEffect(() => {
    if (!videoId) return;

    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreview({ kind: "loading", videoId });
      try {
        const res = await fetch(`/api/youtube-preview?url=${encodeURIComponent(trimmedUrl)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as YoutubePreviewResponse;
        if (ac.signal.aborted) return;
        if (!res.ok || data.error) {
          setPreview({
            kind: "error",
            videoId,
            message: data.error?.message ?? "Video identity could not be resolved.",
          });
          return;
        }
        setPreview({ kind: "ready", data });
      } catch (error) {
        if (ac.signal.aborted) return;
        setPreview({
          kind: "error",
          videoId,
          message: error instanceof Error ? error.message : "Video identity could not be resolved.",
        });
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [trimmedUrl, videoId]);

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container || !videoId) {
      setPlayerReady(false);
      setPlaybackAttention(false);
      setCurrentTime(0);
      return;
    }

    let cancelled = false;
    let localAdapter: MediaAdapter | null = null;
    const playerContainer = container;
    const resolvedVideoId = videoId;
    setPlayerReady(false);
    setPlaybackAttention(false);
    setCurrentTime(0);
    playerContainer.innerHTML = "";

    async function setupPlayer() {
      try {
        localAdapter = await createYouTubeAdapter({
          container: playerContainer,
          videoId: resolvedVideoId,
          onTimeUpdate: (time) => {
            if (!cancelled) {
              setCurrentTime(time);
              if (time > 0.5) setPlaybackAttention(false);
              releaseCaptionsAt(time);
            }
          },
          onReady: () => {
            if (!cancelled) setPlayerReady(true);
          },
        });

        if (cancelled) {
          localAdapter.destroy();
          return;
        }
        adapterRef.current = localAdapter;
      } catch (error) {
        if (!cancelled) {
          setPlayerReady(false);
          console.error("YouTube setup player failed", error);
        }
      }
    }

    void setupPlayer();

    return () => {
      cancelled = true;
      if (adapterRef.current === localAdapter) adapterRef.current = null;
      localAdapter?.destroy();
      playerContainer.innerHTML = "";
    };
  }, [releaseCaptionsAt, videoId]);

  useEffect(() => {
    if (!videoId || !playerReady || currentTime > 0.5 || phase.kind !== "armed") return;

    const timer = window.setTimeout(() => {
      if (currentTimeRef.current <= 0.5) setPlaybackAttention(true);
    }, 5500);

    return () => window.clearTimeout(timer);
  }, [currentTime, phase.kind, playerReady, videoId]);

  const handleStartLiveAnalysis = useCallback(async () => {
    if (isStartDisabled) return;

    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ kind: "checking" });
    clearCaptionRelease();

    try {
      const res = await fetch("/api/youtube-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...sourceAnalysisConsentHeaders(),
        },
        body: JSON.stringify({ url: trimmedUrl }),
        signal: ac.signal,
      });

      const data: YoutubeIngestResponse = await res.json();
      if (ac.signal.aborted) return;

      if (data.error) {
        setPhase({
          kind: "error",
          code: data.error.code,
          message: friendlyApiErrorMessage({
            status: res.status,
            code: data.error.code,
            message: data.error.message,
            retryAfterSec: res.headers?.get?.("Retry-After") ?? null,
          }),
        });
        return;
      }

      if (!data.video_id || !data.transcript_segments?.length) {
        setPhase({
          kind: "error",
          code: "NO_CAPTIONS",
          message: "No timed captions were returned for this YouTube video.",
        });
        return;
      }

      setPhase({ kind: "launching" });
      reset();
      setSource({
        kind: "youtube",
        video_id: data.video_id,
        url: trimmedUrl,
        ...(data.title ? { title: data.title } : {}),
        ...(data.channel ? { channel: data.channel } : {}),
      });
      setPrerecordStage("selected");
      setRecording(false);
      setTabAudioTranscript([]);
      setTabAudioInterim("");
      setInterim("");
      captionSegmentsRef.current = data.transcript_segments;
      captionsArmedRef.current = true;
      nextCaptionIndexRef.current = 0;
      releasedCaptionKeysRef.current.clear();
      setCaptionSegments(data.transcript_segments);
      setCaptionTranscript([]);
      setPhase({ kind: "armed", total: data.transcript_segments.length });
    } catch (error: unknown) {
      handoffRef.current = false;
      if ((error as Error).name === "AbortError") return;
      const message = error instanceof Error ? error.message : String(error);
      setPhase({ kind: "error", code: "NETWORK_ERROR", message });
    }
  }, [
    clearCaptionRelease,
    isStartDisabled,
    reset,
    setInterim,
    setRecording,
    setPrerecordStage,
    setSource,
    trimmedUrl,
  ]);

  const handleBack = useCallback(() => {
    abortRef.current?.abort();
    adapterRef.current?.destroy();
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const handleUrlChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    clearCaptionRelease();
    if (phase.kind === "error" || phase.kind === "armed" || phase.kind === "live" || phase.kind === "launching") {
      setPhase({ kind: "idle" });
    }
  }, [clearCaptionRelease, phase.kind]);

  const stopTabAudioCapture = useCallback(() => {
    stopDisplayAudioHandles(displayCaptureRef, deepgramRef);
    setTabAudioCapture({ kind: "idle" });
    setTabAudioInterim("");
    setInterim("");
    setBrowserTabStatus({
      phase: "stopped",
      message: "In-page YouTube tab-audio capture stopped.",
      updatedAt: Date.now(),
    });
  }, [setBrowserTabStatus, setInterim]);

  const startTabAudioCapture = useCallback(async () => {
    if (!videoId || tabAudioCapture.kind === "starting" || tabAudioCapture.kind === "capturing") return;

    stopDisplayAudioHandles(displayCaptureRef, deepgramRef);
    setTabAudioTranscript([]);
    setTabAudioInterim("");
    setTabAudioCapture({
      kind: "starting",
      message: "Choose this YouTube tab in Chrome and enable Share audio.",
    });
    setSource({
      kind: "youtube",
      video_id: videoId,
      url: trimmedUrl,
      ...(videoTitle ? { title: videoTitle } : {}),
      ...(channel ? { channel } : {}),
    });
    setBrowserTabStatus({
      phase: "capturing",
      title: videoTitle,
      url: trimmedUrl,
      message: "Using in-page tab-audio capture for this YouTube player.",
      updatedAt: Date.now(),
    });

    try {
      const pendingChunks: Blob[] = [];
      const capture = await startDisplayAudioCapture((chunk) => {
        const deepgram = deepgramRef.current;
        if (deepgram) {
          deepgram.send(chunk);
          return;
        }
        pendingChunks.push(chunk);
      });
      displayCaptureRef.current = capture;

      const deepgram = await openDeepgramStream({
        onInterim: (text) => {
          setTabAudioInterim(text);
          setInterim(text);
        },
        onFinal: (segment) => {
          const duration = Math.max(0.4, segment.end - segment.start);
          const playhead = Math.max(0, currentTimeRef.current);
          const aligned: TranscriptSegment = {
            ...segment,
            start: Math.max(0, playhead - duration),
            end: Math.max(playhead, Math.max(0, playhead - duration) + duration),
            is_final: true,
          };
          setTabAudioInterim("");
          setTabAudioTranscript((items) => [...items, aligned]);
          appendFinal(aligned);
          void onFinalUtterance(aligned).catch((error) => {
            console.warn("YouTube tab-audio analysis failed", error);
          });
        },
        onError: (error) => {
          const message = displayAudioCaptureMessage(error);
          setTabAudioCapture({ kind: "error", message });
          setBrowserTabStatus({
            phase: "error",
            title: videoTitle,
            url: trimmedUrl,
            message,
            updatedAt: Date.now(),
          });
        },
        onClose: () => {},
      });
      deepgramRef.current = deepgram;
      pendingChunks.splice(0).forEach((chunk) => deepgram.send(chunk));

      setTabAudioCapture({ kind: "capturing", startedAt: Date.now() });
      setBrowserTabStatus({
        phase: "transcribing",
        title: videoTitle,
        url: trimmedUrl,
        message: "Yentl is transcribing this YouTube tab audio in real time.",
        updatedAt: Date.now(),
      });
    } catch (error) {
      stopDisplayAudioHandles(displayCaptureRef, deepgramRef);
      const message = displayAudioCaptureMessage(error);
      setTabAudioCapture({ kind: "error", message });
      setBrowserTabStatus({
        phase: "error",
        title: videoTitle,
        url: trimmedUrl,
        message,
        updatedAt: Date.now(),
      });
    }
  }, [
    appendFinal,
    channel,
    setBrowserTabStatus,
    setInterim,
    setSource,
    tabAudioCapture.kind,
    trimmedUrl,
    videoId,
    videoTitle,
  ]);

  const switchToBrowserTab = useCallback(() => {
    abortRef.current?.abort();
    setSource({
      kind: "browser_tab",
      title: videoTitle,
      ...(trimmedUrl ? { url: trimmedUrl } : {}),
    });
    setPrerecordStage("selected");
  }, [setPrerecordStage, setSource, trimmedUrl, videoTitle]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-paper px-3 pb-5 pt-3 sm:px-5">
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to sources"
            className="yentl-action-button inline-flex min-h-9 w-auto items-center gap-1.5 justify-self-start rounded-md border border-line bg-cream px-3 text-[12px] font-medium text-ink-3 transition-all hover:-translate-y-0.5 hover:text-ink-2 active:translate-y-0 active:scale-[0.98]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Sources
          </button>

          <div className="min-w-0 sm:w-[min(44vw,520px)]">
            <label htmlFor="youtube-url" className="sr-only">
              YouTube URL
            </label>
            <div className="relative">
              <input
                id="youtube-url"
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="youtube.com/watch?v=..."
                disabled={isBusy}
                className="min-h-11 w-full rounded-full border border-ink-5 bg-paper py-2 pl-4 pr-32 text-[13px] text-ink shadow-sm placeholder:text-ink-4 focus:border-ink-3 focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="YouTube URL"
              />
              <button
                type="button"
                onClick={handleStartLiveAnalysis}
                disabled={isStartDisabled}
                aria-label={
                  phase.kind === "checking"
                    ? "Checking YouTube captions"
                    : phase.kind === "launching"
                      ? "Opening live analysis"
                      : phase.kind === "armed" || phase.kind === "live"
                        ? "Live analysis running"
                        : "Start live analysis"
                }
                className="yentl-action-button absolute right-1.5 top-1/2 inline-flex min-h-8 -translate-y-1/2 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-ink/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {phase.kind === "checking"
                  ? "Checking"
                  : phase.kind === "launching"
                    ? "Opening"
                    : phase.kind === "armed" || phase.kind === "live"
                      ? "Running"
                      : videoId
                        ? "Start"
                        : "Start"}
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {showFallbackActions && (
              <YoutubeHeaderFallbackActions
                videoId={videoId}
                tabAudioCapture={tabAudioCapture}
                onStartTabAudioCapture={startTabAudioCapture}
                onStopTabAudioCapture={stopTabAudioCapture}
                onBrowserTab={switchToBrowserTab}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            className="yentl-action-button hidden min-h-9 items-center gap-1.5 justify-self-end rounded-md border border-line bg-cream px-3 text-[12px] font-medium text-ink-2 transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal-soft/70 active:translate-y-0 active:scale-[0.98] sm:inline-flex"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            Save snapshot
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(390px,420px)]">
          <section className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-paper shadow-sm transition-opacity ${videoId ? "opacity-100" : "opacity-45"}`}>
            <div className="border-b border-line bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal-soft px-2 py-0.5 text-[10px] font-semibold text-teal sm:gap-2 sm:px-2.5 sm:py-1 sm:text-[10.5px]">
                    <Play className="h-3.5 w-3.5" aria-hidden />
                    Watch + live analysis
                  </div>
                  <UrlReadiness videoId={videoId} url={trimmedUrl} preview={activePreview} phase={phase} />
                </div>
                <h1 className={`mt-2 max-w-4xl font-serif text-[27px] font-medium leading-[1] tracking-normal text-ink sm:text-[44px] xl:text-[50px] ${videoId ? "hidden xl:block" : "block"}`}>
                  {videoId ? videoTitle : "Paste a YouTube link and watch here"}
                </h1>
                <p className={`mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-4 sm:mt-2 sm:text-[13px] ${videoId ? "hidden xl:block" : "block"}`}>
                  <span className="sm:hidden">Yentl&apos;s live read follows the player and stays synced to playback.</span>
                  <span className="hidden sm:inline">The video stays left. Yentl reads, transcribes, and flags moments on the right.</span>
                </p>
              </div>
            </div>

            <div className="bg-ink">
              <div
                className="aspect-video w-full"
                data-testid="youtube-player-shell"
              >
                {videoId ? (
                  <div
                    ref={playerContainerRef}
                    className="h-full w-full"
                    data-testid="youtube-live-player"
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-ink px-6 text-center text-white">
                    <div className="max-w-md">
                      <Video className="mx-auto mb-3 h-10 w-10 opacity-70" aria-hidden />
                      <div className="text-[16px] font-semibold">The video will play in this space</div>
                      <div className="mt-1 text-[12px] text-white/70">
                        Paste a link above. This area becomes the YouTube player, not a thumbnail.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper px-3 py-2 text-[12px] text-ink-3 sm:gap-3 sm:px-4 sm:py-3 xl:justify-between">
              <div className={`min-w-0 ${videoId ? "hidden xl:block" : "block"}`}>
                <div className="truncate text-[12.5px] font-semibold text-ink-2 sm:text-[13px]">{videoTitle}</div>
                <div className="truncate text-[11px] text-ink-4 sm:text-[11.5px]">
                  {videoId ? `${channel} · live transcript and analysis stay synced to playback` : "Waiting for a playable YouTube URL"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-2.5 py-1 font-mono text-[11px] text-ink-2">
                  {formatTime(currentTime)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-2.5 py-1">
                  <Radio className="h-3.5 w-3.5" aria-hidden />
                  {currentTime > 0.5 ? "Playing" : playerReady ? "Embed loaded" : videoId ? "Embed loading" : "No video"}
                </span>
              </div>
            </div>

            {playbackAttention && (
              <div className="border-t border-amber/40 bg-amber-soft px-4 py-3 text-[12px] leading-relaxed text-amber-2">
                Captions are armed, but the YouTube clock has not moved. If this preview is black or has no play button,
                use the fallback actions in the header.
              </div>
            )}
          </section>

          <YentlWatchPreviewPanel
            phase={phase}
            tabAudioCapture={tabAudioCapture}
            tabAudioTranscript={tabAudioTranscript}
            tabAudioInterim={tabAudioInterim}
            captionTranscript={captionTranscript}
            captionTotal={captionSegments.length}
            speakerLabels={speakerLabels}
            playerReady={playerReady}
            playbackAttention={playbackAttention}
            videoId={videoId}
            currentTime={currentTime}
            claimsCount={claimsCount}
            markersCount={markersCount}
          />
        </div>
        {saveOpen && <SaveSessionDialog open={saveOpen} onClose={() => setSaveOpen(false)} />}
      </div>
    </div>
  );
}

function YentlWatchPreviewPanel({
  phase,
  tabAudioCapture,
  tabAudioTranscript,
  tabAudioInterim,
  captionTranscript,
  captionTotal,
  speakerLabels,
  playerReady,
  playbackAttention,
  videoId,
  currentTime,
  claimsCount,
  markersCount,
}: {
  phase: Phase;
  tabAudioCapture: TabAudioCaptureState;
  tabAudioTranscript: TranscriptSegment[];
  tabAudioInterim: string;
  captionTranscript: TranscriptSegment[];
  captionTotal: number;
  speakerLabels: SpeakerLabel[];
  playerReady: boolean;
  playbackAttention: boolean;
  videoId: string | null;
  currentTime: number;
  claimsCount: number;
  markersCount: number;
}) {
  const noCaptions = phase.kind === "error" && phase.code === "NO_CAPTIONS";
  const isTabAudioStarting = tabAudioCapture.kind === "starting";
  const isTabAudioCapturing = tabAudioCapture.kind === "capturing";
  const hasTabAudioText = tabAudioTranscript.length > 0 || tabAudioInterim.trim().length > 0;
  const transcriptLines = hasTabAudioText ? tabAudioTranscript : captionTranscript;
  const transcriptTurns = buildTranscriptTurns(transcriptLines, speakerLabels);
  const readSignal = getYentlReadSignal({
    phase,
    noCaptions,
    isTabAudioStarting,
    isTabAudioCapturing,
    hasTabAudioText,
    captionTranscriptCount: captionTranscript.length,
    captionTotal,
    playerReady,
    playbackAttention,
    videoId,
  });
  const liveState =
    isTabAudioCapturing
      ? "Listening to tab"
      : isTabAudioStarting
        ? "Opening audio share"
        : phase.kind === "live"
          ? "Live analysis running"
          : phase.kind === "armed"
            ? "Press play to analyze"
        : phase.kind === "launching"
          ? "Syncing captions"
          : phase.kind === "checking"
            ? "Checking captions"
            : noCaptions
              ? "Needs tab audio"
              : videoId
                ? "Ready"
                : "Waiting";

  const [expandedMetric, setExpandedMetric] = useState<MetricKey | null>(null);
  const [focus, setFocus] = useState<RailFocus>("transcript");
  const metrics = buildSignalMetrics({
    phase,
    playerReady,
    transcriptLines,
    claimsCount,
    markersCount,
    tabAudioCapture,
  });

  return (
    <aside
      className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-paper shadow-sm transition-opacity xl:h-full ${videoId ? "opacity-100" : "opacity-55"}`}
      aria-label={`Yentl analysis panel: ${liveState}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <YentlReadCard signal={readSignal} />

        <SignalExpander
          metrics={metrics}
          expandedMetric={expandedMetric}
          onToggleMetric={(metric) => {
            setExpandedMetric((current) => (current === metric ? null : metric));
          }}
        />

        <RailDetailTabs
          focus={focus}
          onFocusChange={setFocus}
          transcriptTurns={transcriptTurns}
          transcriptLines={transcriptLines}
          hasTabAudioText={hasTabAudioText}
          tabAudioInterim={tabAudioInterim}
          phase={phase}
          noCaptions={noCaptions}
          captionTotal={captionTotal}
          currentTime={currentTime}
          claimsCount={claimsCount}
          markersCount={markersCount}
        />

        <FetchProgress phase={phase} />

        {tabAudioCapture.kind === "starting" && (
          <div className="mt-3 rounded-lg border border-teal/20 bg-teal-soft px-3 py-2 text-[12px] leading-relaxed text-teal">
            {tabAudioCapture.message}
          </div>
        )}

        {tabAudioCapture.kind === "error" && (
          <div className="mt-3 rounded-lg border border-red-soft bg-red-soft/50 px-3 py-2 text-[12px] leading-relaxed text-red">
            {tabAudioCapture.message}
          </div>
        )}

        {phase.kind === "error" && (
          <div className="mt-3">
            <YoutubeErrorRecovery
              phase={phase}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

function YoutubeHeaderFallbackActions({
  videoId,
  tabAudioCapture,
  onStartTabAudioCapture,
  onStopTabAudioCapture,
  onBrowserTab,
}: {
  videoId: string | null;
  tabAudioCapture: TabAudioCaptureState;
  onStartTabAudioCapture: () => void;
  onStopTabAudioCapture: () => void;
  onBrowserTab: () => void;
}) {
  const isStarting = tabAudioCapture.kind === "starting";
  const isCapturing = tabAudioCapture.kind === "capturing";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={isCapturing ? onStopTabAudioCapture : onStartTabAudioCapture}
        disabled={!videoId || isStarting}
        className="yentl-action-button inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-ink px-3.5 text-[11.5px] font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-ink/90 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isStarting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : isCapturing ? (
          <StopCircle className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
        )}
        {isCapturing ? "Stop tab audio" : "Share tab audio"}
      </button>
      <button
        type="button"
        onClick={onBrowserTab}
        className="yentl-action-button inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-line bg-cream px-3.5 text-[11.5px] font-semibold text-ink-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal-soft/70 active:translate-y-0 active:scale-[0.98]"
      >
        <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
        Use extension
      </button>
    </div>
  );
}

function YentlReadCard({ signal }: { signal: YentlReadSignal }) {
  return <YentlLiveReadCard signal={signal} testId="yentl-read-card" />;
}

function SignalExpander({
  metrics,
  expandedMetric,
  onToggleMetric,
}: {
  metrics: SignalMetric[];
  expandedMetric: MetricKey | null;
  onToggleMetric: (metric: MetricKey) => void;
}) {
  return (
    <LiveMetricExpander
      metrics={metrics}
      expandedMetric={expandedMetric}
      onToggleMetric={onToggleMetric}
      testId="youtube-metric-expander"
    />
  );
}

function RailDetailTabs({
  focus,
  onFocusChange,
  transcriptTurns,
  transcriptLines,
  hasTabAudioText,
  tabAudioInterim,
  phase,
  noCaptions,
  captionTotal,
  currentTime,
  claimsCount,
  markersCount,
}: {
  focus: RailFocus;
  onFocusChange: (focus: RailFocus) => void;
  transcriptTurns: TranscriptTurn[];
  transcriptLines: TranscriptSegment[];
  hasTabAudioText: boolean;
  tabAudioInterim: string;
  phase: Phase;
  noCaptions: boolean;
  captionTotal: number;
  currentTime: number;
  claimsCount: number;
  markersCount: number;
}) {
  return (
    <section className="mt-3 rounded-lg border border-line bg-paper" aria-label="Analysis detail tabs">
      <div className="grid grid-cols-2 gap-1.5 border-b border-line p-1.5">
        <button
          type="button"
          onClick={() => onFocusChange("transcript")}
          className={`yentl-action-button min-h-9 rounded-md text-[12px] font-bold transition-all ${
            focus === "transcript"
              ? "bg-ink text-white shadow-sm"
              : "bg-cream text-ink-3 hover:bg-teal-soft hover:text-teal"
          }`}
        >
          Transcript
        </button>
        <button
          type="button"
          onClick={() => onFocusChange("findings")}
          className={`yentl-action-button min-h-9 rounded-md text-[12px] font-bold transition-all ${
            focus === "findings"
              ? "bg-ink text-white shadow-sm"
              : "bg-cream text-ink-3 hover:bg-teal-soft hover:text-teal"
          }`}
        >
          Findings
        </button>
      </div>

      {focus === "transcript" ? (
        <TranscriptPanel
          transcriptTurns={transcriptTurns}
          transcriptLines={transcriptLines}
          hasTabAudioText={hasTabAudioText}
          tabAudioInterim={tabAudioInterim}
          phase={phase}
          noCaptions={noCaptions}
          captionTotal={captionTotal}
          currentTime={currentTime}
        />
      ) : (
        <FindingsPanel
          currentTime={currentTime}
          claimsCount={claimsCount}
          markersCount={markersCount}
          transcriptTurns={transcriptTurns}
        />
      )}
    </section>
  );
}

function TranscriptPanel({
  transcriptTurns,
  transcriptLines,
  hasTabAudioText,
  tabAudioInterim,
  phase,
  noCaptions,
  captionTotal,
  currentTime,
}: {
  transcriptTurns: TranscriptTurn[];
  transcriptLines: TranscriptSegment[];
  hasTabAudioText: boolean;
  tabAudioInterim: string;
  phase: Phase;
  noCaptions: boolean;
  captionTotal: number;
  currentTime: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-4">
          Live transcript
        </div>
        <span className="font-mono text-[11px] text-ink-4">{formatTime(currentTime)}</span>
      </div>
      <div className="max-h-[360px] overflow-y-auto p-3">
        {transcriptLines.length > 0 || tabAudioInterim ? (
          <div
            className="grid gap-2"
            data-testid={hasTabAudioText ? "youtube-tab-audio-transcript" : "youtube-caption-transcript"}
          >
            {transcriptTurns.slice(-5).map((turn, index) => (
              <TranscriptTurnCard key={`${turn.key}:${index}`} turn={turn} active={index === transcriptTurns.slice(-5).length - 1} />
            ))}
            {tabAudioInterim && (
              <div className="rounded-md border border-teal/20 bg-teal-soft px-3 py-2 text-[12px] italic leading-relaxed text-teal">
                {tabAudioInterim}
              </div>
            )}
            <div className="text-center text-[10.5px] font-medium text-ink-4">
              More lines below · auto-scroll follows playback
            </div>
          </div>
        ) : phase.kind === "armed" ? (
          <div className="rounded-md border border-teal/20 bg-teal-soft px-3 py-2 text-[12px] text-teal">
            Press play if the YouTube controls are visible. Yentl will release {captionTotal} timed caption line{captionTotal === 1 ? "" : "s"} here as the video clock advances.
          </div>
        ) : phase.kind === "checking" || phase.kind === "launching" ? (
          <div className="rounded-md border border-teal/20 bg-teal-soft px-3 py-2 text-[12px] text-teal">
            Preparing synced transcript...
          </div>
        ) : noCaptions ? (
          <div className="rounded-md border border-amber/50 bg-amber-soft px-3 py-2 text-[12px] leading-relaxed text-amber-2">
            Public captions were not available. Use the fallback actions in the header while this player keeps running.
          </div>
        ) : (
          <div className="rounded-md border border-line bg-cream px-3 py-2 text-[12px] italic text-ink-4">
            Transcript lines will appear here in time with playback.
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptTurnCard({ turn, active }: { turn: TranscriptTurn; active: boolean }) {
  return (
    <div
      className={`rounded-md border bg-cream px-3 py-2 text-[12px] leading-relaxed text-ink-2 ${
        turn.speakerId === 0
          ? "border-teal/25 shadow-[inset_3px_0_0_rgba(49,130,123,0.75)]"
          : "border-amber/45 shadow-[inset_3px_0_0_rgba(217,119,6,0.72)]"
      } ${active ? "ring-2 ring-teal/20" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-3">
          {turn.speakerName}
        </span>
        <span className="font-mono text-[10px] text-ink-4">{formatTime(turn.start)}</span>
      </div>
      <p>{turn.text}</p>
      {active && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-amber-2">
            live line
          </span>
        </div>
      )}
    </div>
  );
}

function FindingsPanel({
  currentTime,
  claimsCount,
  markersCount,
  transcriptTurns,
}: {
  currentTime: number;
  claimsCount: number;
  markersCount: number;
  transcriptTurns: TranscriptTurn[];
}) {
  const latestTurn = transcriptTurns.at(-1);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-4">
          Findings
        </div>
        <span className="text-[11px] font-semibold text-ink-4">
          {claimsCount} open · {markersCount} markers
        </span>
      </div>
      <div className="max-h-[360px] overflow-y-auto p-3">
        <div className="rounded-md border border-red-soft bg-red-soft/45 px-3 py-2 text-[12px] leading-relaxed text-red">
          <div className="mb-1 flex items-center justify-between gap-2">
            <b>Misleading risk</b>
            <time className="font-mono text-[10px]">{formatTime(currentTime)}</time>
          </div>
          <p>
            {latestTurn
              ? `${latestTurn.speakerName}'s latest turn is being checked for source trail, baseline, and loaded framing.`
              : "Yentl will group findings by claim, evidence state, and rhetoric marker once the video starts speaking."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-amber-2">
              yellow flag
            </span>
            <span className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-2">
              source needed
            </span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-line bg-cream px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-4">Claim</div>
            <p className="mt-1 text-[12px] text-ink-2">
              {claimsCount > 0 ? "Open assertion awaiting context." : "No open claim yet."}
            </p>
          </div>
          <div className="rounded-md border border-line bg-cream px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-4">Evidence</div>
            <p className="mt-1 text-[12px] text-ink-2">
              {claimsCount > 0 ? "Needs source, year, and comparator." : "No evidence lane active."}
            </p>
          </div>
        </div>
        <div className="mt-2 rounded-md border border-line bg-paper px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-4">
            Rhetoric markers
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-2">
              loaded phrasing
            </span>
            <span className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-2">
              missing qualifier
            </span>
            <span className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-2">
              implied consensus
            </span>
          </div>
        </div>
        <div className="mt-2 text-center text-[10.5px] font-medium text-ink-4">
          More findings below · grouped by claim, marker, and evidence state
        </div>
      </div>
    </div>
  );
}

function UrlReadiness({
  videoId,
  url,
  preview,
  phase,
}: {
  videoId: string | null;
  url: string;
  preview: PreviewState;
  phase: Phase;
}) {
  if (!url) {
    return null;
  }

  if (!videoId) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/50 bg-amber-soft px-2.5 py-1 text-[10.5px] font-semibold text-amber-2">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
        Unsupported link
      </span>
    );
  }

  if (preview.kind === "error" && phase.kind !== "armed" && phase.kind !== "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/50 bg-amber-soft px-2.5 py-1 text-[10.5px] font-semibold text-amber-2">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
        Needs fallback
      </span>
    );
  }

  const statusLabel =
    phase.kind === "checking"
      ? "Checking source"
      : phase.kind === "launching"
        ? "Starting Yentl"
        : phase.kind === "armed" || phase.kind === "live"
          ? "Live with Yentl"
          : preview.kind === "loading"
            ? "Resolving video"
            : "Video ready";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green/25 bg-green-soft px-2.5 py-1 text-[10.5px] font-semibold text-green">
      <CheckCircle2 className="h-3.5 w-3.5 text-green" aria-hidden />
      {statusLabel}
    </span>
  );
}

function FetchProgress({ phase }: { phase: Phase }) {
  if (phase.kind !== "checking" && phase.kind !== "launching") return null;

  const steps = [
    { label: "Resolve video", state: "done" },
    { label: "Check captions", state: phase.kind === "checking" ? "active" : "done" },
    { label: "Arm live release", state: phase.kind === "launching" ? "active" : "waiting" },
    { label: "Keep player and Yentl together", state: phase.kind === "launching" ? "active" : "waiting" },
  ] as const;

  return (
    <div className="rounded-lg border border-line bg-cream p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
        <Loader2 className="h-4 w-4 animate-spin text-teal" aria-hidden />
        Preparing live YouTube analysis
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
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

function YoutubeErrorRecovery({ phase }: { phase: Phase }) {
  if (phase.kind !== "error") return null;

  const title =
    phase.code === "NO_CAPTIONS"
      ? "This video needs live tab capture"
      : phase.code === "INVALID_URL"
        ? "That YouTube link is not supported"
        : "Caption path stopped";

  const message =
    phase.code === "NO_CAPTIONS"
      ? "No public captions are available for this video. Use Share tab audio or the Chrome extension in the header; the analysis rail stays reserved for Yentl's read, transcript, and findings."
      : phase.code === "INVALID_URL"
        ? "Paste a watch, shorts, embed, or youtu.be link from youtube.com or youtu.be."
        : phase.code === "PRIVATE"
          ? "This video is private, age-restricted, or unavailable in this environment. If it plays in Chrome, use the header fallback actions for live tab capture."
          : phase.code === "YT_DLP_MISSING"
            ? "The server is not configured for caption ingest right now. Use the header fallback actions for live tab capture."
            : `Could not prepare live captions: ${phase.message}`;

  return (
    <div className="rounded-lg border border-amber/60 bg-amber-soft p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-2" aria-hidden />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">{title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-2">{message}</p>
        </div>
      </div>
    </div>
  );
}
