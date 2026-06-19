"use client";

import Link from "next/link";
import { ArrowRight, Captions, CheckCircle2, MonitorPlay, Radio, SearchCheck, ShieldQuestion } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { VERDICT } from "@/lib/client/verdict-theme";
import type { ClaimCard, MarkerSeverity, RhetoricMarker, SessionSource, SpeakerId, TranscriptSegment } from "@/lib/types";

const severityRank: Record<MarkerSeverity, number> = {
  blatant: 3,
  clear: 2,
  subtle: 1,
};

function fmtTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function sourceLabel(source: SessionSource): string {
  switch (source.kind) {
    case "youtube":
      return "YouTube";
    case "browser_tab":
      return "Browser tab";
    case "audio_file":
      return "Audio file";
    case "text_doc":
      return source.intent === "claim_only" ? "Claim check" : "Text";
    case "media_url":
      return "Media URL";
    case "mic":
    default:
      return "Microphone";
  }
}

function speakerName(
  id: SpeakerId | null,
  speakers: Array<{ id: SpeakerId; label: string }>,
): string {
  if (id === null) return "Unknown speaker";
  return speakers.find((speaker) => speaker.id === id)?.label ?? `Speaker ${id + 1}`;
}

function latestTranscript(transcript: TranscriptSegment[]): TranscriptSegment[] {
  return [...transcript].sort((a, b) => b.end - a.end).slice(0, 5).reverse();
}

function latestClaims(claims: ClaimCard[]): ClaimCard[] {
  return [...claims].sort((a, b) => b.utterance_end - a.utterance_end).slice(0, 4);
}

function strongestMarkers(markers: RhetoricMarker[]): RhetoricMarker[] {
  return [...markers]
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.end_time - a.end_time)
    .slice(0, 4);
}

function linkedSourceCount(claims: ClaimCard[]): number {
  return claims.reduce((total, claim) => total + claim.sources.length, 0);
}

function highSourceCount(claims: ClaimCard[]): number {
  return claims.reduce(
    (total, claim) => total + claim.sources.filter((source) => source.reputation_tier === "high").length,
    0,
  );
}

function EmptyRoomMode() {
  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12">
        <p className="inline-flex w-fit items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase text-ink-3">
          <MonitorPlay className="h-4 w-4 text-teal" aria-hidden />
          TV room mode
        </p>
        <h1 className="mt-6 max-w-4xl font-serif text-[52px] font-medium leading-[1.04] text-ink sm:text-[72px]">
          Open a Yentl session on the big screen.
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-8 text-ink-3">
          Room mode is a read-only display for live review, classroom discussion,
          debate watch parties, and saved-session playback.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/session"
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal px-5 text-sm font-semibold text-white hover:bg-teal-2"
          >
            Start a session <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/tv?demo=validation&sample=solo_005"
            className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-paper px-5 text-sm font-semibold text-ink-2 hover:bg-cream-2"
          >
            Load sample <MonitorPlay className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}

type TVDashboardProps = {
  sessionHref?: string;
};

export function TVDashboard({ sessionHref = "/session" }: TVDashboardProps = {}) {
  const title = useSession((s) => s.title);
  const startedAt = useSession((s) => s.startedAt);
  const endedAt = useSession((s) => s.endedAt);
  const isRecording = useSession((s) => s.isRecording);
  const source = useSession((s) => s.source);
  const transcript = useSession((s) => s.transcript);
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const speakers = useSession((s) => s.speakers);
  const synthesis = useSession((s) => s.synthesis);
  const devilAdvocate = useSession((s) => s.devilAdvocate);

  const counterRead =
    devilAdvocate?.state === "fresh" || devilAdvocate?.state === "refreshing" || devilAdvocate?.state === "error"
      ? devilAdvocate.brief ?? null
      : null;
  const hasSession = Boolean(startedAt) || transcript.length > 0 || claims.length > 0 || markers.length > 0 || Boolean(counterRead);
  if (!hasSession) return <EmptyRoomMode />;

  const linkedSources = linkedSourceCount(claims);
  const highSources = highSourceCount(claims);
  const activeSummary =
    synthesis?.state === "fresh" || synthesis?.state === "refreshing"
      ? synthesis.text
      : "Yentl is collecting the transcript, claims, evidence, and rhetoric markers into one room-readable view.";
  const topHeadlines =
    synthesis?.state === "fresh" || synthesis?.state === "refreshing"
      ? synthesis.headlines.slice(0, 3)
      : [];

  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-6 px-6 py-6 lg:px-10">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-5">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase text-ink-3">
              <MonitorPlay className="h-4 w-4 text-teal" aria-hidden />
              Room mode
            </p>
            <h1 className="mt-4 max-w-5xl break-words font-serif text-[36px] font-medium leading-tight text-ink sm:text-[44px] lg:text-[64px]">
              {title || "Yentl live review"}
            </h1>
            <p className="mt-2 text-lg text-ink-3">
              {sourceLabel(source)} · {endedAt ? "Ended" : isRecording ? "Live" : "Review"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={sessionHref}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-paper px-5 text-sm font-semibold text-ink-2 hover:bg-cream-2"
            >
              Session <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/sessions"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal px-5 text-sm font-semibold text-white hover:bg-teal-2"
            >
              Library <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4" aria-label="Room metrics">
          {[
            ["Transcript", transcript.length.toString(), "lines captured", Captions],
            ["Claims", claims.length.toString(), "checkable items", SearchCheck],
            ["Markers", markers.length.toString(), "rhetoric signals", Radio],
            ["Sources", `${linkedSources}`, `${highSources} high reputation`, CheckCircle2],
          ].map(([label, value, note, Icon]) => {
            const MetricIcon = Icon as typeof Captions;
            return (
              <article key={label as string} className="rounded-lg border border-line bg-paper p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase text-ink-4">{label as string}</p>
                  <MetricIcon className="h-5 w-5 text-teal" aria-hidden />
                </div>
                <p className="mt-4 font-serif text-[52px] font-medium leading-none text-ink">{value as string}</p>
                <p className="mt-2 text-sm text-ink-3">{note as string}</p>
              </article>
            );
          })}
        </section>

        <section className="grid flex-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <section aria-labelledby="tv-read" className="rounded-lg border border-line bg-paper p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="tv-read" className="font-serif text-4xl font-medium text-ink">
                  Yentl&apos;s Read
                </h2>
                {synthesis?.state === "refreshing" && (
                  <span className="rounded-lg bg-amber-soft px-3 py-1 text-xs font-semibold uppercase text-amber-2">
                    Updating
                  </span>
                )}
              </div>
              <p className="mt-4 text-2xl leading-10 text-ink-2">{activeSummary}</p>
              {topHeadlines.length > 0 && (
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {topHeadlines.map((headline) => (
                    <p key={headline} className="rounded-lg border border-line bg-cream px-4 py-3 text-base font-semibold text-ink-2">
                      {headline}
                    </p>
                  ))}
                </div>
              )}
            </section>

            {counterRead && (
              <section aria-labelledby="tv-counter-read" className="rounded-lg border border-line bg-paper p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-teal-soft text-teal">
                      <ShieldQuestion className="h-6 w-6" aria-hidden />
                    </span>
                    <h2 id="tv-counter-read" className="font-serif text-4xl font-medium text-ink">
                      Counter-read
                    </h2>
                  </div>
                  {devilAdvocate?.state === "refreshing" && (
                    <span className="rounded-lg bg-amber-soft px-3 py-1 text-xs font-semibold uppercase text-amber-2">
                      Updating
                    </span>
                  )}
                  {devilAdvocate?.state === "error" && (
                    <span className="rounded-lg bg-red-soft px-3 py-1 text-xs font-semibold uppercase text-red">
                      Needs refresh
                    </span>
                  )}
                </div>
                <p className="mt-4 text-2xl leading-10 text-ink-2">{counterRead.stance}</p>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {counterRead.strongest_counterarguments.map((point, index) => (
                    <div key={point} className="rounded-lg border border-line bg-cream px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-ink-4">Challenge {index + 1}</p>
                      <p className="mt-2 text-base leading-7 text-ink-2">{point}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-line bg-cream px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-ink-4">Weakest assumption</p>
                    <p className="mt-2 text-lg leading-8 text-ink-2">{counterRead.weakest_assumption}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-cream px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-ink-4">Pressure-test</p>
                    <ul className="mt-2 space-y-2 text-lg leading-8 text-ink-2">
                      {counterRead.questions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            <section aria-labelledby="tv-claims" className="rounded-lg border border-line bg-paper p-6">
              <h2 id="tv-claims" className="font-serif text-4xl font-medium text-ink">
                Latest Claims
              </h2>
              <div className="mt-5 grid gap-3">
                {latestClaims(claims).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-cream p-5 text-lg text-ink-3">
                    No claims have landed yet.
                  </p>
                ) : (
                  latestClaims(claims).map((claim) => {
                    const verdict = VERDICT[claim.primary_label];
                    return (
                      <Link
                        key={claim.id}
                        href={`/session/detail/claim/${claim.id}`}
                        className="grid gap-3 rounded-lg border border-line bg-cream p-4 transition-colors hover:bg-cream-2 md:grid-cols-[170px_minmax(0,1fr)_90px]"
                      >
                        <div>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${verdict.pill}`}>
                            {claim.status === "checking" ? "Checking" : verdict.short}
                          </span>
                          <p className="mt-2 text-sm text-ink-4">
                            {speakerName(claim.speaker_id, speakers)} · {fmtTime(claim.utterance_start)}
                          </p>
                        </div>
                        <p className="min-w-0 text-xl leading-8 text-ink-2">{claim.claim_text}</p>
                        <p className={`font-serif text-4xl font-medium tabular-nums ${verdict.scoreText}`}>
                          {claim.score}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section aria-labelledby="tv-transcript" className="rounded-lg border border-line bg-paper p-6">
              <h2 id="tv-transcript" className="font-serif text-4xl font-medium text-ink">
                Transcript Now
              </h2>
              <div className="mt-5 space-y-3">
                {latestTranscript(transcript).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-cream p-5 text-lg text-ink-3">
                    Waiting for the first transcript lines.
                  </p>
                ) : (
                  latestTranscript(transcript).map((segment) => (
                    <article key={`${segment.start}-${segment.end}-${segment.text}`} className="rounded-lg border border-line bg-cream p-4">
                      <p className="text-sm font-semibold uppercase text-ink-4">
                        {speakerName(segment.speaker_id, speakers)} · {fmtTime(segment.start)}
                      </p>
                      <p className="mt-2 text-xl leading-8 text-ink-2">{segment.text}</p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section aria-labelledby="tv-markers" className="rounded-lg border border-line bg-paper p-6">
              <h2 id="tv-markers" className="font-serif text-4xl font-medium text-ink">
                Rhetoric Signals
              </h2>
              <div className="mt-5 space-y-3">
                {strongestMarkers(markers).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-cream p-5 text-lg text-ink-3">
                    No rhetoric markers yet.
                  </p>
                ) : (
                  strongestMarkers(markers).map((marker) => (
                    <Link
                      key={marker.id}
                      href={`/session/detail/marker/${marker.id}`}
                      className="block rounded-lg border border-line bg-cream p-4 transition-colors hover:bg-cream-2"
                    >
                      <p className="text-sm font-semibold uppercase text-ink-4">
                        {marker.severity} · {speakerName(marker.speaker_id, speakers)} · {fmtTime(marker.start_time)}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-ink">{marker.display}</p>
                      <p className="mt-2 text-base leading-7 text-ink-3">{marker.excerpt}</p>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
