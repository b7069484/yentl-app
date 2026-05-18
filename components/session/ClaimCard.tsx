import type { ClaimCard as ClaimCardT } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceListItem } from "./SourceListItem";

const LABEL_STYLE: Record<ClaimCardT["primary_label"], string> = {
  TRUE: "bg-green-600 text-white",
  MOSTLY_TRUE: "bg-green-500 text-white",
  PARTIAL: "bg-amber-500 text-white",
  MISLEADING: "bg-orange-500 text-white",
  OMISSION: "bg-orange-600 text-white",
  FALSE: "bg-red-600 text-white",
  UNVERIFIABLE: "bg-gray-500 text-white",
  OPINION: "bg-gray-400 text-white",
};

export function ClaimCard({
  card,
  onClick,
}: {
  card: ClaimCardT;
  onClick?: () => void;
}) {
  return (
    <Card onClick={onClick} className={onClick ? "cursor-pointer" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <Badge className={LABEL_STYLE[card.primary_label]}>
          {card.primary_label}
        </Badge>
        <span className="font-mono text-sm font-bold tabular-nums">
          {card.score}
          <span className="text-xs font-normal text-muted-foreground"> / 100</span>
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm font-medium">&ldquo;{card.claim_text}&rdquo;</p>
        <p className="text-sm text-muted-foreground">{card.explanation}</p>
        {card.annotations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.annotations.map((a, i) => (
              <Badge key={i} variant="secondary">
                {a}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`h-2 w-2 rounded-full ${
              card.status === "confirmed"
                ? "bg-green-500"
                : card.status === "provisional"
                  ? "bg-amber-500"
                  : "bg-gray-400 animate-pulse"
            }`}
          />
          <span>{card.status}</span>
          {card.status === "confirmed" && card.sources.length > 0 && (
            <span>
              · {card.sources.length} source
              {card.sources.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {card.sources.length > 0 && (
          <div className="space-y-1">
            {card.sources.map((s, i) => (
              <SourceListItem key={i} source={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
