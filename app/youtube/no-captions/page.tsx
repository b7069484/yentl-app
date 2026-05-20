"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Settings as SettingsIcon,
  Play,
  X as XIcon,
  Download,
  RefreshCw,
  ScanSearch,
  ArrowRight,
} from "lucide-react";
import { PhoneFrame, YouTubeModePill } from "@/components/v3/PhoneFrame";

export default function YouTubeNoCaptionsPage() {
  return (
    <PhoneFrame>
      {/* App header */}
      <div className="flex flex-shrink-0 items-center justify-between px-3.5 pb-2 pt-3.5">
        <Link
          href="/youtube/ingest"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-black/5"
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
        </Link>
        <YouTubeModePill />
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-black/5">
          <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-[160px] pt-1">
        {/* Video preview card with error overlay */}
        <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_6px_16px_rgba(20,23,31,.06),0_1px_2px_rgba(20,23,31,.04)]">
          <div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: "16/9",
              background:
                "radial-gradient(ellipse at 32% 40%, #3a2a26 0%, #1c1411 70%, #000 100%)",
            }}
          >
            <span
              className="absolute"
              style={{
                left: "18%",
                top: "14%",
                width: "64%",
                height: "72%",
                background:
                  "linear-gradient(170deg, #c89d6e 0%, #7a5638 42%, #3a2114 100%)",
                borderRadius: 10,
                opacity: 0.78,
              }}
            />
            <span
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.55) 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 z-[3] flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full opacity-60"
              style={{
                background: "rgba(0,0,0,.55)",
                backdropFilter: "blur(8px)",
                border: "1.5px solid rgba(255,255,255,.45)",
              }}
            >
              <Play
                className="ml-[3px] h-[22px] w-[22px] text-white"
                fill="currentColor"
              />
            </div>
            <span className="absolute bottom-2 right-2 z-[2] rounded bg-black/80 px-[7px] py-[3px] font-mono text-[10.5px] font-semibold tracking-[.02em] text-white">
              47:22
            </span>

            {/* Error banner */}
            <div
              role="alert"
              className="absolute left-0 right-0 top-1/2 z-[4] flex -translate-y-1/2 items-center justify-center gap-2 px-3 py-2.5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(185,28,28,.92) 0%, rgba(153,27,27,.94) 100%)",
                borderTop: "1px solid rgba(255,255,255,.14)",
                borderBottom: "1px solid rgba(0,0,0,.28)",
                boxShadow: "0 6px 18px rgba(0,0,0,.32)",
              }}
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#B91C1C]">
                <XIcon className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-[.08em] text-white">
                No Captions
              </span>
            </div>
          </div>

          <div className="px-3 pb-3.5 pt-3">
            <h2
              className="mb-1.5 line-clamp-2 font-serif text-[14.5px] font-semibold leading-[1.28] tracking-[-.01em] text-ink"
              style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
            >
              Inside the studio — an unscripted conversation with our founders
            </h2>
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium tracking-[-.005em] text-ink-3">
              <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#FF0033] text-[9px] font-bold tracking-[-.02em] text-white">
                M
              </span>
              <span className="font-semibold text-ink-2">Mainline Studios</span>
              <span className="text-[10px] text-ink-5">·</span>
              <span>47m</span>
              <span className="text-[10px] text-ink-5">·</span>
              <span>12K views</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "No English captions",
                "No auto-captions",
              ].map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-semibold tracking-[-.005em]"
                  style={{
                    background: "rgba(239,68,68,.14)",
                    color: "#B91C1C",
                    borderColor: "rgba(239,68,68,.32)",
                  }}
                >
                  <XIcon className="h-2.5 w-2.5" strokeWidth={2.6} />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Section header */}
        <div className="mb-1 mt-5 text-left">
          <h2
            className="mb-1.5 font-serif text-[22px] font-medium leading-[1.16] tracking-[-.018em] text-ink"
            style={{ fontVariationSettings: "'opsz' 30, 'SOFT' 50" }}
          >
            No captions on this video.
          </h2>
          <p
            className="font-serif text-[14px] italic font-normal leading-[1.42] text-ink-3"
            style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 50" }}
          >
            Yentl needs captions or audio to analyze. Here are your options.
          </p>
        </div>

        {/* Options stack */}
        <div className="mt-3 flex flex-col gap-2.5">
          {/* Option 1: amber */}
          <div
            className="flex items-start gap-3 rounded-[13px] border px-3 py-3"
            style={{
              background: "#FEF3C7",
              borderColor: "rgba(245,158,11,.42)",
            }}
          >
            <span
              className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] border bg-white shadow-[0_2px_6px_rgba(245,158,11,.16)]"
              style={{ borderColor: "rgba(245,158,11,.32)" }}
            >
              <Download className="h-5 w-5 text-[#92400E]" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="mb-[3px] font-serif text-[15px] font-semibold leading-[1.18] tracking-[-.01em] text-[#92400E]"
                style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
              >
                Download audio yourself
              </p>
              <p className="mb-2 text-[12px] leading-[1.38] text-[#92400E] opacity-85">
                Grab the audio with a YouTube downloader, then drop it here as
                an audio file.
              </p>
              <Link
                href="/session?source=audio"
                className="inline-flex items-center gap-1 text-[12px] font-semibold tracking-[-.005em] text-[#92400E]"
              >
                Open Audio file path
                <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
              </Link>
            </div>
          </div>

          {/* Option 2: paper */}
          <div className="flex items-start gap-3 rounded-[13px] border border-line bg-cream-2 px-3 py-3">
            <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] border border-line bg-white shadow-[0_2px_6px_rgba(20,23,31,.06)]">
              <RefreshCw
                className="h-5 w-5 text-ink-2"
                strokeWidth={2}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="mb-[3px] font-serif text-[15px] font-semibold leading-[1.18] tracking-[-.01em] text-ink"
                style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
              >
                Try a different video
              </p>
              <p className="mb-2 text-[12px] leading-[1.38] text-ink-3">
                Most news, interview, and podcast channels publish with
                captions on by default.
              </p>
              <Link
                href="/youtube/ingest"
                className="inline-flex items-center gap-1 text-[12px] font-semibold tracking-[-.005em] text-teal"
              >
                Paste a different URL
                <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
              </Link>
            </div>
          </div>

          {/* Option 3: pro/beta — disabled */}
          <div className="flex items-start gap-3 rounded-[13px] border border-line bg-cream-2 px-3 py-3">
            <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] border border-line bg-white shadow-[0_2px_6px_rgba(20,23,31,.06)]">
              <ScanSearch
                className="h-5 w-5 text-ink-2"
                strokeWidth={2}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-[3px] flex flex-wrap items-center gap-1.5">
                <span
                  className="font-serif text-[15px] font-semibold leading-[1.18] tracking-[-.01em] text-ink"
                  style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
                >
                  Use auto-generated
                </span>
                <span className="inline-flex items-center rounded bg-ink px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[.06em] text-white">
                  Beta · Pro
                </span>
              </div>
              <p className="mb-2 text-[12px] leading-[1.38] text-ink-3">
                We transcribe the audio directly from the video. Slower
                (real-time pull) and Pro-only — about $0.50 / hour.
              </p>
              <span className="inline-flex cursor-not-allowed items-center gap-1.5 text-[12px] font-semibold tracking-[-.005em] text-ink-4">
                Try auto-transcribe
                <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
                <span className="rounded bg-black/8 px-1.5 py-[1px] font-mono text-[9px] font-bold uppercase tracking-[.06em] text-ink-4">
                  Free
                </span>
              </span>
            </div>
          </div>
        </div>

        <p
          className="mt-3.5 px-1 text-center font-serif text-[11px] italic leading-[1.45] text-ink-4"
          style={{ fontVariationSettings: "'opsz' 12, 'SOFT' 50" }}
        >
          Most channels enable captions automatically — but Yentl can&rsquo;t
          force it. We&rsquo;re working on direct audio fallback.
        </p>
      </div>

      {/* Anchored bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[6] flex items-center gap-2.5 border-t border-line bg-cream px-4 pb-7 pt-3.5"
        style={{ boxShadow: "0 -8px 24px rgba(20,23,31,.07)" }}
      >
        <Link
          href="/youtube/ingest"
          className="inline-flex h-12 flex-shrink-0 items-center gap-1.5 rounded-full border border-line bg-transparent px-3.5 text-[13.5px] font-semibold tracking-[-.01em] text-ink-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          Different URL
        </Link>
        <Link
          href="/session?source=audio"
          className="ml-auto inline-flex h-[54px] w-[220px] flex-shrink-0 items-center justify-center gap-2 rounded-full text-[14px] font-bold tracking-[-.01em] text-white"
          style={{
            background: "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
            boxShadow:
              "0 10px 26px rgba(220,38,38,.32), inset 0 1px 0 rgba(255,255,255,.22)",
          }}
        >
          Open audio path
          <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      </div>
    </PhoneFrame>
  );
}
