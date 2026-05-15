"use client";

import type { ReactNode } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type MetricSegment = {
  flex: number;           // proportional weight in the stacked bar
  colorClass: string;     // a Tailwind background class, e.g. "bg-green", "bg-red"
  label?: string;         // appears in the auto-legend below
  labelColorClass?: string; // a Tailwind text class for the legend label; defaults to colorClass-derived
};

// ─── MetricTile ────────────────────────────────────────────────────────────────

export function MetricTile({
  label,
  value,
  href,
  segments,
  legend,
  footer,
}: {
  label: string;         // small uppercase header e.g. "CLAIMS"
  value: string;         // big serif number, e.g. "8" or "11:43"
  href?: string;         // makes the tile a clickable <Link>
  segments?: MetricSegment[]; // optional stacked bar
  legend?: ReactNode;    // override auto-legend; if absent and segments present, auto-rendered
  footer?: ReactNode;    // appears below the value
}) {
  const innerContent = (
    <>
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10.5px] tracking-[.12em] uppercase text-ink-4 font-bold">
          {label}
        </div>
        <div className="font-serif text-[32px] font-medium text-ink tracking-tight leading-none">
          {value}
        </div>
      </div>

      {/* Body — segments bar */}
      {segments !== undefined && (
        <>
          {/* Stacked bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden bg-cream-2">
            {segments.filter((seg) => seg.flex > 0).map((seg, i) => (
              <div
                key={i}
                className={seg.colorClass}
                style={{ flex: seg.flex }}
              />
            ))}
          </div>

          {/* Legend — custom or auto */}
          {legend !== undefined ? (
            legend
          ) : (
            <div className="flex justify-between mt-2.5 text-[10px] tracking-[.06em] uppercase">
              {segments
                .filter((seg) => seg.label !== undefined)
                .map((seg, i) => (
                  <span
                    key={i}
                    className={`font-bold ${seg.labelColorClass ?? ""}`}
                  >
                    {seg.flex > 0 ? seg.flex : ""} {seg.label}
                  </span>
                ))}
            </div>
          )}
        </>
      )}

      {/* Footer — shown alongside segments or alone */}
      {footer !== undefined && (
        <div className="text-[11px] text-ink-3 mt-3.5">{footer}</div>
      )}
    </>
  );

  const baseClasses =
    "bg-paper border border-line rounded-xl p-4";

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClasses} cursor-pointer hover:border-ink-4 transition-colors block`}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <div className={baseClasses}>
      {innerContent}
    </div>
  );
}
