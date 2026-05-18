import type { Source } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const TIER_LABEL: Record<
  Source["reputation_tier"],
  { label: string; className: string }
> = {
  high: {
    label: "HIGH",
    className: "bg-green-100 text-green-900 border-green-300",
  },
  mid: {
    label: "MID",
    className: "bg-amber-100 text-amber-900 border-amber-300",
  },
  low: {
    label: "LOW",
    className: "bg-red-100 text-red-900 border-red-300",
  },
};

const STANCE_ICON: Record<Source["stance"], string> = {
  supports: "✓",
  contradicts: "✗",
  mixed: "~",
};

export function SourceListItem({ source }: { source: Source }) {
  const tier = TIER_LABEL[source.reputation_tier];
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-2 rounded border p-2 hover:bg-accent"
    >
      <span className="font-mono text-sm">{STANCE_ICON[source.stance]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{source.title}</div>
        <div className="text-xs text-muted-foreground">{source.domain}</div>
        {source.excerpt && (
          <div className="mt-1 text-xs italic">&ldquo;{source.excerpt}&rdquo;</div>
        )}
      </div>
      <Badge variant="outline" className={tier.className}>
        {tier.label}
      </Badge>
    </a>
  );
}
