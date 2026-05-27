"use client";

import type { Source } from "@/lib/types";
import { MARKER_ASSETS, MARKER_ASSET_STATS } from "@/lib/visual-evidence/marker-assets";
import { MarkerAssetIcon } from "./marker-asset-icon";
import { SourceCard } from "./source-card";
import { SourceListItem } from "./SourceListItem";

const validatedSource: Source = {
  url: "https://www.youtube.com/watch?v=YP-4M0OZTRQ",
  domain: "youtube.com",
  title: "Verified video source with exact YouTube thumbnail",
  reputation_tier: "high",
  stance: "supports",
  excerpt: "The evidence card shows only thumbnails validated from the source provider itself.",
  preview: {
    image_url: "https://i.ytimg.com/vi/YP-4M0OZTRQ/hqdefault.jpg",
    image_alt: "Exact YouTube thumbnail for the source video",
    title: "Verified video source with exact YouTube thumbnail",
    description: "Source preview example using YouTube's provider thumbnail.",
    fetched_at: 0,
    image_status: "validated",
    image_source: "youtube_oembed",
    image_final_url: "https://i.ytimg.com/vi/YP-4M0OZTRQ/hqdefault.jpg",
    image_content_type: "image/jpeg",
    image_dimensions: { width: 480, height: 360 },
    validated_at: 0,
    unavailable_reason: null,
  },
};

const missingSource: Source = {
  url: "https://example.org/no-image",
  domain: "example.org",
  title: "Article source without a validated thumbnail",
  reputation_tier: "mid",
  stance: "mixed",
  excerpt: "When the exact source image is unavailable, Yentl says so instead of inventing one.",
  preview: {
    image_url: null,
    image_alt: null,
    title: "Article source without a validated thumbnail",
    description: null,
    fetched_at: 0,
    image_status: "missing",
    image_source: "none",
    image_final_url: null,
    image_content_type: null,
    image_dimensions: null,
    validated_at: null,
    unavailable_reason: "No source-provided thumbnail was found.",
  },
};

const featuredAssets = MARKER_ASSETS.filter((asset) =>
  ["loaded_language", "ad_hominem", "confirmation_bias", "false_dilemma", "dog_whistles", "gish_gallop"].includes(asset.canonical_id),
);

export function VisualEvidenceDashboard() {
  return (
    <section className="mt-5 grid gap-5">
      <div className="rounded-lg border border-line bg-paper p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
              Launch-critical visual trust layer
            </div>
            <h2 className="mt-1 font-serif text-[26px] font-medium leading-tight text-ink">
              Visual Evidence System
            </h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-3">
              Claims show exact validated source imagery. Markers get a bespoke icon
              language across all 123 taxonomy entries. Motion is planned for the 16
              archetypes and high-frequency markers before broad animation rollout.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Metric label="Marker icons" value={MARKER_ASSET_STATS.total} />
            <Metric label="Implemented SVG" value={MARKER_ASSET_STATS.implemented} />
            <Metric label="Loops planned" value={MARKER_ASSET_STATS.heroLoops} />
            <Metric label="Marker loops planned" value={MARKER_ASSET_STATS.markerLoopsPlanned} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
        <section className="rounded-lg border border-line bg-paper p-4 shadow-sm">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            Source-card states
          </div>
          <div className="grid gap-3">
            <SourceCard source={validatedSource} />
            <SourceCard source={missingSource} />
            <SourceListItem source={validatedSource} />
            <SourceListItem source={missingSource} />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-paper p-4 shadow-sm">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            Transcript hit effects
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[12px] font-semibold text-ink-2">Layered live moment</div>
              <span className="rounded-full border border-teal/20 bg-teal-soft px-2 py-0.5 text-[10px] font-semibold text-teal">
                reduced-motion safe
              </span>
            </div>
            <p className="max-w-2xl text-[15px] leading-relaxed text-ink-2">
              Speaker 2 says the policy is{" "}
              <span className="rounded-sm border-b-2 border-green bg-green-soft px-1 text-green">
                supported by two sources
              </span>
              , then pivots with{" "}
              <span className="rounded-sm border-b-2 border-rose-300 bg-rose-50 px-1 text-rose-700">
                a loaded-language marker
              </span>{" "}
              and the next hit stacks into a concise top-line update instead of flooding the screen.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {["Hit glow", "Stack count", "Bright resolve"].map((label) => (
                <div key={label} className="rounded-md border border-line bg-cream px-3 py-2 text-[12px] text-ink-3">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-paper p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
              Marker icon production grid
            </div>
            <h3 className="mt-1 font-serif text-[22px] leading-tight text-ink">
              123 bespoke marker assets
            </h3>
          </div>
          <div className="rounded-md border border-line-soft bg-cream px-3 py-2 text-[12px] text-ink-3">
            Duotone stroke · white background · Higgsfield prompt manifest + sample master ready
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {featuredAssets.map((asset) => (
            <article key={asset.canonical_id} className="rounded-lg border border-line bg-cream p-3">
              <div className="mb-3 flex items-center gap-3">
                <MarkerAssetIcon canonicalId={asset.canonical_id} type={asset.type} display={asset.display} size="lg" />
                <div className="min-w-0">
                  <h4 className="truncate text-[14px] font-semibold text-ink">{asset.display}</h4>
                  <p className="text-[11px] text-ink-4">{asset.type} · {asset.archetype}</p>
                </div>
              </div>
              <p className="line-clamp-3 text-[11.5px] leading-relaxed text-ink-3">
                {asset.prompt}
              </p>
            </article>
          ))}
        </div>

        <div className="max-h-[520px] overflow-auto rounded-lg border border-line bg-cream">
          <div className="grid grid-cols-[72px_minmax(180px,1fr)_110px_130px_130px] border-b border-line bg-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            <span>Icon</span>
            <span>Marker</span>
            <span>Type</span>
            <span>Motion</span>
            <span>Status</span>
          </div>
          {MARKER_ASSETS.map((asset) => (
            <div
              key={asset.canonical_id}
              className="grid grid-cols-[72px_minmax(180px,1fr)_110px_130px_130px] items-center gap-2 border-b border-line-soft px-3 py-2 text-[12px] last:border-b-0"
            >
              <MarkerAssetIcon canonicalId={asset.canonical_id} type={asset.type} display={asset.display} size="sm" />
              <div className="min-w-0">
                <div className="truncate font-medium text-ink-2">{asset.display}</div>
                <div className="truncate font-mono text-[10px] text-ink-4">{asset.canonical_id}</div>
              </div>
              <span className="text-ink-3">{asset.type}</span>
              <span className="text-ink-3">{asset.motion_status.replaceAll("_", " ")}</span>
              <span className="rounded-full border border-green/20 bg-green-soft px-2 py-0.5 text-[10px] font-semibold text-green">
                {asset.approval_status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line-soft bg-cream px-3 py-2">
      <div className="font-serif text-[22px] leading-none text-ink">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
        {label}
      </div>
    </div>
  );
}
