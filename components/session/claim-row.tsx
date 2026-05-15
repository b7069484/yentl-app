"use client";

import Link from "next/link";
import type { ClaimCard, PrimaryLabel } from "@/lib/types";
import { TopicChip } from "./chips";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SpeakerAvatar({
  speakerId,
  label,
}: {
  speakerId: number;
  label: string;
}) {
  const paletteIndex = (speakerId % 6) + 1;
  const initial = label[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden
      className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0 bg-spk-${paletteIndex}`}
    >
      {initial}
    </span>
  );
}

function stanceVerb(c: ClaimCard): string {
  const counts = { supports: 0, contradicts: 0, mixed: 0 };
  for (const s of c.sources) {
    counts[s.stance]++;
  }
  if (counts.contradicts > counts.supports) return "contradict";
  if (counts.supports > counts.contradicts) return "support";
  return "weigh in on";
}

// ─── Verdict color map ────────────────────────────────────────────────────────

const VERDICT_COLOR_MAP = {
  TRUE:         { text: "text-green",  borderLeft: "border-l-green"  },
  MOSTLY_TRUE:  { text: "text-green",  borderLeft: "border-l-green"  },
  PARTIAL:      { text: "text-orange", borderLeft: "border-l-orange" },
  MISLEADING:   { text: "text-orange", borderLeft: "border-l-orange" },
  OMISSION:     { text: "text-orange", borderLeft: "border-l-orange" },
  FALSE:        { text: "text-red",    borderLeft: "border-l-red"    },
  UNVERIFIABLE: { text: "text-slate",  borderLeft: "border-l-slate"  },
  OPINION:      { text: "text-slate",  borderLeft: "border-l-slate"  },
} as const satisfies Record<PrimaryLabel, { text: string; borderLeft: string }>;

const VERDICT_LABEL: Record<PrimaryLabel, string> = {
  TRUE:         "TRUE",
  MOSTLY_TRUE:  "MOSTLY TRUE",
  PARTIAL:      "PARTIAL",
  MISLEADING:   "MISLEADING",
  OMISSION:     "OMISSION",
  FALSE:        "FALSE",
  UNVERIFIABLE: "UNVERIFIABLE",
  OPINION:      "OPINION",
};

// ─── ClaimRow ─────────────────────────────────────────────────────────────────

export function ClaimRow({
  claim,
  speakerLabel,
  href,
}: {
  claim: ClaimCard;
  speakerLabel: string;
  href: string;
}) {
  const verdictColor = VERDICT_COLOR_MAP[claim.primary_label];
  const score = Math.round(claim.score);
  const sourceCount = claim.sources.length;

  const domainPreview =
    sourceCount > 0
      ? claim.sources
          .slice(0, 3)
          .map((s) => s.domain)
          .join(", ") + (sourceCount > 3 ? `, +${sourceCount - 3}` : "")
      : null;

  return (
    <Link
      href={href}
      className={`group bg-paper border border-line border-l-4 ${verdictColor.borderLeft} rounded-xl p-4 flex gap-4 items-center hover:border-ink-5 transition-colors`}
    >
      {/* Score block */}
      <div className="flex-shrink-0 w-[72px]">
        <div className={`font-serif text-[36px] font-medium ${verdictColor.text} leading-none`}>
          {score}
          <span className="font-sans text-[10px] font-bold uppercase tracking-wide text-ink-4 ml-0.5">
            /100
          </span>
        </div>
        <div
          className={`text-[9.5px] uppercase tracking-wider font-bold mt-1 ${verdictColor.text}`}
        >
          {VERDICT_LABEL[claim.primary_label]}
        </div>
      </div>

      {/* Content block */}
      <div className="flex-1 min-w-0">
        {/* Speaker row */}
        <div className="flex items-center gap-2 text-[11px] text-ink-3 mb-1.5 flex-wrap">
          <SpeakerAvatar
            speakerId={claim.speaker_id ?? 0}
            label={speakerLabel}
          />
          <span className="font-medium text-ink-2">{speakerLabel}</span>
          <span>·</span>
          <span>{formatTs(claim.utterance_start)}</span>
          {claim.topic && <TopicChip topic={claim.topic} />}
        </div>

        {/* Claim text */}
        <div className="font-serif italic text-[15px] text-ink-2 leading-snug line-clamp-2">
          &ldquo;{claim.claim_text}&rdquo;
        </div>

        {/* Sources row */}
        <div className="mt-2 text-[11px] text-ink-4">
          <b className="text-ink-3">
            {sourceCount} source{sourceCount !== 1 ? "s" : ""}
          </b>
          {domainPreview && (
            <span>
              {" "}
              {stanceVerb(claim)} ({domainPreview})
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <svg
        className="w-4 h-4 text-ink-4 flex-shrink-0 group-hover:text-ink-2 transition-colors"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="5.5,3 10.5,8 5.5,13" />
      </svg>
    </Link>
  );
}
