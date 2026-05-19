"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
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
