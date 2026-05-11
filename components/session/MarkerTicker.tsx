"use client";
import type { RhetoricMarker } from "@/lib/types";
import { useSession } from "@/lib/client/session-store";

const TYPE_BG: Record<RhetoricMarker["type"], string> = {
  bias: "bg-indigo-100 text-indigo-900 border-indigo-200",
  fallacy: "bg-rose-100 text-rose-900 border-rose-200",
  rhetoric: "bg-teal-100 text-teal-900 border-teal-200",
};

const SEV_DOT: Record<RhetoricMarker["severity"], string> = {
  subtle: "bg-slate-400",
  clear: "bg-amber-500",
  blatant: "bg-rose-600",
};

export function MarkerTicker({
  onMarkerClick,
}: {
  onMarkerClick?: (start: number) => void;
} = {}) {
  const markers = useSession((s) => s.markers);
  const recent = markers.slice(-8);

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-t border-border/60 bg-card/40 px-4 py-2.5 backdrop-blur">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Watching
      </span>
      {recent.length === 0 ? (
        <span className="text-[12px] italic text-muted-foreground">
          No rhetorical patterns flagged yet.
        </span>
      ) : (
        recent.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={
              onMarkerClick ? () => onMarkerClick(m.start_time) : undefined
            }
            className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition hover:brightness-95 ${
              TYPE_BG[m.type]
            }`}
            title={`${m.display} — ${m.explanation}`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${SEV_DOT[m.severity]}`}
            />
            <span className="truncate max-w-[18ch]">{m.display}</span>
          </button>
        ))
      )}
    </div>
  );
}
