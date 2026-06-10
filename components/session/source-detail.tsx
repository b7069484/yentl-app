"use client";

import Link from "next/link";
import { ExternalLink, ImageOff, ShieldCheck } from "lucide-react";
import type { ClaimCard, Source, PrimaryLabel } from "@/lib/types";
import { isValidatedSourceImage, sourceImageTrustLabel } from "@/lib/client/source-preview";
import {
  sourceClaimOverlap,
  sourceEvidenceBreakdown,
  sourceEvidenceScore,
} from "@/lib/source-evidence";

const SOURCE_DETAIL_SEPARATOR = "__source__";

const STANCE_LABEL: Record<Source["stance"], string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  mixed: "Mixed",
};

const STANCE_CLASS: Record<Source["stance"], string> = {
  supports: "border-green/30 bg-green-soft text-green",
  contradicts: "border-red/30 bg-red-soft text-red",
  mixed: "border-orange/30 bg-orange-soft text-orange",
};

const REPUTATION_LABEL: Record<Source["reputation_tier"], string> = {
  high: "High reputation",
  mid: "Mid reputation",
  low: "Low reputation",
};

const VERDICT_LABEL: Record<PrimaryLabel, string> = {
  TRUE: "Supported",
  MOSTLY_TRUE: "Mostly supported",
  PARTIAL: "Partial",
  MISLEADING: "Misleading",
  OMISSION: "Omission",
  FALSE: "False",
  UNVERIFIABLE: "No reliable backing",
  OPINION: "Opinion",
};

export type SourceDetailSelection = {
  claim: ClaimCard;
  source: Source;
  sourceIndex: number;
};

export function sourceDetailId(claimId: string, sourceIndex: number): string {
  return `${encodeURIComponent(claimId)}${SOURCE_DETAIL_SEPARATOR}${sourceIndex}`;
}

export function parseSourceDetailId(id: string): { claimId: string; sourceIndex: number } | null {
  const separatorIndex = id.lastIndexOf(SOURCE_DETAIL_SEPARATOR);
  if (separatorIndex === -1) return null;

  const rawClaimId = id.slice(0, separatorIndex);
  const rawSourceIndex = id.slice(separatorIndex + SOURCE_DETAIL_SEPARATOR.length);
  const sourceIndex = Number(rawSourceIndex);
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0) return null;

  try {
    return { claimId: decodeURIComponent(rawClaimId), sourceIndex };
  } catch {
    return null;
  }
}

export function findSourceDetailSelection(
  claims: ClaimCard[],
  id: string,
): SourceDetailSelection | null {
  const parsed = parseSourceDetailId(id);
  if (!parsed) return null;

  const claim = claims.find((item) => item.id === parsed.claimId);
  const source = claim?.sources[parsed.sourceIndex];
  if (!claim || !source) return null;

  return {
    claim,
    source,
    sourceIndex: parsed.sourceIndex,
  };
}

export function SourceDetail({ selection }: { selection: SourceDetailSelection }) {
  const { claim, source, sourceIndex } = selection;
  const preview = source.preview;
  const hasImage = isValidatedSourceImage(preview);
  const imageTrust = sourceImageTrustLabel(preview);
  const evidenceScore = sourceEvidenceScore(source);
  const evidenceBreakdown = sourceEvidenceBreakdown(source);
  const claimOverlap = sourceClaimOverlap(claim.claim_text, source.excerpt);
  const dimensions = preview?.image_dimensions
    ? `${preview.image_dimensions.width}x${preview.image_dimensions.height}`
    : null;
  const previewMeta = [
    preview?.title,
    preview?.description,
    preview?.image_source,
    preview?.image_content_type,
    dimensions,
  ].filter(Boolean);

  return (
    <div
      data-testid="source-detail"
      className="mx-auto flex w-full max-w-[920px] flex-col gap-4 px-6 pb-12 pt-4 md:px-8"
    >
      <section className="rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-4">
              Source detail {sourceIndex + 1}
            </p>
            <h1 className="mt-2 break-words font-serif text-[30px] font-medium leading-tight text-ink md:text-[42px]">
              {source.title}
            </h1>
            <p className="mt-2 break-all text-[13px] text-ink-4">{source.url}</p>
          </div>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-teal px-4 text-[12px] font-semibold text-white hover:bg-teal-2"
          >
            Open source <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${STANCE_CLASS[source.stance]}`}>
            {STANCE_LABEL[source.stance]}
          </span>
          <span className="rounded-full border border-line bg-cream px-3 py-1 text-[11px] font-bold uppercase text-ink-3">
            {REPUTATION_LABEL[source.reputation_tier]}
          </span>
          <span className="rounded-full border border-line bg-cream px-3 py-1 text-[11px] font-bold uppercase text-ink-3">
            Evidence score {evidenceScore}
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-4">
            Visual provenance
          </div>
          {hasImage ? (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.image_url}
                alt={preview.image_alt ?? preview.title ?? source.title}
                className="aspect-[4/3] w-full rounded-xl border border-line bg-white object-cover"
              />
            </div>
          ) : (
            <div className="mt-3 flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-cream text-center">
              <ImageOff className="h-7 w-7 text-ink-4" aria-hidden />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-4">
                No source thumbnail
              </p>
            </div>
          )}
          <div className="mt-3 rounded-lg border border-line bg-cream px-3 py-2 text-[12px] leading-relaxed text-ink-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
              <div>
                <div className="font-semibold text-ink-2">{imageTrust}</div>
                {previewMeta.length > 0 && (
                  <div className="mt-1">{previewMeta.join(" - ")}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <section className="rounded-2xl border border-line bg-paper p-4">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-4">
              Evidence quality
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Metric label="Evidence score" value={String(evidenceScore)} />
              <Metric label="Breakdown" value={evidenceBreakdown} />
              <Metric label="Claim link" value={claimOverlap} />
              <Metric label="Publisher" value={source.domain} />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-paper p-4">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-4">
              Source excerpt
            </div>
            {source.excerpt ? (
              <p className="mt-3 border-l-2 border-line pl-3 font-serif text-[18px] italic leading-8 text-ink-2">
                &ldquo;{source.excerpt}&rdquo;
              </p>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-line bg-cream px-3 py-2 text-[13px] text-ink-3">
                No source excerpt is attached to this citation yet.
              </p>
            )}
          </section>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-4">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-4">
          Attached claim
        </div>
        <p className="mt-3 font-serif text-[22px] italic leading-8 text-ink-2">
          &ldquo;{claim.claim_text}&rdquo;
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
          <span className="rounded-full border border-line bg-cream px-3 py-1 font-semibold">
            {VERDICT_LABEL[claim.primary_label]}
          </span>
          <span className="rounded-full border border-line bg-cream px-3 py-1 font-semibold">
            {Math.round(claim.score)} / 100
          </span>
          <Link
            href={`/session/detail/claim/${claim.id}`}
            data-testid="source-parent-claim-link"
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-cream px-3 font-semibold text-ink-2 hover:bg-cream-2"
          >
            Open parent claim
          </Link>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-cream px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-4">
        {label}
      </div>
      <div className="mt-1 break-words text-[13px] font-semibold leading-6 text-ink-2">
        {value}
      </div>
    </div>
  );
}
