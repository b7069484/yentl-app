import {
  CheckCircle,
  XCircle,
  HelpCircle,
  CircleEllipsis,
} from "lucide-react";
import { AIGeneratedBadge } from "@/components/ui/ai-generated-badge";
import { ReportVerdictButton } from "./ReportVerdictButton";

export type VerdictValue = "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED";

interface Source {
  url: string;
  domain: string;
  reputation: "high" | "medium" | "low";
}

interface Marker {
  type: string;
  severity: "subtle" | "clear" | "blatant";
}

interface VerdictCardProps {
  verdict: VerdictValue;
  claim: string;
  summary: string;
  sources: Source[];
  markers: Marker[];
}

const VERDICT_CONFIG: Record<
  VerdictValue,
  { stripe: string; icon: React.ElementType; label: string; aria: string }
> = {
  TRUE: {
    stripe: "bg-[#16A34A]",
    icon: CheckCircle,
    label: "✓ TRUE",
    aria: "Verdict: True",
  },
  FALSE: {
    stripe: "bg-[#DC2626]",
    icon: XCircle,
    label: "✗ FALSE",
    aria: "Verdict: False",
  },
  MIXED: {
    stripe: "bg-[#F59E0B]",
    icon: CircleEllipsis,
    label: "◐ MIXED",
    aria: "Verdict: Mixed",
  },
  UNVERIFIED: {
    stripe: "bg-[#6B7280]",
    icon: HelpCircle,
    label: "? UNVERIFIED",
    aria: "Verdict: Unverified",
  },
};

const REPUTATION_COLORS: Record<Source["reputation"], string> = {
  high: "text-green-700",
  medium: "text-amber-700",
  low: "text-red-700",
};

const SEVERITY_COLORS: Record<Marker["severity"], string> = {
  subtle: "bg-yellow-100 text-yellow-800",
  clear: "bg-orange-100 text-orange-800",
  blatant: "bg-red-100 text-red-800",
};

export function VerdictCard({
  verdict,
  claim,
  summary,
  sources,
  markers,
}: VerdictCardProps) {
  const config = VERDICT_CONFIG[verdict];
  const Icon = config.icon;

  return (
    <article
      className="overflow-hidden rounded-lg border border-border shadow-sm"
      aria-label={config.aria}
    >
      {/* Color stripe — color is NOT the sole encoding; label + icon also present (WCAG 1.4.1) */}
      <div className={`flex items-center gap-2 px-4 py-2 text-white ${config.stripe}`}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-mono text-sm font-bold uppercase tracking-wide">
          {config.label}
        </span>
        <span className="ml-auto">
          <AIGeneratedBadge className="bg-white/20 text-white" />
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-sm font-medium">{claim}</p>
        <p className="text-sm text-muted-foreground">{summary}</p>

        {sources.length > 0 && (
          <ul aria-label="Sources" className="space-y-1">
            {sources.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
                >
                  {s.domain}
                </a>
                <span className={`font-medium ${REPUTATION_COLORS[s.reputation]}`}>
                  {s.reputation}
                </span>
              </li>
            ))}
          </ul>
        )}

        {markers.length > 0 && (
          <div aria-label="Detected markers" className="flex flex-wrap gap-1">
            {markers.map((m, i) => (
              <span
                key={i}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[m.severity]}`}
              >
                {m.type}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <ReportVerdictButton />
        </div>
      </div>
    </article>
  );
}
