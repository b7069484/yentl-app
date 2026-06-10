"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { TaxonomyEntry } from "@/lib/taxonomy";
import type { RhetoricMarker, Speaker, MarkerType } from "@/lib/types";
import { sessionPathHref } from "@/lib/client/session-route";
import { wikiUrlFor } from "@/lib/taxonomy/wiki-slug";
import { getEntry } from "@/lib/taxonomy";

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

function markerTypeLabel(type: MarkerType): string {
  if (type === "fallacy") return "Logical fallacy";
  if (type === "bias") return "Cognitive bias";
  return "Rhetorical device";
}

function practiceQuestions(entry: TaxonomyEntry): string[] {
  if (entry.type === "fallacy") {
    return [
      "What exact conclusion is the speaker asking the audience to accept?",
      "Which link in the reasoning chain is assumed rather than shown?",
      "What would count as enough evidence to make this move fair?",
    ];
  }
  if (entry.type === "bias") {
    return [
      "What prior belief, identity, or emotional shortcut might be steering the judgment?",
      "What evidence would the speaker notice if the preferred conclusion were wrong?",
      "Would the same standard be used if the people or sides were reversed?",
    ];
  }
  return [
    "Which words carry the persuasive force beyond the literal facts?",
    "How could the same point be phrased in colder, more neutral language?",
    "What audience reaction does this framing seem designed to invite?",
  ];
}

// ─── Type theme maps ──────────────────────────────────────────────────────────

const typeBgMap: Record<MarkerType, string> = {
  fallacy:  "bg-red-soft",
  bias:     "bg-orange-soft",
  rhetoric: "bg-purple-soft",
};

const typeBorderMap: Record<MarkerType, string> = {
  fallacy:  "border-red/20",
  bias:     "border-orange/20",
  rhetoric: "border-purple/20",
};

const typeTextMap: Record<MarkerType, string> = {
  fallacy:  "text-red",
  bias:     "text-orange",
  rhetoric: "text-purple",
};

const typeBgDotMap: Record<MarkerType, string> = {
  fallacy:  "bg-red",
  bias:     "bg-orange",
  rhetoric: "bg-purple",
};

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

function GenericTypeIcon({
  type,
  className,
}: {
  type: MarkerType;
  className?: string;
}) {
  if (type === "fallacy") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={className ?? "w-6 h-6"}
      >
        <polygon points="8,2 14.5,14 1.5,14" />
        <line x1="8" y1="6.5" x2="8" y2="10" />
        <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "bias") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden
        className={className ?? "w-6 h-6"}
      >
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 5v3.5l2 2" strokeLinejoin="round" />
      </svg>
    );
  }
  // rhetoric
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "w-6 h-6"}
    >
      <path d="M3 4h10M3 8h7M3 12h5" />
    </svg>
  );
}

function SpeakerDot({
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
      className={`w-[16px] h-[16px] rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0 bg-spk-${paletteIndex}`}
    >
      {initial}
    </span>
  );
}

function WIcon() {
  return (
    <div className="w-9 h-9 rounded-lg bg-slate-soft border border-slate/20 flex items-center justify-center text-slate font-bold text-[13px] flex-shrink-0">
      W
    </div>
  );
}

function SEPIcon() {
  return (
    <div className="w-9 h-9 rounded-lg bg-purple-soft border border-purple/20 flex items-center justify-center text-purple font-bold text-[10px] flex-shrink-0">
      SEP
    </div>
  );
}

function ExternalIcon() {
  return (
    <div className="w-9 h-9 rounded-lg bg-cream-2 border border-line flex items-center justify-center text-ink-3 flex-shrink-0">
      <svg
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="w-4 h-4"
      >
        <path d="M5.5 2H2v10h10V8.5M8 2h4v4M7 7l5-5" />
      </svg>
    </div>
  );
}

function ReadingCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="learn-reading-link"
      className="flex min-h-11 items-center gap-3 p-2.5 bg-cream-2 border border-line-soft rounded-lg hover:border-ink-4 transition-colors"
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink truncate">{title}</div>
        <div className="text-[11px] text-ink-4 mt-px truncate">{subtitle}</div>
      </div>
      <svg
        className="w-3.5 h-3.5 text-ink-4 flex-shrink-0"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 7h8M7 3l4 4-4 4" />
      </svg>
    </a>
  );
}

function LearningPathCard({ entry }: { entry: TaxonomyEntry }) {
  const hasChapter = entry.source === "book" && Boolean(entry.chapter);
  return (
    <div
      data-testid="marker-learning-path-card"
      className="flex items-center gap-3 rounded-lg border border-line-soft bg-cream-2 p-2.5"
    >
      <div className={`w-9 h-9 rounded-lg ${typeBgMap[entry.type]} ${typeBorderMap[entry.type]} border flex items-center justify-center ${typeTextMap[entry.type]} flex-shrink-0`}>
        <GenericTypeIcon type={entry.type} className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink">
          {hasChapter ? "Book field guide" : "Practice field guide"}
        </div>
        <div className="mt-px text-[11px] text-ink-4">
          {hasChapter
            ? `Chapter: ${entry.chapter}`
            : `${markerTypeLabel(entry.type)} · ${entry.archetype ?? "general pattern"}`}
        </div>
      </div>
    </div>
  );
}

function PracticeCheck({ entry }: { entry: TaxonomyEntry }) {
  const questions = practiceQuestions(entry);
  return (
    <Section title="Practice check">
      <div className="rounded-2xl border border-line bg-paper px-4 py-3">
        <div className="mb-2 text-[12px] font-semibold text-ink-2">
          Before treating the marker as settled, ask:
        </div>
        <ul className="space-y-2">
          {questions.map((question, index) => (
            <li key={question} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
              <span className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${typeBgMap[entry.type]} ${typeTextMap[entry.type]} text-[10px] font-bold`}>
                {index + 1}
              </span>
              <span>{question}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

// ─── MarkerLearnMore ──────────────────────────────────────────────────────────

export function MarkerLearnMore({
  entry,
  occurrences,
  speakers,
  onBack,
}: {
  entry: TaxonomyEntry;
  occurrences: RhetoricMarker[];
  speakers: Speaker[];
  onBack: () => void;
}) {
  const searchParams = useSearchParams();
  const wikiUrl = wikiUrlFor(entry.canonical_id);

  return (
    <div className="px-6 md:px-8 pt-5 pb-12 max-w-[820px] mx-auto w-full">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={onBack}
        data-testid="learn-back-btn"
        className="inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-md px-1.5 text-[12px] text-ink-3 hover:text-ink-2 font-medium mb-5 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
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

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center ${typeBgMap[entry.type]} ${typeBorderMap[entry.type]} border`}
        >
          <GenericTypeIcon type={entry.type} className={`w-6 h-6 ${typeTextMap[entry.type]}`} />
        </div>
        <div className="min-w-0">
          <div className={`text-[11px] tracking-wider uppercase font-bold mb-0.5 break-words ${typeTextMap[entry.type]}`}>
            {markerTypeLabel(entry.type)} · archetype: {entry.archetype ?? "unknown"}
          </div>
          <h1 className="font-serif text-[32px] font-medium leading-tight tracking-tight text-ink mb-1">
            {entry.display}
          </h1>
          {entry.aka && (
            <div className="text-[13px] text-ink-3">
              Also known as: <em>{entry.aka}</em>
            </div>
          )}
        </div>
      </div>

      {/* Definition */}
      <Section title="Definition">
        <p className="font-serif text-[16px] leading-relaxed text-ink font-normal">
          {entry.definition ?? "No definition available."}
        </p>
      </Section>

      {entry.example && (
        <Section title="Example">
          <div className="rounded-2xl border border-line bg-paper px-4 py-3">
            <p className="font-serif text-[15px] leading-relaxed text-ink-2">
              {entry.example}
            </p>
          </div>
        </Section>
      )}

      {/* How to spot it */}
      {entry.how_to_spot && entry.how_to_spot.length > 0 && (
        <Section title="How to spot it">
          <ul className="space-y-2">
            {entry.how_to_spot.map((bullet, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-ink-2 pl-4 relative">
                <span
                  className={`absolute left-0 top-2 w-1.5 h-1.5 rounded-full ${typeBgDotMap[entry.type]}`}
                />
                {bullet}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Further reading */}
      <Section title="Further reading">
        <div className="flex flex-col gap-2">
          <LearningPathCard entry={entry} />

          {/* Wikipedia auto-derived */}
          {wikiUrl && (
            <ReadingCard
              href={wikiUrl}
              title={`${entry.display} — Wikipedia`}
              subtitle="en.wikipedia.org · ~10 min read"
              icon={<WIcon />}
            />
          )}

          {/* Other further-reading entries from enrichment */}
          {entry.further_reading
            ?.filter((r) => r.source !== "wikipedia")
            .map((r, i) => {
              let href: string;
              let subtitle: string;
              if (r.source === "sep") {
                href = `https://plato.stanford.edu/entries/${r.slug_or_path}`;
                subtitle = `plato.stanford.edu · academic-grade${r.mins ? ` · ~${r.mins} min read` : ""}`;
              } else {
                href = r.slug_or_path;
                let hostname = r.slug_or_path;
                try {
                  hostname = new URL(r.slug_or_path).hostname;
                } catch {
                  // keep raw path if not a valid URL
                }
                subtitle = `${hostname}${r.mins ? ` · ~${r.mins} min read` : ""}`;
              }
              return (
                <ReadingCard
                  key={i}
                  href={href}
                  title={r.title}
                  subtitle={subtitle}
                  icon={r.source === "sep" ? <SEPIcon /> : <ExternalIcon />}
                />
              );
            })}
        </div>
      </Section>

      <PracticeCheck entry={entry} />

      {/* Occurrences in this session */}
      {occurrences.length > 0 && (
        <Section title={`Occurrences in this session · ${occurrences.length}`}>
          <div className="flex flex-col gap-2">
            {occurrences.map((m) => {
              const label =
                speakers.find((s) => s.id === m.speaker_id)?.label ?? "Unknown";
              return (
                <Link
                  key={m.id}
                  href={sessionPathHref(searchParams, `/session/detail/marker/${m.id}`)}
                  data-testid="marker-occurrence-link"
                  className="flex min-h-11 items-start gap-2.5 rounded-lg border border-line-soft bg-cream-2 p-2.5 hover:bg-cream-3 transition-colors"
                >
                  <SpeakerDot speakerId={m.speaker_id ?? 0} label={label} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif italic text-[12.5px] text-ink-2">
                      &ldquo;{truncate(m.excerpt, 110)}&rdquo;
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-ink-4">
                      {m.explanation}
                    </span>
                  </span>
                  <span className="flex flex-shrink-0 flex-col items-end gap-1 text-[10px] text-ink-4">
                    <span className="tabular-nums">{formatTs(m.start_time)}</span>
                    <span className="rounded-full border border-line bg-paper px-1.5 py-0.5 font-semibold capitalize">
                      {m.severity}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* Related patterns */}
      {entry.related_canonical_ids && entry.related_canonical_ids.length > 0 && (
        <Section title="Related patterns" last>
          <div className="flex flex-wrap gap-2">
            {entry.related_canonical_ids.slice(0, 8).map((cid) => {
              const rel = getEntry(cid);
              if (!rel) return null;
              return (
                <Link
                  key={cid}
                  href={sessionPathHref(searchParams, `/session/learn/marker/${cid}`)}
                  data-testid="marker-related-link"
                  className="inline-flex min-h-11 items-center gap-1.5 px-2.5 py-1.5 bg-cream-2 border border-line rounded-full text-[11.5px] text-ink-2 hover:border-ink-4 transition-colors"
                >
                  <GenericTypeIcon
                    type={rel.type}
                    className={`w-3 h-3 ${typeTextMap[rel.type]}`}
                  />
                  {rel.display}
                </Link>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
