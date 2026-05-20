"use client";

import Link from "next/link";
import {
  Play,
  Pause,
  RotateCw,
  MoreHorizontal,
  Search,
  CircleDot,
  ArrowRight,
  Square,
} from "lucide-react";

// ─── Shared sample data ──────────────────────────────────────────────────────

type Finding = {
  kind: "checking" | "verified" | "marker" | "false";
  label: string;
  quote: string;
};

const sampleTicks = [
  { left: "6%", kind: "verified" },
  { left: "14%", kind: "marker" },
  { left: "21%", kind: "nope" },
  { left: "24%", kind: "verified" },
  { left: "36%", kind: "marker" },
  { left: "48%", kind: "nope" },
  { left: "58%", kind: "marker" },
  { left: "72%", kind: "verified" },
];

const tickColor = (k: string) =>
  k === "verified"
    ? "#22C55E"
    : k === "nope"
    ? "#EF4444"
    : k === "marker"
    ? "#7C3AED"
    : "#fff";

// ─── Reusable bits ────────────────────────────────────────────────────────────

const YMark = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 1400 1400"
    fill="none"
    aria-hidden
    className="mr-[4px] translate-y-[2px] text-teal"
  >
    <path
      d="M340 320 L700 720 L1060 320 M700 720 L700 1080"
      stroke="currentColor"
      strokeWidth="180"
      strokeLinecap="round"
    />
  </svg>
);

const Brand = ({ size = 17 }: { size?: number }) => (
  <span
    className="inline-flex items-baseline font-serif font-medium tracking-[-.02em] text-ink"
    style={{
      fontSize: `${size}px`,
      fontVariationSettings: "'opsz' 36, 'SOFT' 50",
      whiteSpace: "nowrap",
      textTransform: "none",
    }}
  >
    <YMark size={size} />
    yentl
    <span
      aria-hidden
      className="mx-[1px] inline-block rounded-full bg-amber"
      style={{
        width: Math.max(3, Math.round(size * 0.22)),
        height: Math.max(3, Math.round(size * 0.22)),
        transform: "translateY(-2px)",
      }}
    />
    <span className="font-normal text-ink-3">it</span>
  </span>
);

const LivePill = ({ time = "04:18" }: { time?: string }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold tabular-nums text-[#B91C1C]"
    style={{ background: "rgba(239,68,68,.08)" }}
  >
    <span
      className="inline-block h-[7px] w-[7px] rounded-full bg-red"
      style={{ animation: "yt-rec-pulse 1.2s ease-in-out infinite" }}
    />
    Analyzing · {time}
  </span>
);

const Stats = ({ compact = false }: { compact?: boolean }) => {
  const txtSz = compact ? "text-[11.5px]" : "text-[12.5px]";
  const lblSz = compact ? "text-[9px]" : "text-[9.5px]";
  return (
    <div className={`flex items-center gap-${compact ? "2" : "3"}`}>
      {[
        { n: "22", l: "Claims", color: "text-ink" },
        { n: "5", l: "False", color: "text-[#B91C1C]" },
        { n: "9", l: "Markers", color: "text-[#5B21B6]" },
        { n: "2", l: "Speakers", color: "text-ink" },
      ].map((s, i, arr) => (
        <span key={s.l} className="inline-flex items-center gap-1">
          <span className="contents">
            <span className={`${txtSz} font-bold tracking-[-.01em] ${s.color}`}>{s.n}</span>
            <span className={`font-mono ${lblSz} font-semibold uppercase tracking-[.08em] text-ink-4`}>
              {s.l}
            </span>
          </span>
          {i < arr.length - 1 && (
            <span className="ml-1 mr-[-2px] block h-[10px] w-px bg-line" />
          )}
        </span>
      ))}
    </div>
  );
};

// ─── Video thumbnail (used by both layouts) ──────────────────────────────────

const VideoThumb = () => (
  <>
    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 35%, #5b3a2e 0%, #1c1411 70%, #000 100%)" }} />
    <div
      className="absolute"
      style={{
        left: "18%", top: "8%", width: "65%", height: "75%",
        background: "linear-gradient(170deg, #d3a577 0%, #8b6443 40%, #3d2418 100%)",
        borderRadius: 8, opacity: 0.88,
      }}
    />
    <div
      className="absolute"
      style={{
        left: "55%", top: "15%", width: "30%", height: "38%",
        background: "radial-gradient(ellipse, #3a4258 0%, #161922 60%)",
        borderRadius: "50%", opacity: 0.85,
      }}
    />
  </>
);

const ScrubBar = ({ size = "lg" }: { size?: "sm" | "lg" }) => {
  const headSize = size === "sm" ? "h-[10px] w-[10px]" : "h-[11px] w-[11px]";
  return (
    <div className="relative h-[3px] flex-1 cursor-pointer rounded-full" style={{ background: "rgba(255,255,255,.18)" }}>
      <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: "62%", background: "rgba(255,255,255,.32)" }} />
      <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: "28%", background: "#FF0033" }} />
      {sampleTicks.map((t, i) => (
        <span
          key={i}
          className="absolute -top-[2px] w-[2px] h-[7px] rounded-[1px]"
          style={{ left: t.left, background: tickColor(t.kind) }}
        />
      ))}
      <span
        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${headSize}`}
        style={{
          left: "28%",
          background: "#FF0033",
          boxShadow: "0 0 0 3px rgba(255,0,51,.25)",
        }}
      />
    </div>
  );
};

const PlayerBar = ({ compact = false }: { compact?: boolean }) => {
  const padding = compact ? "px-3.5 pb-2 pt-1.5" : "px-3.5 pb-2.5 pt-2";
  const btn = compact ? "h-6 w-6" : "h-[26px] w-[26px]";
  const playBtn = compact ? "h-7 w-7" : "h-[30px] w-[30px]";
  return (
    <div className={`flex flex-shrink-0 flex-col gap-1.5 bg-[#0a0a0a] text-white ${padding}`}>
      <div className="flex items-center gap-2">
        <span className="min-w-[32px] whitespace-nowrap font-mono text-[9.5px] font-semibold text-white/85">
          12:34
        </span>
        <ScrubBar size={compact ? "sm" : "lg"} />
        <span className="min-w-[36px] whitespace-nowrap text-right font-mono text-[9.5px] font-medium text-white/55">
          2:14:08
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button className={`${btn} flex items-center justify-center rounded-full text-white/85 hover:bg-white/10`}>
            <RotateCw className="h-3 w-3 -scale-x-100" strokeWidth={2.2} />
          </button>
          <button
            className={`${playBtn} flex items-center justify-center rounded-full border border-white/40 text-white`}
            style={{ background: "rgba(255,255,255,.18)" }}
          >
            <Pause className="h-3 w-3" fill="currentColor" strokeWidth={0} />
          </button>
          <button className={`${btn} flex items-center justify-center rounded-full text-white/85 hover:bg-white/10`}>
            <RotateCw className="h-3 w-3" strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px] font-medium tracking-[.03em] text-white/70">
          {[
            { l: "1×", on: true },
            { l: "CC", on: false },
            { l: "HD", on: false },
          ].map((c) => (
            <span
              key={c.l}
              className="cursor-pointer rounded-full border px-1.5 py-[1.5px]"
              style={{
                background: c.on ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.1)",
                borderColor: c.on ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.18)",
                color: c.on ? "#fff" : "rgba(255,255,255,.7)",
              }}
            >
              {c.l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Transcript content (used by both) ──────────────────────────────────────

const Transcript = ({ size = "lg" }: { size?: "sm" | "lg" }) => {
  const qSz = size === "sm" ? "text-[12.5px]" : "text-[14.5px]";
  const cSz = size === "sm" ? "text-[9.5px]" : "text-[10.5px]";
  const sSz = size === "sm" ? "h-[11px] w-[11px] text-[7px]" : "h-[14px] w-[14px] text-[8.5px]";
  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full pl-[2px] pr-2 py-[1px] font-semibold tracking-[-.005em] ${cSz}`}
            style={{ background: "#CCFBF1", color: "#0EA5A4" }}
          >
            <span
              className={`inline-flex items-center justify-center rounded-full font-bold tracking-[-.02em] text-white ${sSz}`}
              style={{ background: "#0EA5A4" }}
            >
              L
            </span>
            Lex
          </span>
          <span className="cursor-pointer font-mono text-[8.5px] tracking-[.04em] text-ink-4 hover:text-teal hover:underline">
            12:22 · jump
          </span>
        </div>
        <p
          className={`font-serif ${qSz} font-normal leading-[1.42] tracking-[-.005em] text-ink-2`}
          style={{ fontVariationSettings: "'opsz' 16, 'SOFT' 30" }}
        >
          &ldquo;Do you think we&rsquo;ll see superintelligence in this decade?&rdquo;
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full pl-[2px] pr-2 py-[1px] font-semibold tracking-[-.005em] ${cSz}`}
            style={{ background: "#FEF3C7", color: "#92400E" }}
          >
            <span
              className={`inline-flex items-center justify-center rounded-full font-bold tracking-[-.02em] text-white ${sSz}`}
              style={{ background: "#F59E0B" }}
            >
              S
            </span>
            Sam
          </span>
          <span className="cursor-pointer font-mono text-[8.5px] tracking-[.04em] text-ink-4 hover:text-teal hover:underline">
            12:31 · jump
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-semibold" style={{ color: "#0EA5A4" }}>
            <span
              className="inline-block h-[5px] w-[5px] rounded-full"
              style={{ background: "#0EA5A4", animation: "yt-dot-fade 1.2s infinite" }}
            />
            Now
          </span>
        </div>
        <p
          className={`font-serif ${qSz} font-normal leading-[1.42] tracking-[-.005em] text-ink-2`}
          style={{ fontVariationSettings: "'opsz' 16, 'SOFT' 30" }}
        >
          &ldquo;We&rsquo;re closer than people think. Our internal benchmarks already show{" "}
          <span
            className="rounded-[2px] px-[2px]"
            style={{
              background:
                "linear-gradient(180deg, transparent 60%, rgba(245,158,11,.22) 60%)",
            }}
          >
            human-level reasoning on most
          </span>
          <span
            className="ml-[1px] inline-block h-[14px] w-[2px] align-[-3px] bg-teal"
            style={{ animation: "yt-cursor-blink 0.9s steps(2) infinite" }}
          />
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] font-semibold tracking-[-.005em]"
            style={{ background: "#DBEAFE", color: "#1E40AF", borderColor: "#93C5FD" }}
          >
            <span className="inline-flex items-center gap-1 border-r border-current pr-1 font-mono text-[8px] font-bold uppercase tracking-[.05em] opacity-70">
              <Search className="h-2 w-2" strokeWidth={2} />
              Checking
            </span>
            &ldquo;human-level reasoning&rdquo;
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] font-semibold tracking-[-.005em]"
            style={{ background: "#EDE9FE", color: "#5B21B6", borderColor: "#C4B5FD" }}
          >
            <span className="inline-flex items-center gap-1 border-r border-current pr-1 font-mono text-[8px] font-bold uppercase tracking-[.05em] opacity-70">
              <CircleDot className="h-2 w-2" strokeWidth={2} />
              Vague
            </span>
            &ldquo;most tasks&rdquo;
          </span>
        </div>
      </div>
    </>
  );
};

// ─── LANDSCAPE LAYOUT (V3.13) ────────────────────────────────────────────────

function LandscapeWatch() {
  return (
    <div
      className="v3-yt-landscape-only relative w-full max-w-[1100px] flex-col overflow-hidden rounded-[28px] border border-line/60 bg-cream shadow-[0_30px_60px_rgba(0,0,0,.18)]"
      style={{ aspectRatio: "852/393", minHeight: "auto" }}
    >
      {/* Top bar */}
      <div
        className="flex flex-shrink-0 items-center gap-3.5 border-b border-line bg-cream px-6 py-2.5 text-[10.5px] font-semibold uppercase tracking-[.07em] text-ink-4"
        style={{ boxShadow: "0 4px 14px rgba(20,23,31,.04)" }}
      >
        <Brand size={15} />
        <LivePill />
        <Stats compact />
        <div className="ml-auto flex items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-full border-0 px-4 text-[12.5px] font-bold tracking-[-.01em] text-white"
            style={{
              background: "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
              boxShadow: "0 6px 14px rgba(220,38,38,.32)",
              textTransform: "none",
            }}
          >
            <Square className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
            End & analyze
          </button>
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-white text-ink-2">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT video column */}
        <div className="relative flex w-[460px] flex-shrink-0 flex-col border-r border-ink-2 bg-[#0a0a0a]">
          <div className="relative flex-1 overflow-hidden bg-black">
            <VideoThumb />
            <div
              className="absolute inset-0 z-[2] flex flex-col justify-end px-4 py-3 text-white"
              style={{
                background:
                  "linear-gradient(180deg, transparent 50%, rgba(0,0,0,.7) 100%)",
              }}
            >
              <p
                className="mb-0.5 font-serif text-[14px] font-semibold leading-[1.25] tracking-[-.01em]"
                style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
              >
                Lex Fridman #418 — Sam Altman on AI alignment, AGI timelines,
                OpenAI
              </p>
              <p className="inline-flex items-center gap-1.5 text-[10.5px] text-white/70">
                <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#FF0033] text-[8px] font-bold text-white">
                  L
                </span>
                Lex Fridman Podcast · 2h 14m · 8.4M views
              </p>
            </div>
            <div
              className="absolute left-1/2 top-[48%] z-[3] flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
              style={{
                background: "rgba(0,0,0,.55)",
                backdropFilter: "blur(8px)",
                border: "1.5px solid rgba(255,255,255,.85)",
              }}
            >
              <Play className="ml-[3px] h-[22px] w-[22px] text-white" fill="currentColor" />
            </div>
          </div>
          <PlayerBar />
        </div>

        {/* RIGHT transcript column */}
        <div className="flex flex-1 flex-col overflow-hidden bg-cream">
          {/* Synthesis bar */}
          <div
            className="relative flex-shrink-0 border-b border-line-soft py-2 pl-4 pr-4"
            style={{
              background:
                "linear-gradient(90deg, #DBEAFE 0%, #FAF9F5 75%)",
            }}
          >
            <span
              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-teal"
              aria-hidden
            />
            <p className="mb-0.5 ml-2 font-mono text-[8.5px] font-bold uppercase tracking-[.1em] text-teal">
              Yentl reads it
            </p>
            <p
              className="ml-2 font-serif text-[11.5px] font-medium italic leading-[1.35] text-ink-2"
              style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 30" }}
            >
              <strong className="not-italic text-ink">
                Sam is more confident than the data on alignment timelines.
              </strong>{" "}
              Three of his strongest claims so far are softly framed but
              factually thin.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line-soft px-3.5 py-1.5 [&::-webkit-scrollbar]:hidden">
            {[
              { l: "Transcript", active: true },
              { l: "Claims", c: "22" },
              { l: "Markers", c: "9" },
              { l: "Speakers", c: "2" },
              { l: "Sources", pending: true },
            ].map((t) => (
              <span
                key={t.l}
                className={`inline-flex flex-shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-medium tracking-[-.005em] ${
                  t.active ? "bg-ink text-white" : "text-ink-3"
                } ${t.pending ? "opacity-40" : ""}`}
              >
                {t.l}
                {t.c && (
                  <span
                    className={`min-w-[16px] rounded-full px-1.5 py-[0.5px] text-center font-mono text-[9px] font-semibold ${
                      t.active ? "bg-white/20 text-white" : "bg-cream-2 text-ink-3"
                    }`}
                  >
                    {t.c}
                  </span>
                )}
              </span>
            ))}
          </div>

          {/* Transcript */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3.5 pb-3 pt-2 [&::-webkit-scrollbar]:w-0">
            <Transcript size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PORTRAIT LAYOUT (V3.37) ─────────────────────────────────────────────────

function PortraitWatch() {
  return (
    <div className="v3-yt-portrait-only w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-line/60 bg-cream shadow-[0_30px_60px_rgba(0,0,0,.18)]">
      {/* App header */}
      <div className="flex flex-shrink-0 items-center justify-between bg-cream px-4 pb-2 pt-2.5">
        <Brand size={17} />
        <LivePill />
      </div>

      {/* Stats row */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line bg-cream px-4 py-2">
        <Stats />
      </div>

      {/* Video block */}
      <div className="relative flex-shrink-0 bg-[#0a0a0a]">
        <div className="relative aspect-video overflow-hidden bg-black">
          <VideoThumb />
          <div
            className="absolute left-3 top-2.5 z-[3] inline-flex items-center gap-1 rounded-full px-2 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[.1em] text-white"
            style={{ background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)" }}
          >
            <span
              className="inline-block h-[5px] w-[5px] rounded-full"
              style={{ background: "#FF0033", animation: "yt-rec-pulse 1.2s ease-in-out infinite" }}
            />
            Playing
          </div>
          <button
            className="absolute right-3 top-2.5 z-[3] inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-medium text-white"
            style={{
              background: "rgba(0,0,0,.5)",
              backdropFilter: "blur(6px)",
              borderColor: "rgba(255,255,255,.15)",
            }}
          >
            <RotateCw className="h-2.5 w-2.5" strokeWidth={2} />
            Rotate
          </button>
          <div
            className="absolute inset-0 z-[2] flex flex-col justify-end px-3.5 py-3 text-white"
            style={{
              background:
                "linear-gradient(180deg, transparent 50%, rgba(0,0,0,.72) 100%)",
            }}
          >
            <p
              className="mb-0.5 line-clamp-2 font-serif text-[14.5px] font-semibold leading-[1.25] tracking-[-.01em]"
              style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
            >
              Lex Fridman #418 — Sam Altman on AI alignment, AGI timelines,
              OpenAI
            </p>
            <p className="inline-flex items-center gap-1.5 text-[10.5px] text-white/72">
              <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#FF0033] text-[8px] font-bold text-white">
                L
              </span>
              Lex Fridman Podcast · 2h 14m · 8.4M views
            </p>
          </div>
        </div>
        <PlayerBar compact />
      </div>

      {/* Zone 1: Transcript */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-cream">
        <div className="flex flex-shrink-0 items-center justify-between px-4 pb-1 pt-2.5">
          <span className="font-mono text-[8.5px] font-bold uppercase tracking-[.12em] text-ink-4">
            Transcript · live
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[-.005em]" style={{ color: "#F59E0B" }}>
            <span
              className="inline-block h-[5px] w-[5px] rounded-full"
              style={{ background: "#F59E0B", animation: "yt-dot-fade 1.2s infinite" }}
            />
            Sam speaking
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 pt-0.5 [&::-webkit-scrollbar]:w-0">
          <Transcript size="lg" />
        </div>
      </div>

      {/* Zone 2: Findings reel */}
      <div className="flex-shrink-0 border-y bg-cream-2 py-2" style={{ borderColor: "#E6DDB8" }}>
        <div className="flex items-center justify-between px-4 pb-1.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[8.5px] font-bold uppercase tracking-[.12em] text-[#92400E]">
            <span
              className="inline-block h-[5px] w-[5px] rounded-full bg-amber"
              style={{ animation: "yt-dot-fade 1.6s infinite" }}
            />
            Latest findings · 22
          </span>
          <span className="text-[10.5px] font-semibold tracking-[-.01em] text-teal">
            See all →
          </span>
        </div>
        <div className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-4 pb-1 pt-[1px] [&::-webkit-scrollbar]:hidden">
          {/* Checking card */}
          <div
            className="relative flex w-[152px] flex-shrink-0 snap-start flex-col gap-1 rounded-[10px] border px-2.5 py-2 shadow-[0_1px_3px_rgba(20,23,31,.04)]"
            style={{
              background:
                "linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 60%)",
              borderColor: "#93C5FD",
            }}
          >
            <span
              className="absolute right-[7px] top-[7px] inline-block h-[9px] w-[9px] rounded-full border-[1.5px] border-teal border-t-transparent"
              style={{ animation: "yt-spin 1s linear infinite" }}
            />
            <span
              className="inline-flex items-center gap-1 self-start rounded-full px-1.5 py-[1px] font-mono text-[8px] font-bold uppercase tracking-[.07em] text-white"
              style={{ background: "#2563EB" }}
            >
              <Search className="h-2 w-2" strokeWidth={2} />
              Checking
            </span>
            <p
              className="flex-1 font-serif text-[11.5px] font-medium italic leading-[1.28] tracking-[-.005em] text-ink"
              style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 30" }}
            >
              &ldquo;human-level reasoning&rdquo;
            </p>
            <div className="flex items-center justify-between text-[9px] text-ink-4">
              <span className="inline-flex items-center gap-1 font-semibold text-ink-3">
                <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#F59E0B" }} />
                Sam
              </span>
              <span className="font-mono text-[8.5px]">12:33</span>
            </div>
          </div>

          {/* Marker card */}
          <div
            className="flex w-[152px] flex-shrink-0 snap-start flex-col gap-1 rounded-[10px] border px-2.5 py-2 shadow-[0_1px_3px_rgba(20,23,31,.04)]"
            style={{
              background:
                "linear-gradient(180deg, #F5F3FF 0%, #FFFFFF 60%)",
              borderColor: "rgba(124,58,237,.22)",
            }}
          >
            <span
              className="inline-flex items-center gap-1 self-start rounded-full px-1.5 py-[1px] font-mono text-[8px] font-bold uppercase tracking-[.07em] text-white"
              style={{ background: "#5B21B6" }}
            >
              <CircleDot className="h-2 w-2" strokeWidth={2} />
              Vague
            </span>
            <p
              className="flex-1 font-serif text-[11.5px] font-medium italic leading-[1.28] tracking-[-.005em] text-ink"
              style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 30" }}
            >
              &ldquo;most tasks&rdquo;
            </p>
            <div className="flex items-center justify-between text-[9px] text-ink-4">
              <span className="inline-flex items-center gap-1 font-semibold text-ink-3">
                <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#F59E0B" }} />
                Sam
              </span>
              <span className="font-mono text-[8.5px]">12:33</span>
            </div>
          </div>

          {/* Verified card */}
          <div
            className="flex w-[152px] flex-shrink-0 snap-start flex-col gap-1 rounded-[10px] border px-2.5 py-2 shadow-[0_1px_3px_rgba(20,23,31,.04)]"
            style={{
              background:
                "linear-gradient(180deg, #ECFDF3 0%, #FFFFFF 60%)",
              borderColor: "rgba(34,197,94,.25)",
            }}
          >
            <span
              className="inline-flex items-center gap-1 self-start rounded-full px-1.5 py-[1px] font-mono text-[8px] font-bold uppercase tracking-[.07em] text-white"
              style={{ background: "#15803D" }}
            >
              Verified
            </span>
            <p
              className="flex-1 font-serif text-[11.5px] font-medium italic leading-[1.28] tracking-[-.005em] text-ink"
              style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 30" }}
            >
              &ldquo;AI uses 4% of US grid&rdquo;
            </p>
            <div className="flex items-center justify-between text-[9px] text-ink-4">
              <span className="inline-flex items-center gap-1 font-semibold text-ink-3">
                <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#0EA5A4" }} />
                Lex
              </span>
              <span className="font-mono text-[8.5px]">11:48</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3: Yentl's read */}
      <div className="relative flex-shrink-0 bg-ink px-4 py-3.5 text-[#E8E1CE]">
        <span
          aria-hidden
          className="absolute left-0 top-[13px] bottom-[13px] w-[3px] rounded-full bg-amber"
        />
        <div className="mb-1.5 flex items-center justify-between pl-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[.13em]" style={{ color: "#F59E0B" }}>
            Yentl reads it
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.06em] text-white/55">
            <span
              className="inline-block h-[5px] w-[5px] rounded-full bg-amber"
              style={{ animation: "yt-dot-fade 1.6s ease-in-out infinite" }}
            />
            Evolving
          </span>
        </div>
        <p
          className="pl-3 pr-1 font-serif text-[14.5px] italic font-normal leading-[1.42] tracking-[-.005em] text-white"
          style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
        >
          <strong className="not-italic font-semibold" style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 50" }}>
            Sam&rsquo;s confidence outpaces the data
          </strong>{" "}
          on alignment timelines. Three of his strongest claims so far are
          softly framed but factually thin.{" "}
          <Link
            href="/session?source=youtube"
            className="ml-1 inline-flex items-center gap-1 border-b border-current pb-[1px] text-[11.5px] font-semibold not-italic text-amber"
          >
            Read more
            <ArrowRight className="h-2.5 w-2.5" strokeWidth={2.4} />
          </Link>
        </p>
      </div>

      {/* Bottom controls */}
      <div
        className="z-[6] flex flex-shrink-0 items-center gap-2 border-t border-line bg-cream px-4 pb-7 pt-3"
        style={{ boxShadow: "0 -6px 16px rgba(20,23,31,.04)" }}
      >
        <button className="inline-flex h-11 w-[102px] flex-shrink-0 items-center justify-center gap-1.5 rounded-full border border-line bg-white text-[13px] font-semibold tracking-[-.01em] text-ink-2">
          <Pause className="h-3 w-3" strokeWidth={2.2} />
          Pause
        </button>
        <button
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border-0 text-[13.5px] font-bold text-white"
          style={{
            background: "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
            boxShadow: "0 7px 18px rgba(220,38,38,.30)",
          }}
        >
          <Square className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
          End &amp; analyze
        </button>
      </div>
    </div>
  );
}

// ─── Root export — orientation-gated ─────────────────────────────────────────

export default function YouTubeWatchPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E2DDC9] p-4 sm:p-6">
      <LandscapeWatch />
      <PortraitWatch />
    </div>
  );
}
