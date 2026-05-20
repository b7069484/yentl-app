"use client";

import Link from "next/link";
import {
  X as XIcon,
  Check,
  AlertTriangle,
  Lock,
  Sparkles,
  ShieldCheck,
  CreditCard,
  RefreshCw,
} from "lucide-react";

export default function PaywallSheetPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1A1D26]">
      {/* Backdrop — faux session content blurred */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cream" />
        <div className="absolute inset-0 px-5 py-16 opacity-30 blur-[1.5px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="block h-[18px] w-14 rounded-full bg-line" />
            <span className="block h-[11px] w-8 rounded-[3px] bg-line-soft" />
          </div>
          <span className="mb-1.5 block h-[11px] w-[80%] rounded-[3px] bg-line" />
          <span className="mb-1.5 block h-[11px] w-[100%] rounded-[3px] bg-line" />
          <span className="mb-5 block h-[11px] w-[60%] rounded-[3px] bg-line" />
          <div className="mb-3 rounded-[12px] border border-line-soft bg-white/50 p-3.5">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="block h-[18px] w-14 rounded-full bg-amber-soft" />
              <span className="block h-[11px] w-8 rounded-[3px] bg-line-soft" />
            </div>
            <span className="mb-1.5 block h-[11px] w-full rounded-[3px] bg-line" />
            <span className="block h-[11px] w-[80%] rounded-[3px] bg-line" />
          </div>
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(20,23,31,.48)",
            backdropFilter: "blur(3px)",
          }}
        />
      </div>

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[50] flex flex-col rounded-t-[24px] bg-cream"
        style={{
          height: "92vh",
          boxShadow: "0 -24px 60px rgba(0,0,0,.42)",
          animation: "v3-sheet-up 0.42s cubic-bezier(.18,.89,.32,1.18)",
        }}
      >
        {/* Drag */}
        <div className="flex flex-shrink-0 justify-center pb-1 pt-2.5">
          <span className="block h-1 w-[38px] rounded-full bg-ink-5" />
        </div>

        {/* Head */}
        <div className="flex flex-shrink-0 items-center justify-between gap-2.5 px-5 pb-1.5 pt-0.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[.1em] text-ink-4">
            Paywall
          </span>
          <Link
            href="/session"
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-cream-2 text-ink-3 transition-colors hover:bg-white"
          >
            <XIcon className="h-3 w-3" strokeWidth={2.4} />
          </Link>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-3.5 pt-2 [&::-webkit-scrollbar]:w-0">
          {/* Hero: Cap reached */}
          <div
            className="relative mt-1.5 overflow-hidden rounded-[16px] border px-4 pb-3.5 pt-4"
            style={{
              background: "linear-gradient(180deg, #FEF2F2 0%, #FAF9F5 100%)",
              borderColor: "rgba(239,68,68,.22)",
            }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B91C1C]"
            />
            <span
              className="mb-2.5 inline-flex items-center gap-1.5 rounded-full pl-[7px] pr-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.1em]"
              style={{ background: "#FEF3C7", color: "#92400E" }}
            >
              <AlertTriangle className="h-[11px] w-[11px]" strokeWidth={2.4} />
              Cap reached
            </span>
            <p
              className="font-serif text-[20px] font-medium leading-[1.3] tracking-[-.01em] text-ink"
              style={{ fontVariationSettings: "'opsz' 24, 'SOFT' 30" }}
            >
              You&rsquo;ve used{" "}
              <strong className="font-semibold text-[#B91C1C]">
                all 15 free minutes
              </strong>{" "}
              this month.
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-line-soft">
                <div
                  className="absolute inset-y-0 left-0 w-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #EF4444 0%, #B91C1C 100%)",
                  }}
                />
              </div>
              <span className="whitespace-nowrap font-mono text-[11px] font-bold tracking-[-.02em] text-[#B91C1C]">
                15 / 15 min
              </span>
            </div>
          </div>

          {/* Usage this month */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[.09em] text-ink-4">
                Usage this month
              </span>
              <span className="rounded-full border border-line bg-cream-2 px-1.5 py-[2px] font-mono text-[9.5px] font-semibold uppercase tracking-[.04em] text-ink-3">
                Free tier
              </span>
            </div>
            <div className="flex flex-col gap-2.5 rounded-[12px] border border-line bg-white px-3.5 py-3">
              {[
                { name: "Minutes", used: "15", total: "15", w: "100%", color: "#EF4444", full: true },
                { name: "Sessions saved", used: "2", total: "3", w: "67%", color: "#22C55E", full: false },
                { name: "Sources per claim", used: "2", total: "2", w: "100%", color: "#2563EB", full: false },
              ].map((r) => (
                <div key={r.name} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold tracking-[-.005em] text-ink-2">{r.name}</span>
                    <span className="whitespace-nowrap font-mono text-[10.5px] font-semibold tracking-[-.01em]">
                      <span className={r.full ? "text-[#B91C1C]" : "text-ink"}>{r.used}</span>
                      <span className="font-medium text-ink-4"> / {r.total}</span>
                    </span>
                  </div>
                  <div className="relative h-[5px] overflow-hidden rounded-full bg-line-soft">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: r.w, background: r.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tier comparison */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {/* Free (current) */}
            <div className="flex flex-col gap-1.5 rounded-[13px] border border-line bg-white px-3 py-3 opacity-70">
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className="font-serif text-[15px] font-semibold tracking-[-.01em] text-ink"
                  style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
                >
                  Free
                </span>
                <span className="whitespace-nowrap rounded-full border border-line bg-cream-2 px-1.5 py-[2px] font-mono text-[8.5px] font-bold uppercase tracking-[.06em] text-ink-3">
                  You
                </span>
              </div>
              <span className="font-mono text-[10.5px] font-semibold tracking-[-.01em] text-ink-3">
                $0 / mo
              </span>
              <ul className="mt-1.5 flex list-none flex-col gap-1.5">
                {["15 min / month", "3 sessions saved", "2 sources / claim"].map((x) => (
                  <li key={x} className="flex items-start gap-1.5 text-[11px] leading-[1.35] tracking-[-.005em] text-ink-2">
                    <span className="mt-[1px] flex h-[11px] w-[11px] flex-shrink-0 items-center justify-center rounded-full bg-ink-5 text-white">
                      <Check className="h-[7px] w-[7px]" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro (upgrade) */}
            <div
              className="relative flex flex-col gap-1.5 rounded-[13px] border-2 px-3 py-3"
              style={{
                background: "linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 35%)",
                borderColor: "#2563EB",
                boxShadow: "0 4px 16px rgba(37,99,235,.18)",
              }}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className="font-serif text-[15px] font-semibold tracking-[-.01em] text-teal"
                  style={{ fontVariationSettings: "'opsz' 18, 'SOFT' 30" }}
                >
                  Pro
                </span>
                <span
                  className="whitespace-nowrap rounded-full px-1.5 py-[2px] font-mono text-[8.5px] font-bold uppercase tracking-[.06em] text-white"
                  style={{ background: "#2563EB" }}
                >
                  Next
                </span>
              </div>
              <span className="font-mono text-[10.5px] font-semibold tracking-[-.01em] text-ink-3">
                $9 / mo
              </span>
              <ul className="mt-1.5 flex list-none flex-col gap-1.5">
                {["Unlimited minutes", "Unlimited sessions", "Up to 5 sources / claim"].map((x) => (
                  <li key={x} className="flex items-start gap-1.5 text-[11px] leading-[1.35] tracking-[-.005em] text-ink-2">
                    <span
                      className="mt-[1px] flex h-[11px] w-[11px] flex-shrink-0 items-center justify-center rounded-full text-white"
                      style={{ background: "#15803D" }}
                    >
                      <Check className="h-[7px] w-[7px]" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Unlock bullets */}
          <div className="mt-4 rounded-[12px] border border-line bg-white px-3.5 py-3">
            <p
              className="mb-2.5 font-serif text-[14.5px] font-semibold tracking-[-.01em] text-ink"
              style={{ fontVariationSettings: "'opsz' 24, 'SOFT' 30" }}
            >
              Pro unlocks
            </p>
            <ul className="flex list-none flex-col gap-2">
              {[
                <>
                  <strong>Unlimited fact-check minutes</strong> — record as long as you need
                </>,
                <>
                  <span className="font-mono text-[#2563EB] font-bold not-italic">5×</span> more sources per claim — deeper receipts
                </>,
                <>
                  <strong>Pro auto-transcribe</strong> for YouTube videos without captions
                </>,
                <>
                  <strong>Permanent session archive</strong> — every claim, marker, source kept
                </>,
              ].map((node, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 font-serif text-[13px] leading-[1.4] text-ink-2"
                  style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 40" }}
                >
                  <span
                    className="mt-[1px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: "#15803D" }}
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  <span>{node}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Price block */}
          <div
            className="relative mt-4 overflow-hidden rounded-[14px] border border-line bg-gradient-to-b from-white to-cream px-4 pb-3.5 pt-4 text-center"
          >
            <span
              aria-hidden
              className="absolute left-0 right-0 top-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, #2563EB 0%, #15803D 100%)",
              }}
            />
            <div className="flex items-baseline justify-center gap-[3px] tracking-[-.02em]">
              <span
                className="font-serif text-[24px] font-semibold text-ink"
                style={{ fontVariationSettings: "'opsz' 24, 'SOFT' 30" }}
              >
                $
              </span>
              <span
                className="font-serif text-[44px] font-semibold leading-none text-ink"
                style={{ fontVariationSettings: "'opsz' 60, 'SOFT' 30" }}
              >
                9
              </span>
              <span className="text-[13.5px] font-medium tracking-[-.005em] text-ink-3">
                / month
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[10.5px] font-medium tracking-[.02em] text-ink-3">
              or $84 / year
              <span className="ml-1 whitespace-nowrap font-bold text-[#15803D]">
                save 22%
              </span>
            </p>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 border-t border-line-soft pt-2.5 text-[10.5px] font-medium tracking-[-.005em] text-ink-4">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck className="h-2.5 w-2.5 text-[#15803D]" strokeWidth={2.4} />
                Cancel anytime
              </span>
              <span className="inline-block h-[2px] w-[2px] rounded-full bg-ink-5" />
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <CreditCard className="h-2.5 w-2.5 text-[#15803D]" strokeWidth={2.4} />
                Stripe checkout
              </span>
              <span className="inline-block h-[2px] w-[2px] rounded-full bg-ink-5" />
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <RefreshCw className="h-2.5 w-2.5 text-[#15803D]" strokeWidth={2.4} />
                14-day refund
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 flex-col items-center gap-2.5 border-t border-line-soft bg-cream px-4 pb-7 pt-3">
          <button
            className="flex h-[50px] w-[220px] max-w-[220px] items-center justify-center gap-2 rounded-full px-4 py-3 text-[14.5px] font-semibold tracking-[-.005em] text-white"
            style={{
              background:
                "linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)",
              boxShadow:
                "0 4px 16px rgba(239,68,68,.32), inset 0 1px 0 rgba(255,255,255,.18)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.6} />
            Upgrade to Pro
          </button>
          <Link
            href="/session"
            className="rounded-md px-2.5 py-1.5 text-[12.5px] font-medium tracking-[-.005em] text-ink-3 hover:text-ink-2 hover:underline hover:underline-offset-[3px]"
          >
            Maybe later — wait until next month
          </Link>
        </div>
      </div>
    </div>
  );
}
