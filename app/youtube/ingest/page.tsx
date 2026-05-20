"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Settings as SettingsIcon,
  Link2,
  X as XIcon,
  Play,
  Check,
  RotateCw,
  ArrowRight,
} from "lucide-react";
import { PhoneFrame, YouTubeModePill } from "@/components/v3/PhoneFrame";

export default function YouTubeIngestPage() {
  return (
    <PhoneFrame>
      {/* App header */}
      <div className="flex flex-shrink-0 items-center justify-between px-3.5 pb-2 pt-3.5">
        <Link
          href="/sources"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-black/5"
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
        </Link>
        <YouTubeModePill />
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-black/5">
          <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>

      {/* Scroll body */}
      <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-[180px] pt-1.5">
        {/* Hero */}
        <div className="pb-4 pt-1.5 text-left">
          <h1
            className="font-serif text-[26px] font-medium leading-[1.12] tracking-[-.018em] text-ink"
            style={{ fontVariationSettings: "'opsz' 36, 'SOFT' 50" }}
          >
            Paste{" "}
            <em
              className="font-serif italic text-[#B91C1C]"
              style={{ fontVariationSettings: "'opsz' 36, 'SOFT' 100" }}
            >
              any
            </em>{" "}
            YouTube URL
          </h1>
          <p className="mt-1.5 max-w-[320px] text-[13px] leading-[1.42] text-ink-3">
            We&rsquo;ll pull captions, run them through Yentl, and stream
            findings as you watch.
          </p>
        </div>

        {/* URL input card */}
        <div
          role="textbox"
          aria-label="YouTube URL"
          className="relative my-3 flex items-center gap-2 rounded-[14px] border-[1.5px] border-teal bg-cream-2 px-3 py-3"
          style={{ boxShadow: "0 0 0 4px rgba(37,99,235,.18)" }}
        >
          <Link2 className="h-4 w-4 flex-shrink-0 text-ink-4" strokeWidth={2} />
          <span className="flex-1 truncate font-mono text-[12.5px] font-medium tracking-[-.01em] text-ink">
            <span className="font-normal text-ink-4">https://</span>
            youtu.be/dQw4w9WgXcQ
          </span>
          <button
            aria-label="Clear URL"
            className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-ink-5 text-white"
          >
            <XIcon className="h-2.5 w-2.5" strokeWidth={2.4} />
          </button>
        </div>

        {/* Video preview card */}
        <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_6px_16px_rgba(20,23,31,.06),0_1px_2px_rgba(20,23,31,.04)]">
          {/* Thumbnail */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: "16/9",
              background:
                "radial-gradient(ellipse at 32% 40%, #5b3a2e 0%, #1c1411 70%, #000 100%)",
            }}
          >
            <span
              className="absolute"
              style={{
                left: "20%",
                top: "10%",
                width: "62%",
                height: "74%",
                background:
                  "linear-gradient(170deg, #d3a577 0%, #8b6443 42%, #3d2418 100%)",
                borderRadius: 10,
                opacity: 0.88,
              }}
            />
            <span
              className="absolute"
              style={{
                left: "54%",
                top: "14%",
                width: "32%",
                height: "42%",
                background:
                  "radial-gradient(ellipse, #3a4258 0%, #161922 60%)",
                borderRadius: "50%",
                opacity: 0.85,
              }}
            />
            <span
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,.45) 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 z-[3] flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                background: "rgba(0,0,0,.62)",
                backdropFilter: "blur(8px)",
                border: "1.5px solid rgba(255,255,255,.85)",
                boxShadow: "0 6px 18px rgba(0,0,0,.32)",
              }}
            >
              <Play
                className="ml-[3px] h-[22px] w-[22px] text-white"
                fill="currentColor"
              />
            </div>
            <span className="absolute bottom-2 right-2 z-[2] rounded bg-black/80 px-[7px] py-[3px] font-mono text-[10.5px] font-semibold tracking-[.02em] text-white">
              2:14:08
            </span>
          </div>

          {/* Preview body */}
          <div className="px-3 pb-3.5 pt-3">
            <h2
              className="mb-1.5 line-clamp-2 font-serif text-[15.5px] font-semibold leading-[1.28] tracking-[-.01em] text-ink"
              style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
            >
              Lex Fridman #418 — Sam Altman on AI alignment, AGI timelines,
              OpenAI
            </h2>
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium tracking-[-.005em] text-ink-3">
              <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#FF0033] text-[9px] font-bold tracking-[-.02em] text-white">
                L
              </span>
              <span className="font-semibold text-ink-2">
                Lex Fridman Podcast
              </span>
              <span className="text-[10px] text-ink-5">·</span>
              <span>2h 14m</span>
              <span className="text-[10px] text-ink-5">·</span>
              <span>8.4M views</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-semibold tracking-[-.005em]"
                style={{
                  background: "#ECFDF3",
                  color: "#15803D",
                  borderColor: "rgba(34,197,94,.25)",
                }}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={2.6} />
                English captions detected
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-semibold tracking-[-.005em]"
                style={{
                  background: "#ECFDF3",
                  color: "#15803D",
                  borderColor: "rgba(34,197,94,.25)",
                }}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={2.6} />
                Multi-speaker
              </span>
            </div>
          </div>
        </div>

        {/* Rotate prompt */}
        <div
          className="relative mt-4 flex items-start gap-3 overflow-hidden rounded-[14px] border-[1.5px] px-3.5 py-3.5"
          style={{
            background: "#FEF3C7",
            borderColor: "rgba(245,158,11,.42)",
            boxShadow: "0 4px 14px rgba(245,158,11,.10)",
          }}
        >
          <span
            className="pointer-events-none absolute"
            style={{
              right: -22,
              top: -22,
              width: 90,
              height: 90,
              background:
                "radial-gradient(circle, rgba(245,158,11,.18) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />
          <span
            className="relative z-[2] flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] border bg-white shadow-[0_2px_6px_rgba(245,158,11,.18)]"
            style={{ borderColor: "rgba(245,158,11,.32)" }}
          >
            <RotateCw
              className="h-6 w-6 text-[#92400E]"
              strokeWidth={2}
              style={{ animation: "yt-rotate-wiggle 4.2s ease-in-out infinite" }}
            />
          </span>
          <div className="relative z-[2] min-w-0 flex-1">
            <p
              className="mb-1 font-serif text-[16px] font-semibold leading-[1.18] tracking-[-.01em] text-[#92400E]"
              style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
            >
              Rotate to landscape
            </p>
            <p
              className="font-serif text-[12.5px] italic leading-[1.38] text-[#92400E] opacity-85"
              style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 30" }}
            >
              Yentl works best with the video on one side and findings on the
              other.
            </p>
          </div>
        </div>

        <p className="mt-2.5 px-2 text-center text-[11.5px] leading-[1.4] text-ink-4">
          <em className="font-serif italic font-normal not-italic text-ink-3">
            Don&rsquo;t want to flip your phone?
          </em>{" "}
          Tap below and we&rsquo;ll rotate it for you.
        </p>
      </div>

      {/* Anchored bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[6] flex items-center gap-2.5 border-t border-line bg-cream px-4 pb-7 pt-3.5"
        style={{ boxShadow: "0 -8px 24px rgba(20,23,31,.07)" }}
      >
        <Link
          href="/sources"
          className="inline-flex h-12 flex-shrink-0 items-center gap-1.5 rounded-full border border-line bg-transparent px-3.5 text-[13.5px] font-semibold tracking-[-.01em] text-ink-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          Back
        </Link>
        <Link
          href="/session?source=youtube&url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ"
          className="ml-auto inline-flex h-[54px] w-[220px] flex-shrink-0 items-center justify-center gap-2 rounded-full text-[14.5px] font-bold tracking-[-.01em] text-white"
          style={{
            background: "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
            boxShadow:
              "0 10px 26px rgba(220,38,38,.32), inset 0 1px 0 rgba(255,255,255,.22)",
          }}
        >
          <RotateCw className="h-4 w-4" strokeWidth={2.2} />
          Start in landscape
        </Link>
      </div>
    </PhoneFrame>
  );
}
