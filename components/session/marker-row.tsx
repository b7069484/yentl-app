"use client";

import Link from "next/link";
import type { RhetoricMarker, MarkerType } from "@/lib/types";
import { getEntry } from "@/lib/taxonomy";
import { MarkerAssetIcon } from "./marker-asset-icon";

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
      className={`w-[16px] h-[16px] rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0 bg-spk-${paletteIndex}`}
    >
      {initial}
    </span>
  );
}

// ─── Marker color map ─────────────────────────────────────────────────────────

const MARKER_COLOR_MAP = {
  fallacy:  { text: "text-purple",  borderLeft: "border-l-purple"  },
  bias:     { text: "text-amber-2", borderLeft: "border-l-amber-2" },
  rhetoric: { text: "text-pink",    borderLeft: "border-l-pink"    },
} as const satisfies Record<MarkerType, { text: string; borderLeft: string }>;

const SEVERITY_DOT: Record<string, string> = {
  blatant: "text-red",
  clear:   "text-orange",
  subtle:  "text-slate",
};

// ─── MarkerRow ────────────────────────────────────────────────────────────────

export function MarkerRow({
  marker,
  speakerLabel,
  href,
}: {
  marker: RhetoricMarker;
  speakerLabel: string;
  href: string;
}) {
  const markerColor = MARKER_COLOR_MAP[marker.type];
  const entry = getEntry(marker.name);
  const archetype = entry?.archetype ?? "unknown";
  const dotColor = SEVERITY_DOT[marker.severity] ?? "text-ink-4";

  return (
    <Link
      href={href}
      className={`group block min-h-11 rounded-xl border border-line border-l-[3px] bg-paper p-3.5 transition-colors hover:border-ink-5 ${markerColor.borderLeft}`}
    >
      {/* Header row */}
      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
        <MarkerAssetIcon
          canonicalId={marker.name}
          type={marker.type}
          display={marker.display}
          size="sm"
        />
        <span className="min-w-0 text-[13px] font-semibold text-ink">{marker.display}</span>
        <span
          className={`ml-auto text-[9.5px] tracking-wide uppercase font-medium ${dotColor}`}
        >
          ● {marker.severity}
        </span>
      </div>

      {/* Excerpt */}
      <div className="font-serif italic text-[13px] text-ink-2 leading-snug line-clamp-2">
        &ldquo;{marker.excerpt}&rdquo;
      </div>

      {/* Footer row */}
      <div className="mt-2 flex flex-col gap-1.5 text-[11px] text-ink-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5">
          <SpeakerAvatar speakerId={marker.speaker_id ?? 0} label={speakerLabel} />
          <span>{speakerLabel} · {formatTs(marker.start_time)}</span>
        </span>
        <span>
          archetype: <b className="text-ink-3">{archetype}</b>
        </span>
      </div>
    </Link>
  );
}
