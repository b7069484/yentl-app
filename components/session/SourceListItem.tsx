import type { Source } from "@/lib/types";
import { REPUTATION_TIER, STANCE } from "@/lib/client/verdict-theme";
import { isValidatedSourceImage, sourceImageTrustLabel } from "@/lib/client/source-preview";

export function SourceListItem({ source }: { source: Source }) {
  const tier = REPUTATION_TIER[source.reputation_tier];
  const stance = STANCE[source.stance];
  const preview = source.preview;
  const hasThumbnail = isValidatedSourceImage(preview);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card/70 p-2.5 transition hover:border-foreground/30 hover:bg-card"
    >
      {hasThumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image_url}
          alt={preview.image_alt ?? preview.title ?? source.title}
          className="mt-0.5 h-14 w-20 shrink-0 rounded-md border border-border/60 bg-white object-cover"
        />
      ) : (
        <span
          aria-hidden
          className={`mt-0.5 flex h-14 w-20 shrink-0 items-center justify-center rounded-md border bg-background text-[13px] font-semibold leading-none ${stance.tone}`}
          title={stance.label}
        >
          {source.domain[0]?.toUpperCase() ?? stance.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {source.title}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate font-mono">{source.domain}</span>
          <span aria-hidden>·</span>
          <span
            className={`rounded-full border px-1.5 py-px text-[10px] font-medium uppercase tracking-wider ${tier.pill}`}
            title={tier.description}
          >
            {tier.label}
          </span>
        </div>
        {source.excerpt && (
          <p className="mt-1.5 line-clamp-3 text-xs italic leading-relaxed text-foreground/70">
            &ldquo;{source.excerpt}&rdquo;
          </p>
        )}
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {sourceImageTrustLabel(source.preview)}
        </p>
      </div>
    </a>
  );
}
