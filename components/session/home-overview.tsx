"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, MonitorPlay, Radio, Settings2 } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { sessionViewHref } from "@/lib/client/session-route";
import {
  checkBrowserTabCaptureStatus,
  stopBrowserTabCapture,
} from "@/components/session/ExtensionBridge";
import { SynthesisCard } from "./synthesis-card";
import { MetricTile } from "./metric-tile";
import { TopicStrip } from "./topic-strip";
import { ActivityFeed } from "./activity-feed";
import {
  countClaimsByBucket,
  claimsSegments,
  countMarkersByType,
  markersSegments,
  computeSpeakerShares,
  speakerSegments,
  formatDuration,
  topicSegments,
  recentActivityEvents,
  sourceHealthSummary,
} from "@/lib/client/overview-selectors";
import type { SourceHealth, SourceHealthTone, SpeakerShare } from "@/lib/client/overview-selectors";
import { ListeningEmptyState } from "./listening-empty-state";
import type { ClaimCard, SessionSource, TranscriptSegment } from "@/lib/types";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpeakerLegend({ shares }: { shares: SpeakerShare[] }) {
  if (shares.length === 0) {
    return (
      <div className="text-[10.5px] text-ink-4 mt-2.5 italic">
        No utterances yet
      </div>
    );
  }

  return (
    <div className="flex justify-between mt-2.5 text-[10.5px] font-medium text-ink-2 flex-wrap gap-1">
      {shares.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={`w-1.5 h-1.5 rounded-full bg-spk-${(s.id % 6) + 1}`}
          />
          <span>
            {s.label} {s.pct}%
          </span>
        </span>
      ))}
    </div>
  );
}

function SessionFooter({
  transcriptLength,
}: {
  transcriptLength: number;
}): ReactNode {
  return (
    <div className="flex justify-between mt-3.5 text-[11px] text-ink-3">
      <span>
        <b className="text-ink-2">{transcriptLength}</b> utterances
      </span>
      <span>—</span>
    </div>
  );
}

const SOURCE_HEALTH_TONE: Record<
  SourceHealthTone,
  { badge: string; dot: string; rail: string }
> = {
  good: {
    badge: "border-green/30 bg-green-soft text-green",
    dot: "bg-green",
    rail: "border-l-green",
  },
  active: {
    badge: "border-teal/30 bg-teal-soft text-teal",
    dot: "bg-teal",
    rail: "border-l-teal",
  },
  warning: {
    badge: "border-amber-2/30 bg-amber-soft text-amber-2",
    dot: "bg-amber-2",
    rail: "border-l-amber",
  },
  idle: {
    badge: "border-line bg-slate-soft text-ink-3",
    dot: "bg-ink-4",
    rail: "border-l-line",
  },
};

function SourceHealthCard({ health }: { health: SourceHealth }) {
  const tone = SOURCE_HEALTH_TONE[health.tone];
  return (
    <section
      data-testid="source-health-card"
      className={`min-w-0 rounded-lg border border-line border-l-4 ${tone.rail} bg-paper px-4 py-3.5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10.5px] font-bold uppercase tracking-[.12em] text-ink-4">
          Source health
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${tone.badge}`}>
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {health.statusLabel}
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-teal">
          {health.sourceType}
        </div>
        <div className="mt-1 truncate font-serif text-[20px] leading-tight text-ink">
          {health.title}
        </div>
        <div className="mt-1 truncate text-[12px] text-ink-4">
          {health.subtitle}
        </div>
      </div>

      <div className="mt-3 divide-y divide-line text-[12px]">
        <SourceHealthRow label="Transcript" value={`${health.transcriptCount} utterances`} />
        <SourceHealthRow label="Claims ready" value={String(health.terminalClaimCount)} />
        <SourceHealthRow label="Still checking" value={String(health.checkingClaimCount)} />
        <SourceHealthRow label="Source-backed" value={`${health.sourceBackedClaimCount} claims`} />
        <SourceHealthRow
          label="Cited sources"
          value={
            health.uniqueSourceCount === 0
              ? "None yet"
              : `${health.uniqueSourceCount} total, ${health.highReputationSourceCount} high-rep`
          }
        />
      </div>
    </section>
  );
}

function SourceHealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 py-1.5">
      <span className="text-ink-4">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-ink-2">{value}</span>
    </div>
  );
}

function extractionLabel(kind?: string): string {
  switch (kind) {
    case "docx_text":
      return "Word document";
    case "pdf_text_layer":
      return "PDF text layer";
    case "timed_text":
      return "Caption file";
    case "plain_text":
    default:
      return "Plain text";
  }
}

function trimSourceText(text: string, max = 520): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trimEnd()}...`;
}

function sourceUrlHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function TextSourceReviewCard({
  source,
  transcript,
  claims,
}: {
  source: SessionSource;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
}) {
  const searchParams = useSearchParams();

  if (source.kind !== "text_doc" || (!source.initial_text && !source.source_url)) return null;

  const outline = source.document_meta?.outline?.slice(0, 5) ?? [];
  const anchoredTranscript = transcript.filter((segment) => segment.document_anchor).length;
  const anchoredClaims = claims.filter((claim) => claim.document_anchor).length;
  const title =
    source.intent === "web_url"
      ? "Article source"
      : source.intent === "claim_only"
        ? "Claim context"
        : "Source text";
  const sourceName =
    source.filename?.trim() ||
    (source.source_url ? sourceUrlHostname(source.source_url) : "Imported text");
  const sourcePreview = source.initial_text ? trimSourceText(source.initial_text) : "";
  const sourceUrl = source.source_url;

  return (
    <section
      data-testid="text-source-review-card"
      className="min-w-0 rounded-lg border border-line bg-paper px-4 py-3.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[.12em] text-ink-4">
            <FileText className="h-3.5 w-3.5 text-teal" aria-hidden />
            {title}
          </div>
          <h2 className="mt-2 truncate font-serif text-[22px] leading-tight text-ink">
            {sourceName}
          </h2>
        </div>
        <span className="rounded-full border border-teal/25 bg-teal-soft px-2 py-0.5 text-[10.5px] font-semibold text-teal">
          {extractionLabel(source.document_meta?.extraction_kind)}
        </span>
      </div>

      {sourcePreview && (
        <p className="mt-3 rounded-lg border border-line bg-cream px-3 py-2 text-[12.5px] leading-relaxed text-ink-3">
          {sourcePreview}
        </p>
      )}

      {outline.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.12em] text-ink-4">
            Outline
          </div>
          <div className="space-y-1.5">
            {outline.map((item, index) => (
              <div key={`${item.kind}-${item.line_start ?? index}-${item.label}`} className="rounded-lg border border-line bg-cream px-3 py-2">
                <div className="truncate text-[12px] font-semibold text-ink-2">
                  {item.label}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-4">
                  {item.preview}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-line bg-cream px-3 py-2">
          <div className="font-semibold text-ink-2">{anchoredTranscript}</div>
          <div className="text-ink-4">anchored transcript lines</div>
        </div>
        <div className="rounded-lg border border-line bg-cream px-3 py-2">
          <div className="font-semibold text-ink-2">{anchoredClaims}</div>
          <div className="text-ink-4">anchored claims</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={sessionViewHref(searchParams, "source", { block: null })}
          className="inline-flex min-h-9 items-center rounded-lg border border-line bg-cream px-3 text-[12px] font-semibold text-ink-2 hover:bg-cream-2"
        >
          Review source
        </Link>
        <Link
          href={sessionViewHref(searchParams, "transcript", { block: null })}
          className="inline-flex min-h-9 items-center rounded-lg border border-line bg-cream px-3 text-[12px] font-semibold text-ink-2 hover:bg-cream-2"
        >
          Review transcript
        </Link>
        <Link
          href={sessionViewHref(searchParams, "claims", {
            block: null,
            topic: null,
            type: null,
            severity: null,
          })}
          className="inline-flex min-h-9 items-center rounded-lg border border-line bg-cream px-3 text-[12px] font-semibold text-ink-2 hover:bg-cream-2"
        >
          Review claims
        </Link>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-cream px-3 text-[12px] font-semibold text-ink-2 hover:bg-cream-2"
          >
            Open original <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
    </section>
  );
}

function BrowserTabEmptyState() {
  const router = useRouter();
  const reset = useSession((s) => s.reset);
  const source = useSession((s) => s.source);
  const status = useSession((s) => s.browserTabStatus);
  const title = source.kind === "browser_tab" ? source.title : undefined;
  const url = source.kind === "browser_tab" ? source.url : undefined;
  const connected =
    status.phase === "extension_connected" ||
    status.phase === "capturing" ||
    status.phase === "transcribing";
  const errored = status.phase === "error";

  function chooseAnotherSource() {
    stopBrowserTabCapture();
    reset();
    router.push("/session");
  }

  return (
    <div className="grid gap-4 rounded-lg border border-line bg-paper p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-soft text-teal">
          <MonitorPlay className="h-4 w-4" aria-hidden />
        </div>
        <div
          className={`mb-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            errored
              ? "border-red-soft bg-red-soft/50 text-red"
              : connected
                ? "border-green/20 bg-green-soft text-green"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              errored ? "bg-red" : connected ? "bg-green" : "bg-blue-500"
            }`}
          />
          {errored ? "Needs attention" : connected ? "Connected" : "Waiting"}
        </div>
        <h2 className="font-serif text-[24px] leading-tight text-ink">
          {connected ? "Connected to browser audio" : "Waiting for tab audio"}
        </h2>
        <p className="mt-2 max-w-prose text-[13.5px] leading-relaxed text-ink-3">
          {connected
            ? "Yentl is attached to the tab. Keep the media playing; transcript lines, claims, markers, and synthesis will appear here as speech arrives."
            : "Go to the tab with the video or audio and click the Yentl Chrome extension. Nothing is being heard yet."}
        </p>
        {(title || url) && (
          <div className="mt-4 rounded-lg border border-line bg-cream px-3 py-2">
            {title && (
              <div className="truncate text-[13px] font-medium text-ink">
                {title}
              </div>
            )}
            {url && (
              <div className="mt-0.5 truncate font-mono text-[11px] text-ink-4">
                {url}
              </div>
            )}
          </div>
        )}
        {status.message && (
          <p className="mt-3 rounded-lg border border-line bg-cream px-3 py-2 text-[12.5px] text-ink-3">
            {status.message}
          </p>
        )}
      </div>
      <div className="rounded-lg border border-line bg-cream p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
          Next action
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={checkBrowserTabCaptureStatus}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper px-3 py-2.5 text-[13px] font-medium text-ink-2 hover:bg-cream-2"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            Check extension status
          </button>
          <button
            type="button"
            onClick={chooseAnotherSource}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper px-3 py-2.5 text-[13px] font-medium text-ink-2 hover:bg-cream-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Choose another source
          </button>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[12px] leading-snug text-ink-4">
          <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Extension capture starts only after you click the extension on the
          playing media tab.
        </p>
      </div>
    </div>
  );
}

// ─── HomeOverview ─────────────────────────────────────────────────────────────

export function HomeOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const transcript = useSession((s) => s.transcript);
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const speakers = useSession((s) => s.speakers);
  const synthesis = useSession((s) => s.synthesis);
  const startedAt = useSession((s) => s.startedAt);
  const source = useSession((s) => s.source);
  const micStream = useSession((s) => s.micStream);

  // ── Derived data ──────────────────────────────────────────────────────────
  const claimsCounts = countClaimsByBucket(claims);
  const markerCounts = countMarkersByType(markers);
  const shares = computeSpeakerShares(transcript, speakers);
  const spkSegments = speakerSegments(shares);
  const topics = topicSegments(claims);
  const events = recentActivityEvents(claims, markers, speakers, 6);
  const sourceHealth = sourceHealthSummary({ source, transcript, claims });

  const terminalClaimsCount = claims.filter(
    (c) => c.status !== "checking",
  ).length;

  const durationMs = startedAt
    // eslint-disable-next-line react-hooks/purity -- one-shot duration display; not driving a live clock
    ? Date.now() - new Date(startedAt).getTime()
    : 0;

  // ── Headline chip routing (gap #3) ────────────────────────────────────────
  const onHeadlineClick = (_headline: string, index: number) => {
    if (index === 0) {
      router.push(
        sessionViewHref(searchParams, "markers", {
          type: "fallacy",
          severity: null,
          verdict: null,
          topic: null,
          speaker: null,
          block: null,
        }),
      );
    } else if (index === 1) {
      router.push(
        sessionViewHref(searchParams, "claims", {
          verdict: "true,mostly_true",
          type: null,
          severity: null,
          topic: null,
          speaker: null,
          block: null,
        }),
      );
    } else {
      router.push(
        sessionViewHref(searchParams, "claims", {
          verdict: null,
          type: null,
          severity: null,
          topic: null,
          speaker: null,
          block: null,
        }),
      );
    }
  };

  // Show listening state when session just started (mic, no transcript yet)
  if (startedAt && transcript.length === 0 && source.kind === "mic") {
    return (
      <div className="px-6 md:px-8 max-w-[1200px] mx-auto w-full">
        <ListeningEmptyState micStream={micStream} />
      </div>
    );
  }

  if (startedAt && transcript.length === 0 && source.kind === "browser_tab") {
    return (
      <div className="px-6 md:px-8 pt-6 max-w-[1200px] mx-auto w-full">
        <BrowserTabEmptyState />
      </div>
    );
  }

  return (
    <div className="px-6 md:px-8 pt-6 pb-12 flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      {/* Synthesis card — always full-width */}
      <SynthesisCard synthesis={synthesis} onHeadlineClick={onHeadlineClick} />

      {/* 4-tile grid: 2-col mobile / 4-col desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-3.5">
        <MetricTile
          label="CLAIMS"
          value={String(terminalClaimsCount)}
          href={sessionViewHref(searchParams, "claims", {
            verdict: null,
            type: null,
            severity: null,
            topic: null,
            speaker: null,
            block: null,
          })}
          segments={claimsSegments(claimsCounts)}
        />

        <MetricTile
          label="MARKERS"
          value={String(markers.length)}
          href={sessionViewHref(searchParams, "markers", {
            verdict: null,
            type: null,
            severity: null,
            topic: null,
            speaker: null,
            block: null,
          })}
          segments={markersSegments(markerCounts)}
        />

        <MetricTile
          label="SPEAKERS"
          value={String(speakers.length)}
          segments={spkSegments.length > 0 ? spkSegments : undefined}
          footer={<SpeakerLegend shares={shares} />}
        />

        <MetricTile
          label="SESSION"
          value={formatDuration(durationMs)}
          footer={<SessionFooter transcriptLength={transcript.length} />}
        />
      </div>

      {/* Topic strip */}
      <TopicStrip
        segments={topics}
        buildHref={(topic) =>
          sessionViewHref(searchParams, "claims", {
            topic: topic.toLowerCase(),
            verdict: null,
            type: null,
            severity: null,
            speaker: null,
            block: null,
          })
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-5">
          <SourceHealthCard health={sourceHealth} />
          <TextSourceReviewCard source={source} transcript={transcript} claims={claims} />
        </div>

        <div className="min-w-0">
          {/* Activity feed */}
          <ActivityFeed
            events={events}
            buildClaimHref={(id) => `/session/detail/claim/${id}`}
            buildMarkerHref={(id) => `/session/detail/marker/${id}`}
            transcriptHref={sessionViewHref(searchParams, "transcript", { block: null })}
          />
        </div>
      </div>
    </div>
  );
}
