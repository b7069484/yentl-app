"use client";

import Link from "next/link";

export type TopicSegment = {
  topic: string;         // display name, e.g. "CLIMATE"
  count: number;         // claim count
  colorClass: string;    // bg color, e.g. "bg-teal-soft"
  textColorClass: string; // e.g. "text-teal-2"
  borderColorClass: string; // e.g. "border-[rgba(43,154,138,0.25)]"
};

export function TopicStrip({
  segments,
  buildHref,
}: {
  segments: TopicSegment[];  // already sorted desc by count + filtered (no zero-count buckets)
  buildHref: (topic: string) => string; // caller decides URL grammar
}) {
  return (
    <div className="bg-paper border border-line rounded-xl px-4 py-3.5">
      <div className="text-[10.5px] tracking-[.12em] uppercase text-ink-4 font-bold mb-2.5">
        Topics in play
      </div>

      {segments.length === 0 ? (
        <span className="text-[11px] italic text-ink-4">No topics yet</span>
      ) : (
        <div className="flex items-center gap-2 h-6">
          {segments.map((seg) => (
            <Link
              key={seg.topic}
              href={buildHref(seg.topic)}
              className={[
                "h-full",
                seg.colorClass,
                "border",
                seg.borderColorClass,
                "rounded-md",
                "flex items-center px-2",
                "text-[10.5px] font-semibold",
                seg.textColorClass,
                "justify-between",
                "cursor-pointer",
                "overflow-hidden",
                "min-w-0",
              ].join(" ")}
              style={{ flex: seg.count }}
            >
              <span className="truncate">{seg.topic}</span>
              <span className="ml-1 flex-shrink-0">{seg.count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
