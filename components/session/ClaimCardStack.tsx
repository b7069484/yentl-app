"use client";
import { useSession } from "@/lib/client/session-store";
import { ClaimCard } from "./ClaimCard";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ClaimCardStack({
  highlightedId,
  onCardClick,
}: {
  highlightedId?: string | null;
  onCardClick?: (id: string, utteranceStart: number) => void;
} = {}) {
  const claims = useSession((s) => s.claims);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2.5 p-4 pr-3">
        {claims.length === 0 ? (
          <EmptyState />
        ) : (
          claims
            .slice()
            .reverse()
            .map((c) => (
              <div
                key={c.id}
                data-claim-id={c.id}
                className="animate-in fade-in slide-in-from-top-1 duration-300"
              >
                <ClaimCard
                  card={c}
                  highlighted={highlightedId === c.id}
                  onClick={
                    onCardClick
                      ? () => onCardClick(c.id, c.utterance_start)
                      : undefined
                  }
                />
              </div>
            ))
        )}
      </div>
    </ScrollArea>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-5 text-sm">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        Awaiting claims
      </div>
      <p className="mt-2 text-foreground/80">
        Factual claims get extracted as you speak — statistics, dates,
        attributions, named events.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Opinions, predictions, and rhetorical moves go to the markers column
        instead.
      </p>
    </div>
  );
}
