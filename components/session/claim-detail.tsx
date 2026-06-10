"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ClaimCard, Speaker, PrimaryLabel, Source } from "@/lib/types";
import { claimContextForVerification, sourceContextForClaimVerification } from "@/lib/client/analysis-context";
import { sessionPathHref, sessionViewHref } from "@/lib/client/session-route";
import { useSession, type DevilAdvocateBrief, type DevilAdvocateState } from "@/lib/client/session-store";
import { documentAnchorDetail } from "@/lib/document-anchor";
import {
  hasValidatedImage,
  sourceClaimOverlap,
  sourceClaimOverlapTerms,
  sourceDossierStats,
  sourceEvidenceBreakdown,
  sourceEvidenceScore,
} from "@/lib/source-evidence";
import { attributionStatusLabel, isAttributionStatusResolved, speakerLabelFor } from "./attribution-labels";
import { ExportDialog } from "./ExportDialog";
import { createUserDisputeFlag, ReviewFlagPanel } from "./review-flag-panel";
import { SaveSessionDialog } from "./SaveSessionDialog";
import { SourceCard } from "./source-card";
import { sourceDetailId } from "./source-detail";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function contextPreview(value?: string): string | null {
  const compact = value?.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.length > 220 ? `${compact.slice(0, 217).trim()}...` : compact;
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function devilAdvocateBrief(state: DevilAdvocateState): DevilAdvocateBrief | null {
  if (!state || !("brief" in state)) return null;
  return state.brief ?? null;
}

function claimAttributionDetail(
  claim: ClaimCard,
  speakers: Speaker[],
): { label: string; value: string; status?: string } {
  if (!claim.ownership) {
    return {
      label: claim.speaker_id === null ? "Speaker" : "Said by",
      value: speakerLabelFor(speakers, claim.speaker_id),
    };
  }

  const status = attributionStatusLabel(claim.ownership.attribution_status);
  const ownerId = claim.ownership.owner_speaker_id;
  if (ownerId !== null && isAttributionStatusResolved(claim.ownership.attribution_status)) {
    return {
      label: "Owner",
      value: speakerLabelFor(speakers, ownerId),
      status,
    };
  }

  return {
    label: "Ownership",
    value: status,
  };
}

// ─── Verdict theme maps ───────────────────────────────────────────────────────

const VERDICT_LABEL: Record<PrimaryLabel, string> = {
  TRUE: "Supported",
  MOSTLY_TRUE: "Supported",
  PARTIAL: "Mixed",
  MISLEADING: "Mixed",
  OMISSION: "Mixed",
  FALSE: "False",
  UNVERIFIABLE: "No reliable backing",
  OPINION: "Opinion",
};

const VERDICT_PILL: Record<PrimaryLabel, string> = {
  TRUE:         "bg-green-soft text-green border-green/30",
  MOSTLY_TRUE:  "bg-green-soft text-green border-green/20",
  PARTIAL:      "bg-orange-soft text-orange border-orange/30",
  MISLEADING:   "bg-orange-soft text-orange border-orange/30",
  OMISSION:     "bg-orange-soft text-orange border-orange/30",
  FALSE:        "bg-red-soft text-red border-red/30",
  UNVERIFIABLE: "bg-slate-soft text-slate border-slate/30",
  OPINION:      "bg-purple-soft text-purple border-purple/30",
};

const VERDICT_SCORE_TEXT: Record<PrimaryLabel, string> = {
  TRUE:         "text-green",
  MOSTLY_TRUE:  "text-green",
  PARTIAL:      "text-orange",
  MISLEADING:   "text-orange",
  OMISSION:     "text-orange",
  FALSE:        "text-red",
  UNVERIFIABLE: "text-slate",
  OPINION:      "text-slate",
};

const VERDICT_FILL: Record<PrimaryLabel, string> = {
  TRUE:         "bg-green",
  MOSTLY_TRUE:  "bg-green",
  PARTIAL:      "bg-orange",
  MISLEADING:   "bg-orange",
  OMISSION:     "bg-orange",
  FALSE:        "bg-red",
  UNVERIFIABLE: "bg-slate",
  OPINION:      "bg-purple",
};

const VERDICT_BORDER_LEFT: Record<PrimaryLabel, string> = {
  TRUE:         "border-l-green",
  MOSTLY_TRUE:  "border-l-green",
  PARTIAL:      "border-l-orange",
  MISLEADING:   "border-l-orange",
  OMISSION:     "border-l-orange",
  FALSE:        "border-l-red",
  UNVERIFIABLE: "border-l-slate",
  OPINION:      "border-l-purple",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerdictLabel({
  status,
  verdict,
}: {
  status: ClaimCard["status"];
  verdict: PrimaryLabel;
}) {
  const label = status === "checking" ? "Checking" : VERDICT_LABEL[verdict];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${VERDICT_PILL[verdict]}`}
    >
      {label}
    </span>
  );
}

function ScorePill({ score, verdict }: { score: number; verdict: PrimaryLabel }) {
  return (
    <span
      className={`font-serif text-[32px] font-medium leading-none tabular-nums ${VERDICT_SCORE_TEXT[verdict]}`}
    >
      {Math.round(score)}
      <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink-4 ml-0.5">
        /100
      </span>
    </span>
  );
}

function ConfBar({ verdict, score }: { verdict: PrimaryLabel; score: number }) {
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-4 font-bold mb-1.5 flex justify-between">
        <span>Confidence</span>
        <span>{Math.round(score)} / 100</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(score)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence: ${Math.round(score)} out of 100`}
        className="h-1.5 bg-cream-2 rounded-full overflow-hidden"
      >
        <div
          className={`h-full ${VERDICT_FILL[verdict]} transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function evidenceStatusForClaim(claim: ClaimCard) {
  const supports = claim.sources.filter((source) => source.stance === "supports").length;
  const contradicts = claim.sources.filter((source) => source.stance === "contradicts").length;
  const mixed = claim.sources.filter((source) => source.stance === "mixed").length;
  const cited = claim.sources.length;
  const interrupted = claim.annotations.some((annotation) =>
    annotation.toLowerCase() === "verification interrupted",
  );
  const sourceSummary =
    cited > 0
      ? `${pluralize(cited, "cited source")}: ${supports} support / ${contradicts} contradict / ${mixed} mixed`
      : "0 cited sources";

  if (claim.status === "checking") {
    return {
      title: "Still checking sources",
      body: "Yentl has opened the claim card, but source verification has not finished yet.",
      mode: "In progress",
      sourceSummary,
    };
  }

  if (interrupted) {
    return {
      title: "Verification needs retry",
      body: "Yentl created the claim card, but the verification call did not complete. Use Re-check when the connection or rate limit clears.",
      mode: "Recovery",
      sourceSummary,
    };
  }

  if (claim.status === "provisional") {
    return {
      title: "Provisional read",
      body: "This is the first pass before a completed source-backed search. Re-check when you want a fresh confirmed pass.",
      mode: "First read",
      sourceSummary,
    };
  }

  if (claim.primary_label === "OPINION") {
    return {
      title: "Opinion, not a factual check",
      body: "Yentl treated this as a value judgment rather than a claim that can be supported or contradicted by sources.",
      mode: "Classification",
      sourceSummary,
    };
  }

  if (claim.primary_label === "UNVERIFIABLE") {
    return {
      title: "No reliable backing found",
      body: "The confirmed pass did not return reliable source backing. That is not the same as saying the claim is false.",
      mode: "Confirmed search",
      sourceSummary,
    };
  }

  if (claim.primary_label === "FALSE") {
    return {
      title: "Contradicted by source evidence",
      body: "The cited source balance points against the claim. Review the source cards before relying on the result.",
      mode: "Confirmed search",
      sourceSummary,
    };
  }

  if (claim.primary_label === "TRUE" || claim.primary_label === "MOSTLY_TRUE") {
    return {
      title: "Supported by source evidence",
      body: "The cited source balance supports the claim, with any caveats reflected in the score and notes.",
      mode: "Confirmed search",
      sourceSummary,
    };
  }

  return {
    title: "Mixed or caveated evidence",
    body: "The claim has support in some respects, but the source record also contains limits, missing context, or contradiction.",
    mode: "Confirmed search",
    sourceSummary,
  };
}

function EvidenceStatusPanel({ claim }: { claim: ClaimCard }) {
  const status = evidenceStatusForClaim(claim);

  return (
    <div
      data-testid="evidence-status-panel"
      className="rounded-2xl border border-line bg-paper px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-4">
            Evidence status
          </div>
          <div className="mt-1 font-serif text-[18px] font-medium leading-tight text-ink-2">
            {status.title}
          </div>
        </div>
        <span className="rounded-full border border-line bg-cream px-2.5 py-1 text-[10.5px] font-semibold text-ink-3">
          {status.mode}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        {status.body}
      </p>
      <div className="mt-3 rounded-lg border border-line-soft bg-cream px-3 py-2 text-[12px] font-medium text-ink-3">
        {status.sourceSummary}
      </div>
    </div>
  );
}

// Exported for use in claim-learn-more.tsx (related claims list)
export function ScoreChip({
  score,
  verdict,
}: {
  score: number;
  verdict: PrimaryLabel;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border tabular-nums flex-shrink-0 ${VERDICT_PILL[verdict]}`}
    >
      {Math.round(score)}
    </span>
  );
}

const SOURCE_STANCE_GROUPS: Array<{
  stance: Source["stance"];
  label: string;
  dotClass: string;
  textClass: string;
}> = [
  {
    stance: "supports",
    label: "Supports",
    dotClass: "bg-green",
    textClass: "text-green",
  },
  {
    stance: "contradicts",
    label: "Contradicts",
    dotClass: "bg-red",
    textClass: "text-red",
  },
  {
    stance: "mixed",
    label: "Mixed",
    dotClass: "bg-orange",
    textClass: "text-orange",
  },
];

export function SourceDossier({
  sources,
  claimText,
}: {
  sources: Source[];
  claimText?: string;
}) {
  const stats = sourceDossierStats(sources, claimText);

  return (
    <div
      data-testid="source-dossier"
      className="mb-3 rounded-lg border border-line bg-cream px-3 py-2.5"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-4">
          Source dossier
        </div>
        <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">
          {sources.length} cited
        </span>
      </div>
      <div className="grid gap-x-4 gap-y-1.5 text-[11.5px] sm:grid-cols-4">
        <DossierLine label="Stance" value={`${stats.supports} support / ${stats.contradicts} contradict / ${stats.mixed} mixed`} />
        <DossierLine label="Reputation" value={`${stats.high} high / ${stats.mid} mid / ${stats.low} low`} />
        <DossierLine label="Images" value={`${stats.validatedImages} validated / ${stats.missingImages} missing`} />
        <DossierLine label="Alignment" value={`${stats.claimLinked} linked / ${stats.claimUnlinked} not direct`} />
      </div>
      <SourceComparison sources={sources} claimText={claimText} />
    </div>
  );
}

function DossierLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-4">
        {label}
      </div>
      <div className="mt-0.5 truncate font-semibold text-ink-2">{value}</div>
    </div>
  );
}

function SourceComparison({
  sources,
  claimText,
}: {
  sources: Source[];
  claimText?: string;
}) {
  if (sources.length === 0) return null;

  return (
    <div data-testid="source-comparison" className="mt-3 border-t border-line pt-3">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
        {SOURCE_STANCE_GROUPS.map((group, index) => {
          const groupSources = sources
            .filter((source) => source.stance === group.stance)
            .sort((a, b) => sourceEvidenceScore(b) - sourceEvidenceScore(a));
          return (
            <div
              key={group.stance}
              data-testid={`source-comparison-${group.stance}`}
              className={`min-w-0 ${index === 0 ? "" : "sm:pl-3"} ${index === SOURCE_STANCE_GROUPS.length - 1 ? "" : "sm:pr-3"}`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${group.textClass}`}>
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${group.dotClass}`} />
                  {group.label}
                </span>
                <span className="text-[10px] font-semibold text-ink-4">
                  {groupSources.length}
                </span>
              </div>
              {groupSources.length === 0 ? (
                <div className="text-[11px] italic text-ink-4">No cited source in this lane.</div>
              ) : (
                <div className="space-y-2">
                  {groupSources.map((source, sourceIndex) => (
                    <SourceComparisonItem
                      key={`${group.stance}-${source.url}`}
                      source={source}
                      strongest={sourceIndex === 0}
                      claimText={claimText}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HighlightedSourceExcerpt({
  excerpt,
  claimText,
}: {
  excerpt: string;
  claimText?: string;
}) {
  const overlapTerms = new Set(sourceClaimOverlapTerms(claimText, excerpt));
  const parts = excerpt.split(/([a-z0-9]+)/gi);

  return (
    <>
      {parts.map((part, index) => {
        const normalized = part.toLowerCase();
        if (overlapTerms.has(normalized)) {
          return (
            <mark
              key={`${part}-${index}`}
              data-testid="source-excerpt-match"
              className="rounded-sm bg-yellow-100 px-0.5 text-ink-2"
            >
              {part}
            </mark>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function SourceComparisonItem({
  source,
  strongest,
  claimText,
}: {
  source: Source;
  strongest: boolean;
  claimText?: string;
}) {
  const imageLabel =
    hasValidatedImage(source)
      ? "image validated"
      : "image missing";
  const evidenceScore = sourceEvidenceScore(source);
  const evidenceBreakdown = sourceEvidenceBreakdown(source);
  const claimOverlap = sourceClaimOverlap(claimText, source.excerpt);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      title={`Evidence score ${evidenceScore}: ${evidenceBreakdown}`}
      className="block min-w-0 text-[11px] leading-snug text-ink-3 hover:text-ink-2"
    >
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate font-semibold text-ink-2">{source.title}</span>
        {strongest && (
          <span className="shrink-0 rounded-full border border-teal/25 bg-teal-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal">
            Strongest
          </span>
        )}
      </span>
      <span className="mt-0.5 block truncate text-ink-4">
        {source.domain} · {source.reputation_tier.toUpperCase()} · {imageLabel} · score {evidenceScore}
      </span>
      <span className="mt-0.5 block text-[10px] font-medium text-ink-4 line-clamp-2">
        Evidence: {evidenceBreakdown}
      </span>
      <span className="mt-0.5 block text-[10px] font-medium text-ink-4 line-clamp-2">
        Claim link: {claimOverlap}
      </span>
      {source.excerpt && (
        <span className="mt-1 block font-serif italic text-ink-3 line-clamp-3">
          &ldquo;<HighlightedSourceExcerpt excerpt={source.excerpt} claimText={claimText} />&rdquo;
        </span>
      )}
    </a>
  );
}

export function ActionButton({
  label,
  onClick,
  disabled,
  loading,
  tooltip,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip}
      data-testid="detail-action-btn"
      className={`inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
        disabled || loading
          ? "bg-cream-2 border-line text-ink-4 cursor-not-allowed"
          : "bg-paper border-line text-ink-2 hover:bg-cream-2"
      }`}
    >
      {loading && (
        <span
          aria-hidden
          className="w-2.5 h-2.5 rounded-full border-2 border-ink-4 border-t-transparent animate-spin"
        />
      )}
      {label}
    </button>
  );
}

// ─── ClaimDetail ──────────────────────────────────────────────────────────────

export function ClaimDetail({
  claim,
  speakers,
}: {
  claim: ClaimCard;
  speakers: Speaker[];
}) {
  const searchParams = useSearchParams();
  const attributionDetail = claimAttributionDetail(claim, speakers);
  const sourceAnchor = documentAnchorDetail(claim.document_anchor);
  const claimContext = contextPreview(claim.source_context);
  const [rechecking, setRechecking] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const updateClaim = useSession((s) => s.updateClaim);
  const source = useSession((s) => s.source);
  const devilAdvocate = useSession((s) => s.devilAdvocate);
  const devilBrief = devilAdvocateBrief(devilAdvocate);
  const disputed = claim.review?.status === "disputed";

  async function onRecheck() {
    setRechecking(true);
    try {
      const res = await fetch("/api/verify-confirmed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_text: claim.claim_text,
          source_context: sourceContextForClaimVerification(source, claim),
          claim_context: claimContextForVerification(claim),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        updateClaim(claim.id, { ...data, status: "confirmed" });
      }
    } catch (e) {
      console.error("recheck failed", e);
    } finally {
      setRechecking(false);
    }
  }

  async function onShare() {
    const path = sessionPathHref(searchParams, `/session/detail/claim/${claim.id}`);
    const url = `${window.location.origin}${path}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  }

  function onDispute() {
    updateClaim(claim.id, {
      review: createUserDisputeFlag(
        "User disputed this claim result from the detail view. Re-check the source evidence, wording, and context before relying on it.",
      ),
    });
  }

  return (
    <div className="px-6 md:px-8 pt-4 pb-12 max-w-[820px] mx-auto w-full flex flex-col gap-3.5">
      {/* ── Hero card ──────────────────────────────────────────────── */}
      <div
        className={`bg-paper border border-line border-l-[6px] ${VERDICT_BORDER_LEFT[claim.primary_label]} rounded-2xl p-5`}
      >
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <VerdictLabel status={claim.status} verdict={claim.primary_label} />
          <ScorePill score={claim.score} verdict={claim.primary_label} />
        </div>
        <div className="font-serif italic font-medium text-[20px] text-ink-2 leading-snug tracking-tight">
          &ldquo;{claim.claim_text}&rdquo;
        </div>
        <ConfBar verdict={claim.primary_label} score={claim.score} />
      </div>

      {/* ── Why this verdict ───────────────────────────────────────── */}
      {(claim.annotations.length > 0 || claim.explanation) && (
        <div className="bg-paper border border-line rounded-2xl p-4 px-5">
          <div className="text-[10.5px] tracking-wider uppercase text-ink-4 font-bold mb-2.5">
            Why this verdict
          </div>
          {claim.explanation && (
            <div className="text-[13px] text-ink-2 leading-relaxed mb-3">
              {claim.explanation}
            </div>
          )}
          {claim.annotations.length > 0 && (
            <ul className="space-y-2">
              {claim.annotations.map((a, i) => (
                <li
                  key={i}
                  className="text-[13px] leading-relaxed text-ink-2 flex gap-2"
                >
                  <span className="text-ink-4 leading-5 flex-shrink-0">●</span>
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {claim.review && <ReviewFlagPanel label="Claim" review={claim.review} />}

      <EvidenceStatusPanel claim={claim} />

      {/* ── Sources ────────────────────────────────────────────────── */}
      {claim.sources.length > 0 && (
        <div className="bg-paper border border-line rounded-2xl p-4 px-5">
          <div className="text-[10.5px] tracking-wider uppercase text-ink-4 font-bold mb-2.5">
            Sources · {claim.sources.length}
          </div>
          <SourceDossier sources={claim.sources} claimText={claim.claim_text} />
          <div className="flex flex-col gap-2">
            {claim.sources.map((s, i) => (
              <SourceCard
                key={`${s.url}-${i}`}
                source={s}
                detailHref={sessionPathHref(
                  searchParams,
                  `/session/detail/source/${sourceDetailId(claim.id, i)}`,
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Devil's Advocate ─────────────────────────────────────── */}
      {devilAdvocate && (
        <div className="bg-paper border border-line rounded-2xl p-4 px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10.5px] tracking-wider uppercase text-ink-4 font-bold">
              Devil&apos;s Advocate
            </div>
            <span className="rounded-full border border-purple/20 bg-purple-soft px-2 py-0.5 text-[10.5px] font-semibold text-purple">
              {devilAdvocate.state === "warming" ? "Queued" : devilAdvocate.state}
            </span>
          </div>
          {devilBrief ? (
            <div className="mt-3 grid gap-3 text-[13px] leading-relaxed text-ink-2">
              <p className="font-medium">{devilBrief.stance}</p>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-4">
                  Strongest challenge
                </div>
                <ul className="mt-1 grid gap-1.5">
                  {devilBrief.strongest_counterarguments.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-line-soft bg-cream px-3 py-2">
                <span className="font-semibold text-ink">Weakest assumption: </span>
                {devilBrief.weakest_assumption}
              </div>
              {devilBrief.questions.length > 0 && (
                <div className="text-[12.5px] text-ink-3">
                  <span className="font-semibold text-ink-2">Questions: </span>
                  {devilBrief.questions.join(" · ")}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
              Challenge pass is queued for this session.
            </p>
          )}
        </div>
      )}

      {/* ── Source + time context ─────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-paper px-5 py-3 text-[12px] leading-relaxed text-ink-3">
        <div>
          {attributionDetail.label}{" "}
          <b className="text-ink-2 font-semibold">{attributionDetail.value}</b>
          {attributionDetail.status && (
            <>
              {" "}
              <span className="text-ink-4">({attributionDetail.status})</span>
            </>
          )}
          {" · "}
          {formatTs(claim.utterance_start)}
        </div>
        {sourceAnchor && (
          <div className="mt-1">
            Source position{" "}
            <b className="text-ink-2 font-semibold">{sourceAnchor}</b>
          </div>
        )}
        {claimContext && (
          <div className="mt-1">
            Quick-check context{" "}
            <b className="text-ink-2 font-semibold">{claimContext}</b>
          </div>
        )}
      </div>

      {/* ── Action row ─────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap pt-2">
        <ActionButton label="Share" onClick={onShare} />
        <ActionButton label="Save" onClick={() => setSaveOpen(true)} />
        <ActionButton label="Export" onClick={() => setExportOpen(true)} />
        <ActionButton
          label="Re-check"
          onClick={onRecheck}
          disabled={rechecking || claim.status === "checking"}
          loading={rechecking}
        />
        <ActionButton
          label={disputed ? "Marked for review" : "Dispute"}
          onClick={onDispute}
          disabled={disputed}
          tooltip={
            disputed
              ? "This claim is already marked for human review."
              : "Mark this claim result for human review."
          }
        />
      </div>

      {/* ── Footer links ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-[11px] text-ink-3 pt-3 border-t border-line-soft flex-wrap gap-2">
        <Link
          href={sessionViewHref(
            searchParams,
            "transcript",
            { block: null, from: null },
            `claim-${claim.id}`,
          )}
          data-testid="claim-transcript-link"
          className="inline-flex min-h-11 items-center hover:text-ink-2 transition-colors"
        >
          See in transcript context →
        </Link>
        <Link
          href={sessionPathHref(searchParams, `/session/learn/claim/${claim.id}`)}
          data-testid="claim-learn-link"
          className="inline-flex min-h-11 items-center hover:text-ink-2 transition-colors"
        >
          Learn more →
        </Link>
      </div>

      {saveOpen && <SaveSessionDialog open={saveOpen} onClose={() => setSaveOpen(false)} />}
      {exportOpen && <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
