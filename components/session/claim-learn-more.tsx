"use client";

import Link from "next/link";
import type { ClaimCard, Speaker } from "@/lib/types";
import { SourceCard } from "./source-card";
import { ScoreChip } from "./claim-detail";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  last,
  children,
}: {
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${last ? "" : "mb-6"}`}>
      <div className="text-[10.5px] tracking-wider uppercase text-ink-4 font-bold mb-2.5">
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── ClaimLearnMore ───────────────────────────────────────────────────────────

export function ClaimLearnMore({
  claim,
  claims,
  speakers,
  onBack,
}: {
  claim: ClaimCard;
  claims: ClaimCard[];
  speakers: Speaker[];
  onBack: () => void;
}) {
  const relatedTopic = claims.filter(
    (c) =>
      c.id !== claim.id &&
      c.topic?.toLowerCase() === claim.topic?.toLowerCase() &&
      c.status !== "checking",
  );

  return (
    <div className="px-6 md:px-8 pt-5 pb-12 max-w-[820px] mx-auto w-full">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 font-medium mb-5 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M10 4L6 8l4 4" />
        </svg>
        Back
      </button>

      <h1 className="font-serif text-[24px] tracking-tight mt-3 mb-6 text-ink">
        Sources &amp; context ·{" "}
        <span className="text-ink-3 italic font-medium">
          &ldquo;{truncate(claim.claim_text, 60)}&rdquo;
        </span>
      </h1>

      {/* Full source list */}
      <Section title={`Full source list · ${claim.sources.length}`}>
        <div className="flex flex-col gap-2">
          {claim.sources.map((s, i) => (
            <SourceCard key={i} source={s} />
          ))}
          {claim.sources.length === 0 && (
            <div className="text-[11px] italic text-ink-4">
              No sources attached to this claim yet.
            </div>
          )}
        </div>
      </Section>

      {/* Related claims by topic */}
      <Section
        title={`Related claims in this session · ${claim.topic || "Other"}`}
        last
      >
        {relatedTopic.length === 0 ? (
          <div className="text-[11px] italic text-ink-4">
            No related claims on this topic yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {relatedTopic.map((c) => {
              const label =
                speakers.find((s) => s.id === c.speaker_id)?.label ?? "Unknown";
              return (
                <Link
                  key={c.id}
                  href={`/session/detail/claim/${c.id}`}
                  className="flex items-center gap-2.5 p-2.5 bg-cream-2 border border-line-soft rounded-lg hover:bg-cream-3 transition-colors"
                >
                  <ScoreChip score={c.score} verdict={c.primary_label} />
                  <span className="font-serif italic text-[12.5px] text-ink-2 flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    &ldquo;{c.claim_text}&rdquo;
                  </span>
                  <span className="text-[10px] text-ink-4 flex-shrink-0">
                    {label} · {formatTs(c.utterance_start)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
