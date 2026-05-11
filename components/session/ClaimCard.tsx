import type { ClaimCard as ClaimCardT } from "@/lib/types";
import { VERDICT } from "@/lib/client/verdict-theme";
import { SourceListItem } from "./SourceListItem";

export function ClaimCard({
  card,
  onClick,
  highlighted = false,
  compact = false,
}: {
  card: ClaimCardT;
  onClick?: () => void;
  highlighted?: boolean;
  compact?: boolean;
}) {
  const verdict = VERDICT[card.primary_label];
  const isPending = card.status === "checking";
  const isProvisional = card.status === "provisional";

  return (
    <article
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 ${
        highlighted
          ? `border-foreground/40 ring-2 ${verdict.ring} ring-offset-2 ring-offset-background`
          : "border-border/70 hover:border-foreground/30 hover:shadow-md"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Status stripe — color-coded vertical bar to give a glanceable verdict cue */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${verdict.dot} ${
          isPending ? "opacity-40" : "opacity-100"
        }`}
      />

      <header className="flex items-start justify-between gap-3 pl-5 pr-4 pt-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${verdict.pill}`}
          >
            {verdict.short}
          </span>
          <StatusPill
            status={card.status}
            sourceCount={card.sources.length}
          />
        </div>
        <ScoreNumber score={card.score} colorClass={verdict.scoreText} />
      </header>

      <div
        className={`pl-5 pr-4 ${
          compact ? "space-y-1.5 pb-3 pt-2.5" : "space-y-3 pb-4 pt-3"
        }`}
      >
        <p
          className={`font-medium leading-snug text-foreground ${
            compact ? "line-clamp-3 text-[13px]" : "text-[15px]"
          }`}
        >
          &ldquo;{card.claim_text}&rdquo;
        </p>

        {isPending ? (
          <SkeletonLines lines={compact ? 1 : 2} />
        ) : compact ? null : (
          <p
            className={`text-sm leading-relaxed ${
              isProvisional ? "text-foreground/70" : "text-foreground/80"
            }`}
          >
            {card.explanation}
          </p>
        )}

        {!isPending && !compact && card.annotations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.annotations.map((a, i) => (
              <span
                key={i}
                className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] italic text-foreground/70"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {!compact && card.sources.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Sources · {card.sources.length}
            </div>
            <div className="space-y-1.5">
              {card.sources.map((s, i) => (
                <SourceListItem key={i} source={s} />
              ))}
            </div>
          </div>
        )}

        {compact && card.sources.length > 0 && (
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {card.sources.length} source{card.sources.length === 1 ? "" : "s"} cited
          </div>
        )}
      </div>
    </article>
  );
}

function StatusPill({
  status,
  sourceCount,
}: {
  status: ClaimCardT["status"];
  sourceCount: number;
}) {
  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/70" />
        Checking
      </span>
    );
  }
  if (status === "provisional") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Provisional
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Confirmed
      {sourceCount > 0 && (
        <span className="font-mono normal-case tracking-normal text-emerald-700/80">
          · {sourceCount}
        </span>
      )}
    </span>
  );
}

function ScoreNumber({
  score,
  colorClass,
}: {
  score: number;
  colorClass: string;
}) {
  return (
    <div className="flex shrink-0 items-baseline gap-0.5 leading-none">
      <span
        className={`font-mono text-2xl font-semibold tabular-nums ${colorClass}`}
      >
        {score}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        /100
      </span>
    </div>
  );
}

function SkeletonLines({ lines }: { lines: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="block h-3 animate-pulse rounded bg-muted"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
