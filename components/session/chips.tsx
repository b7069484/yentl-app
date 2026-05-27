"use client";

import { useRef, useEffect, type ReactNode } from "react";
import type {
  PrimaryLabel,
  MarkerType,
  MarkerSeverity,
  Stance,
  ReputationTier,
} from "@/lib/types";

// ─── Shared base ────────────────────────────────────────────────────────────

const BASE =
  "inline-flex items-center gap-1 px-2 py-px rounded-full text-[10px] font-semibold leading-snug border whitespace-nowrap";

// ─── VerdictChip ─────────────────────────────────────────────────────────────

export type VerdictKind = PrimaryLabel | "CHECKING";

const VERDICT_STYLE: Record<
  VerdictKind,
  { bg: string; text: string; border: string; italic?: boolean; score?: boolean }
> = {
  TRUE:          { bg: "bg-green-soft",  text: "text-green",  border: "border-[rgba(15,138,95,0.25)]",  score: true  },
  MOSTLY_TRUE:   { bg: "bg-green-soft",  text: "text-green",  border: "border-[rgba(15,138,95,0.15)]",  score: true  },
  PARTIAL:       { bg: "bg-orange-soft", text: "text-orange", border: "border-[rgba(199,107,31,0.25)]", score: true  },
  MISLEADING:    { bg: "bg-orange-soft", text: "text-orange", border: "border-[rgba(199,107,31,0.3)]",  score: true  },
  OMISSION:      { bg: "bg-orange-soft", text: "text-orange", border: "border-[rgba(199,107,31,0.2)]",  italic: true },
  FALSE:         { bg: "bg-red-soft",    text: "text-red",    border: "border-[rgba(183,55,42,0.25)]",  score: true  },
  UNVERIFIABLE:  { bg: "bg-slate-soft",  text: "text-slate",  border: "border-[rgba(91,96,117,0.25)]"              },
  OPINION:       { bg: "bg-slate-soft",  text: "text-slate",  border: "border-[rgba(91,96,117,0.2)]",   italic: true },
  CHECKING:      { bg: "bg-amber-soft",  text: "text-[#8E6517]", border: "border-[rgba(216,155,44,0.3)]"           },
};

const VERDICT_LABEL: Record<VerdictKind, string> = {
  TRUE: "True",
  MOSTLY_TRUE: "Mostly True",
  PARTIAL: "Partial",
  MISLEADING: "Misleading",
  OMISSION: "Omission",
  FALSE: "False",
  UNVERIFIABLE: "No reliable backing",
  OPINION: "Opinion",
  CHECKING: "Checking",
};

// Inline SVG icons — 10px, stroke-width 2, stroke currentColor, fill none
function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="1.5,5 4,7.5 8.5,2.5" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth={2} stroke="currentColor" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="2" x2="8" y2="8" />
      <line x1="8" y1="2" x2="2" y2="8" />
    </svg>
  );
}

function IconTriangleAlert() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth={2} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="5,1.5 9,8.5 1,8.5" />
      <line x1="5" y1="4.5" x2="5" y2="6.5" />
    </svg>
  );
}

function IconHalfCircle() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth={2} stroke="currentColor" strokeLinecap="round" aria-hidden>
      <path d="M5,1 A4,4 0 0 1 5,9" />
      <line x1="5" y1="1" x2="5" y2="9" />
    </svg>
  );
}

function IconQuestion() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth={2} stroke="currentColor" strokeLinecap="round" aria-hidden>
      <circle cx="5" cy="5" r="4" />
      <path d="M3.5,3.5 Q3.5,2 5,2 Q6.5,2 6.5,3.5 Q6.5,5 5,5" />
      <circle cx="5" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth={2} stroke="currentColor" strokeLinecap="round" aria-hidden>
      <path d="M2,6 Q2,3.5 4,3.5" />
      <path d="M6,6 Q6,3.5 8,3.5" />
    </svg>
  );
}

function IconDash() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth={2} stroke="currentColor" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="5" x2="8" y2="5" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
      className="animate-spin"
      role="status"
    >
      <circle cx="4.5" cy="4.5" r="3.5" strokeOpacity={0.25} />
      <path d="M4.5,1 A3.5,3.5 0 0 1 8,4.5" />
    </svg>
  );
}

function VerdictIcon({ verdict }: { verdict: VerdictKind }) {
  switch (verdict) {
    case "TRUE":
    case "MOSTLY_TRUE": return <IconCheck />;
    case "PARTIAL":     return <IconHalfCircle />;
    case "MISLEADING":  return <IconTriangleAlert />;
    case "OMISSION":    return <IconDash />;
    case "FALSE":       return <IconX />;
    case "UNVERIFIABLE": return <IconQuestion />;
    case "OPINION":     return <IconQuote />;
    case "CHECKING":    return <IconSpinner />;
  }
}

export function VerdictChip({
  verdict,
  score,
  onClick,
}: {
  verdict: VerdictKind;
  score?: number;
  onClick?: () => void;
}) {
  const s = VERDICT_STYLE[verdict];
  const mostlyTrueOpacity = verdict === "MOSTLY_TRUE" ? "opacity-85" : "";
  const italicClass = s.italic ? "italic" : "";

  return (
    <span
      className={[BASE, s.bg, s.text, s.border, mostlyTrueOpacity, italicClass, onClick ? "cursor-pointer" : ""].filter(Boolean).join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <VerdictIcon verdict={verdict} />
      {VERDICT_LABEL[verdict]}
      {s.score && score !== undefined && (
        <span className="opacity-75 text-[9px] ml-0.5">{score}</span>
      )}
    </span>
  );
}

// ─── MarkerChip ───────────────────────────────────────────────────────────────

const MARKER_STYLE: Record<MarkerType, { bg: string; text: string; border: string }> = {
  fallacy:  { bg: "bg-purple-soft",       text: "text-purple", border: "border-[rgba(106,80,200,0.25)]" },
  bias:     { bg: "bg-[#F5E9CD]",         text: "text-amber-2", border: "border-[rgba(176,124,28,0.25)]" },
  rhetoric: { bg: "bg-pink-soft",         text: "text-pink",   border: "border-[rgba(194,64,122,0.25)]" },
};

export function MarkerChip({
  type,
  display,
  severity,
  archetypeIcon,
  onClick,
}: {
  type: MarkerType;
  display: string;
  severity?: MarkerSeverity;
  archetypeIcon?: ReactNode;
  onClick?: () => void;
}) {
  const s = MARKER_STYLE[type];

  return (
    <span
      className={[BASE, s.bg, s.text, s.border, onClick ? "cursor-pointer" : ""].filter(Boolean).join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {archetypeIcon}
      {display}
      {severity && (
        <span className="opacity-70 text-[9px] ml-1 uppercase">{severity}</span>
      )}
    </span>
  );
}

// ─── SpeakerChip ─────────────────────────────────────────────────────────────

export function SpeakerChip({
  speakerId,
  label,
  editing = false,
  onEditStart,
  onSave,
  onCancel,
}: {
  speakerId: number;
  label: string;
  editing?: boolean;
  onEditStart?: () => void;
  onSave?: (label: string) => void;
  onCancel?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteIndex = (speakerId % 6) + 1;

  // Auto-focus the input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = inputRef.current?.value.trim().slice(0, 24) ?? label;
      onSave?.(val || label);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    }
  }

  function handleBlur() {
    const val = inputRef.current?.value.trim().slice(0, 24) ?? label;
    onSave?.(val || label);
  }

  return (
    <span
      className={[
        "relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper text-[11.5px] font-medium text-ink-2",
        editing
          ? "border border-amber cursor-text"
          : "border border-line cursor-pointer hover:border-ink-4",
      ].join(" ")}
      onClick={!editing ? onEditStart : undefined}
      role={!editing ? "button" : undefined}
      tabIndex={!editing ? 0 : undefined}
    >
      {/* Avatar dot */}
      <span
        aria-hidden
        className="h-[7px] w-[7px] rounded-full shrink-0"
        style={{ backgroundColor: `var(--spk-${paletteIndex})` }}
      />

      {editing ? (
        <input
          ref={inputRef}
          defaultValue={label}
          maxLength={24}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="bg-transparent outline-none text-[11.5px] font-medium text-ink-2 min-w-0 w-20"
          aria-label="Edit speaker name"
        />
      ) : (
        <span>{label}</span>
      )}

      {/* Numeric badge for speakerId >= 6 */}
      {speakerId >= 6 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 text-[8px] bg-ink text-paper rounded-full px-1 leading-none"
        >
          {speakerId + 1}
        </span>
      )}
    </span>
  );
}

// ─── SourceChip ───────────────────────────────────────────────────────────────

const STANCE_DOT: Record<Stance, string> = {
  supports:    "bg-green",
  contradicts: "bg-red",
  mixed:       "bg-orange",
};

export function SourceChip({
  domain,
  stance,
  reputationTier,
  dateText,
  onClick,
}: {
  domain: string;
  stance: Stance;
  reputationTier: ReputationTier;
  dateText?: string;
  onClick?: () => void;
}) {
  const firstChar = domain.charAt(0).toUpperCase();
  const highTierShadow =
    reputationTier === "high"
      ? "shadow-[inset_0_0_0_1px_rgba(15,138,95,0.15)]"
      : "";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-px rounded bg-cream-2 border border-line text-[10.5px] font-medium text-ink-2",
        highTierShadow,
        onClick ? "cursor-pointer" : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Stance dot */}
      <span
        aria-hidden
        className={`h-[6px] w-[6px] rounded-full shrink-0 ${STANCE_DOT[stance]}`}
        data-stance={stance}
      />
      {/* Domain logo mini */}
      <span
        aria-hidden
        className="inline-flex items-center justify-center h-[14px] w-[14px] rounded bg-ink-2 text-paper text-[8px] font-bold shrink-0"
      >
        {firstChar}
      </span>
      {domain}
      {dateText && (
        <span className="text-ink-4 font-normal"> · {dateText}</span>
      )}
    </span>
  );
}

// ─── TopicChip ────────────────────────────────────────────────────────────────

export function TopicChip({ topic }: { topic: string }) {
  return (
    <span className="inline-block px-1.5 rounded-sm text-[9.5px] font-semibold tracking-wide uppercase text-ink-4 border border-line">
      {topic}
    </span>
  );
}
