"use client";
import { useMemo } from "react";
import { useSession } from "@/lib/client/session-store";
import { MarkerChip } from "./MarkerChip";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MarkersPanel({
  onMarkerClick,
}: {
  onMarkerClick?: (start: number) => void;
} = {}) {
  const markers = useSession((s) => s.markers);
  // Compute counts via useMemo — returning a fresh object from a Zustand
  // selector trips React's "getServerSnapshot should be cached" guard.
  const counts = useMemo(
    () =>
      markers.reduce(
        (acc, m) => {
          acc[m.type] = (acc[m.type] ?? 0) + 1;
          return acc;
        },
        { bias: 0, fallacy: 0, rhetoric: 0 } as Record<string, number>,
      ),
    [markers],
  );

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        <Summary counts={counts} total={markers.length} />
        {markers.length === 0 ? (
          <EmptyState />
        ) : (
          markers
            .slice()
            .reverse()
            .map((m) => (
              <div
                key={m.id}
                className="animate-in fade-in slide-in-from-top-1 duration-300"
              >
                <MarkerChip
                  marker={m}
                  onClick={
                    onMarkerClick ? () => onMarkerClick(m.start_time) : undefined
                  }
                />
              </div>
            ))
        )}
      </div>
    </ScrollArea>
  );
}

function Summary({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {total === 0 ? "No markers yet" : `${total} marker${total === 1 ? "" : "s"} flagged`}
      </div>
      <div className="mt-1.5 flex gap-3 text-[11px]">
        <CountChip dot="bg-rose-400" label="Fallacy" n={counts.fallacy ?? 0} />
        <CountChip dot="bg-indigo-400" label="Bias" n={counts.bias ?? 0} />
        <CountChip dot="bg-teal-400" label="Rhetoric" n={counts.rhetoric ?? 0} />
      </div>
    </div>
  );
}

function CountChip({
  dot,
  label,
  n,
}: {
  dot: string;
  label: string;
  n: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-foreground/70">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="font-mono tabular-nums">{n}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-card/40 px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">
      Biases, fallacies, and rhetorical patterns will land here as you talk —
      grouped by the 123-entry taxonomy.
    </div>
  );
}
