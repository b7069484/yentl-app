"use client";

import { ExternalLink, ImageOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Source, SourcePreview, Stance, ReputationTier } from "@/lib/types";
import { isValidatedSourceImage, sourceImageTrustLabel } from "@/lib/client/source-preview";

// ─── Theme maps ───────────────────────────────────────────────────────────────

const STANCE_DOT: Record<Stance, string> = {
  supports:    "bg-green",
  contradicts: "bg-red",
  mixed:       "bg-orange",
};

const REPUTATION_COLOR: Record<ReputationTier, string> = {
  high: "text-green",
  mid:  "text-slate",
  low:  "text-red",
};

const REPUTATION_LABEL: Record<ReputationTier, string> = {
  high: "HIGH",
  mid:  "MID",
  low:  "LOW",
};

const STANCE_LABEL: Record<Stance, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  mixed: "Mixed",
};

const IMAGE_SOURCE_LABEL: Record<NonNullable<SourcePreview["image_source"]>, string> = {
  open_graph: "Open Graph",
  twitter_card: "Twitter card",
  schema_org: "schema.org",
  youtube_oembed: "YouTube oEmbed",
  none: "No source image",
};

function imageSourceLabel(source: SourcePreview["image_source"]): string {
  return source ? IMAGE_SOURCE_LABEL[source] : "No source image";
}

function dimensionsLabel(source: Source): string | null {
  const dimensions = source.preview?.image_dimensions;
  if (!dimensions) return null;
  return `${dimensions.width}x${dimensions.height}`;
}

function hostLabel(source: Source): string {
  return source.preview?.title && source.preview.title !== source.title
    ? source.preview.title
    : source.domain;
}

// ─── SourceCard ───────────────────────────────────────────────────────────────

export function SourceCard({
  source,
  detailHref,
}: {
  source: Source;
  detailHref?: string;
}) {
  const initial = source.domain[0]?.toUpperCase() ?? "?";
  const preview = source.preview;
  const hasThumbnail = isValidatedSourceImage(preview);
  const trustLabel = sourceImageTrustLabel(preview);
  const imageMeta = [
    imageSourceLabel(preview?.image_source),
    preview?.image_content_type,
    dimensionsLabel(source),
  ].filter(Boolean);

  return (
    <div
      data-testid="source-card"
      className="flex w-full min-w-0 gap-3 rounded-[10px] border border-line-soft bg-cream-2 p-3"
    >
      <div className="w-24 flex-shrink-0">
        {hasThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.image_url}
            alt={preview.image_alt ?? preview.title ?? source.title}
            className="aspect-[4/3] w-full rounded-lg border border-line-soft bg-white object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-white px-2 text-center">
            <ImageOff className="h-4 w-4 text-ink-4" aria-hidden />
            <span className="text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-ink-4">
              No source thumbnail
            </span>
            <span className="font-mono text-[13px] font-semibold text-ink-3" aria-hidden>
              {initial}
            </span>
          </div>
        )}
      </div>
      <div data-testid="source-card-body" className="min-w-0 flex-1">
        <a
          data-testid="source-open-link"
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex min-h-11 max-w-full items-center gap-1.5 text-[13px] font-semibold leading-snug tracking-tight text-ink hover:text-teal"
        >
          <span className="truncate">{source.title}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-45 group-hover:opacity-80" aria-hidden />
          <span className="sr-only">Open source</span>
        </a>
        <div className="mt-0.5 truncate text-[11px] text-ink-4">
          {hostLabel(source)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-4">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-paper ${STANCE_DOT[source.stance]}`}
          />
          <span>{STANCE_LABEL[source.stance]}</span>
          <span>·</span>
          <span className={`font-semibold uppercase ${REPUTATION_COLOR[source.reputation_tier]}`}>
            {REPUTATION_LABEL[source.reputation_tier]} reputation
          </span>
          <span>·</span>
          <span className="truncate">{source.domain}</span>
        </div>
        {source.excerpt && (
          <div className="font-serif italic text-[12px] text-ink-3 mt-1.5 pl-2 border-l-2 border-line line-clamp-3">
            {source.excerpt}
          </div>
        )}
        {detailHref && (
          <Link
            href={detailHref}
            data-testid="source-detail-link"
            className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-line bg-paper px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3 transition-colors hover:bg-cream hover:text-ink-2"
          >
            Source detail
          </Link>
        )}
        <div className="mt-2 rounded-md border border-line bg-paper px-2 py-1.5 text-[10.5px] leading-snug text-ink-4">
          <div className="flex items-start gap-1.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden />
            <div className="min-w-0">
              <div className="font-semibold text-ink-3">
                {trustLabel}
              </div>
              {hasThumbnail ? (
                <div className="mt-0.5 truncate">
                  {imageMeta.join(" · ")}
                </div>
              ) : (
                <div className="mt-0.5">
                  Yentl did not invent a replacement image.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
