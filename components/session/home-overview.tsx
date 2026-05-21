"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MonitorPlay, Radio, Settings2 } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
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
} from "@/lib/client/overview-selectors";
import type { SpeakerShare } from "@/lib/client/overview-selectors";
import { ListeningEmptyState } from "./listening-empty-state";

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
      router.push("/session?view=markers&type=fallacy");
    } else if (index === 1) {
      router.push("/session?view=claims&verdict=true,mostly_true");
    } else {
      router.push("/session?view=claims");
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
          href="/session?view=claims"
          segments={claimsSegments(claimsCounts)}
        />

        <MetricTile
          label="MARKERS"
          value={String(markers.length)}
          href="/session?view=markers"
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
          `/session?view=claims&topic=${encodeURIComponent(topic.toLowerCase())}`
        }
      />

      {/* Activity feed */}
      <ActivityFeed
        events={events}
        buildClaimHref={(id) => `/session/detail/claim/${id}`}
        buildMarkerHref={(id) => `/session/detail/marker/${id}`}
      />
    </div>
  );
}
