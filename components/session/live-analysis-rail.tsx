"use client";

import Aurora from "@/components/Aurora";
import BorderGlow from "@/components/BorderGlow";

export type LiveReadTone =
  | "calm"
  | "productive"
  | "contentious"
  | "misleading"
  | "heated"
  | "mixed";

export type LiveMetricTone = "blue" | "green" | "amber" | "red" | "neutral";

export type LiveReadSignal = {
  tone: LiveReadTone;
  label: string;
  headline: string;
  body: string;
  colorStops: [string, string, string];
  amplitude: number;
  blend: number;
  speed: number;
  background: string;
  overlay: string;
  levels?: number[];
};

export type LiveSignalMetric<Key extends string = string> = {
  key: Key;
  label: string;
  value: string;
  caption: string;
  tone: LiveMetricTone;
  detailTitle: string;
  detailBody: string;
  examples?: string[];
  tooltip: string;
};

export function YentlLiveReadCard({
  signal,
  sourceName,
  host,
  testId = "yentl-read-card",
}: {
  signal: LiveReadSignal;
  sourceName?: string;
  host?: string | null;
  testId?: string;
}) {
  const levels = signal.levels ?? [0.45, 0.65, 0.42, 0.34];

  return (
    <BorderGlow
      className="yentl-read-glow"
      edgeSensitivity={26}
      glowColor="220 96 64"
      backgroundColor="#120F17"
      borderRadius={8}
      glowRadius={28}
      glowIntensity={0.85}
      coneSpread={24}
      animated={signal.tone !== "calm"}
      colors={signal.colorStops}
      fillOpacity={0.28}
    >
      <section
        className="relative isolate min-h-[178px] overflow-hidden rounded-lg border border-white/20 bg-ink p-4 text-white shadow-sm"
        data-testid={testId}
        data-read-tone={signal.tone}
        aria-label={`Yentl's Read: ${signal.label}`}
        style={{ background: signal.background }}
      >
        <div className="absolute inset-0 opacity-80 mix-blend-screen" aria-hidden>
          <Aurora
            colorStops={signal.colorStops}
            amplitude={signal.amplitude}
            blend={signal.blend}
            speed={signal.speed}
          />
        </div>
        <div className="absolute inset-0" style={{ background: signal.overlay }} aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" aria-hidden />

        <div className="relative z-10 flex min-h-[146px] flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/75">
                Yentl&apos;s Read
              </div>
              {sourceName && (
                <div className="mt-1 truncate text-[11.5px] text-white/68">
                  {sourceName}{host ? ` · ${host}` : ""}
                </div>
              )}
            </div>
            <span className="inline-flex min-w-[5.75rem] shrink-0 justify-center rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white/85 backdrop-blur-sm">
              {signal.label}
            </span>
          </div>

          <p className="mt-4 max-w-[28rem] font-serif text-[25px] leading-[1.08] tracking-normal text-white sm:text-[28px]">
            {signal.headline}
          </p>
          <p className="mt-3 max-w-[30rem] text-[13px] leading-relaxed text-white/82">
            {signal.body}
          </p>

          <div className="mt-auto grid grid-cols-4 gap-1.5 pt-4" aria-hidden>
            {levels.map((level, index) => (
              <span
                key={`${signal.tone}-${index}`}
                className="h-1.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.42)]"
                style={{ opacity: level }}
              />
            ))}
          </div>
        </div>
      </section>
    </BorderGlow>
  );
}

export function LiveMetricExpander<Key extends string>({
  metrics,
  expandedMetric,
  onToggleMetric,
  testId = "live-metric-expander",
  className = "mt-3",
}: {
  metrics: LiveSignalMetric<Key>[];
  expandedMetric: Key | null;
  onToggleMetric: (metric: Key) => void;
  testId?: string;
  className?: string;
}) {
  const activeMetric = expandedMetric
    ? metrics.find((metric) => metric.key === expandedMetric) ?? null
    : null;

  return (
    <section
      className={className}
      aria-label="Expandable live signal details"
      data-testid={testId}
    >
      <div className="grid grid-cols-4 gap-1.5">
        {metrics.map((metric) => (
          <LiveMetricTile
            key={metric.key}
            metric={metric}
            active={metric.key === activeMetric?.key}
            onSelect={() => onToggleMetric(metric.key)}
          />
        ))}
      </div>

      {activeMetric && (
        <div
          className={`-mt-px rounded-b-lg rounded-tr-lg border bg-paper px-3 py-2.5 shadow-[inset_0_3px_0_var(--metric-accent)] ${metricDetailClass(activeMetric.tone)}`}
        >
          <div className="text-[12px] font-bold leading-snug text-ink-2">
            {activeMetric.detailTitle}
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
            {activeMetric.detailBody}
          </p>
          {(activeMetric.examples?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeMetric.examples?.map((example) => (
                <span
                  key={example}
                  className="rounded-full border border-line bg-cream px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-2"
                >
                  {example}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LiveMetricTile<Key extends string>({
  metric,
  active,
  onSelect,
}: {
  metric: LiveSignalMetric<Key>;
  active: boolean;
  onSelect: () => void;
}) {
  const glowColor =
    metric.tone === "green"
      ? "142 72 45"
      : metric.tone === "amber"
        ? "38 92 50"
        : metric.tone === "red"
          ? "0 84 60"
          : metric.tone === "blue"
            ? "217 91 60"
            : "230 12 62";

  return (
    <BorderGlow
      className="yentl-metric-glow"
      edgeSensitivity={34}
      glowColor={glowColor}
      backgroundColor="transparent"
      borderRadius={6}
      glowRadius={18}
      glowIntensity={active ? 0.72 : 0.35}
      coneSpread={22}
      animated={active && metric.tone !== "neutral"}
      colors={metricGlowColors(metric.tone)}
      fillOpacity={active ? 0.16 : 0.06}
    >
      <button
        type="button"
        onClick={onSelect}
        title={metric.tooltip}
        aria-pressed={active}
        className={`yentl-action-button h-full min-h-[74px] w-full rounded-md border px-2.5 py-2 text-left transition-all ${metricTileClass(metric.tone, active)}`}
      >
        <div className="truncate text-[9.5px] font-bold uppercase tracking-[0.12em] opacity-80">
          {metric.label}
        </div>
        <div className="mt-1 truncate text-[13px] font-semibold leading-tight">{metric.value}</div>
        <div className="mt-0.5 truncate text-[10.5px] font-semibold opacity-70">{metric.caption}</div>
      </button>
    </BorderGlow>
  );
}

function metricTileClass(tone: LiveMetricTone, active: boolean): string {
  const activeBase = active ? "rounded-b-none shadow-[inset_0_-3px_0_var(--metric-accent)]" : "";
  if (tone === "green") {
    return `${activeBase} border-green/35 bg-green-soft text-green [--metric-accent:#22c55e]`;
  }
  if (tone === "amber") {
    return `${activeBase} border-amber/50 bg-amber-soft text-amber-2 [--metric-accent:#f59e0b]`;
  }
  if (tone === "red") {
    return `${activeBase} border-red/50 bg-red-soft/55 text-red [--metric-accent:#ef4444]`;
  }
  if (tone === "blue") {
    return `${activeBase} border-teal/30 bg-teal-soft text-teal [--metric-accent:#2563eb]`;
  }
  return `${activeBase} border-line bg-cream text-ink-3 [--metric-accent:#b5b8c5]`;
}

function metricDetailClass(tone: LiveMetricTone): string {
  if (tone === "green") return "border-green/35 [--metric-accent:#22c55e]";
  if (tone === "amber") return "border-amber/50 [--metric-accent:#f59e0b]";
  if (tone === "red") return "border-red/50 [--metric-accent:#ef4444]";
  if (tone === "blue") return "border-teal/35 [--metric-accent:#2563eb]";
  return "border-line [--metric-accent:#b5b8c5]";
}

function metricGlowColors(tone: LiveMetricTone): string[] {
  if (tone === "green") return ["#22C55E", "#38BDF8", "#2563EB"];
  if (tone === "amber") return ["#F59E0B", "#F97316", "#EF4444"];
  if (tone === "red") return ["#EF4444", "#BE123C", "#F59E0B"];
  if (tone === "blue") return ["#2563EB", "#38BDF8", "#0F4C81"];
  return ["#B5B8C5", "#E8E1CE", "#5B6075"];
}
