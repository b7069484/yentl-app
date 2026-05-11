import type { Source } from "@/lib/types";
import { REPUTATION_TIER, STANCE } from "@/lib/client/verdict-theme";

export function SourceListItem({ source }: { source: Source }) {
  const tier = REPUTATION_TIER[source.reputation_tier];
  const stance = STANCE[source.stance];

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card/70 p-2.5 transition hover:border-foreground/30 hover:bg-card"
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold leading-none ${stance.tone}`}
        title={stance.label}
      >
        {stance.icon}
      </span>
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
      </div>
    </a>
  );
}
