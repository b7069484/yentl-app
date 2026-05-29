import type { ClaimCard as ClaimCardT } from "@/lib/types";
import { VERDICT } from "@/lib/client/verdict-theme";
import { SourceListItem } from "./SourceListItem";
import { SpeakerBadge } from "./SpeakerBadge";
import { ClaimStanceBadge } from "./ClaimStanceBadge";
import { ConfidenceTierBadge } from "./ConfidenceTierBadge";
import Image from "next/image";
import type { ReputationTier, SourcePreview, Stance } from "@/lib/types";
import { isValidatedSourceImage, sourceImageTrustLabel } from "@/lib/client/source-preview";

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
  const isPending =
    card.status === "checking" ||
    (card.status === "provisional" && card.primary_label === "UNVERIFIABLE");
  const isProvisional = card.status === "provisional" && !isPending;

  return (
    <article
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 ${
        highlighted
          ? `border-foreground/40 ring-2 ${verdict.ring} ring-offset-2 ring-offset-background`
          : "border-border/70 hover:border-foreground/30 hover:shadow-md"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Phase 1b Task 6: OPINION uses a diamond glyph at the top-left
          instead of the full-height colored stripe, so it's distinguishable
          from verdict-bearing labels by SHAPE not just color (PolitiFact #23:
          "OPINION is a classification, not a verdict"). Helps colorblind users
          and survives black-and-white screenshots. */}
      {card.primary_label === "OPINION" ? (
        <span
          aria-hidden
          data-verdict-shape="diamond"
          className={`absolute left-1 top-2 size-2.5 rotate-45 ${verdict.dot} ${
            isPending ? "opacity-40" : "opacity-100"
          }`}
        />
      ) : (
        <span
          aria-hidden
          data-verdict-shape="stripe"
          className={`absolute inset-y-0 left-0 w-1 ${verdict.dot} ${
            isPending ? "opacity-40" : "opacity-100"
          }`}
        />
      )}

      {!compact && (() => {
        const hero = pickHero(card);
        if (!isValidatedSourceImage(hero)) return null;
        const heroSource = card.sources.find((s) => s.preview?.image_url === hero.image_url);
        const stanceLabel: Record<Stance, string> = {
          supports: "supports this claim",
          contradicts: "contradicts this claim",
          mixed: "mixed take on this claim",
        };
        return (
          <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/60">
            <Image
              src={hero.image_url}
              alt={hero.image_alt ?? hero.title ?? "Source preview"}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2.5">
              {hero.title && (
                <p className="text-[12px] font-medium leading-tight text-white line-clamp-2">{hero.title}</p>
              )}
              {heroSource && (
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/80">
                  Source: {heroSource.domain} · {stanceLabel[heroSource.stance]}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-white/75">
                {sourceImageTrustLabel(hero)}
              </p>
            </div>
          </div>
        );
      })()}

      <header className="flex items-start justify-between gap-3 pl-5 pr-4 pt-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {!isPending && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${verdict.pill}`}
            >
              {verdict.short}
            </span>
          )}
          <StatusPill
            status={card.status}
            sourceCount={card.sources.length}
          />
          {!isPending && !compact && (
            <ConfidenceTierBadge score={card.score} />
          )}
          {card.topic && card.topic !== "Other" && (
            <span className="inline-flex items-center rounded-full border border-border/50 bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/60">
              {card.topic}
            </span>
          )}
          <SpeakerBadge speakerId={card.speaker_id} />
        </div>
        {!isPending && <ScoreNumber score={card.score} colorClass={verdict.scoreText} />}
      </header>

      <div
        className={`pl-5 pr-4 ${
          compact ? "space-y-1.5 pb-3 pt-2.5" : "space-y-3 pb-4 pt-3"
        }`}
      >
        {/* Phase 1b: surface the speaker's stance toward the claim
            (denied / quoted / mocked / hedged / …). Asserted renders null. */}
        {card.stance && card.stance !== "asserted" && (
          <ClaimStanceBadge stance={card.stance} className="mb-1" />
        )}
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

function pickHero(card: ClaimCardT): SourcePreview | null {
  if (card.sources.length === 0) return null;
  const expectedStance: Stance | null =
    card.primary_label === "TRUE" || card.primary_label === "MOSTLY_TRUE" ? "supports" :
    card.primary_label === "FALSE" || card.primary_label === "MISLEADING" || card.primary_label === "OMISSION" ? "contradicts" :
    null;

  const tierRank = (t: ReputationTier) => (t === "high" ? 2 : t === "mid" ? 1 : 0);

  const sorted = [...card.sources].sort((a, b) => {
    const t = tierRank(b.reputation_tier) - tierRank(a.reputation_tier);
    if (t !== 0) return t;
    if (expectedStance) {
      const s = (b.stance === expectedStance ? 1 : 0) - (a.stance === expectedStance ? 1 : 0);
      if (s !== 0) return s;
    }
    return 0;
  });

  for (const s of sorted) if (isValidatedSourceImage(s.preview)) return s.preview;
  return null;
}
