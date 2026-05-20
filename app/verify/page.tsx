"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Mail, RotateCw } from "lucide-react";

const InlineWordmark = () => (
  <span
    className="inline-flex items-baseline font-serif text-[24px] font-medium tracking-[-.02em] text-ink"
    style={{
      fontVariationSettings: "'opsz' 36, 'SOFT' 50",
      whiteSpace: "nowrap",
    }}
  >
    <svg
      className="mr-[6px] h-6 w-6 translate-y-[2px] text-teal"
      viewBox="0 0 1400 1400"
      fill="none"
      aria-hidden
    >
      <path
        d="M340 320 L700 720 L1060 320 M700 720 L700 1080"
        stroke="currentColor"
        strokeWidth="160"
        strokeLinecap="round"
      />
    </svg>
    yentl
    <span
      aria-hidden
      className="mx-[1px] inline-block h-[5px] w-[5px] -translate-y-[3px] rounded-full bg-amber"
    />
    <span className="font-normal text-ink-3">it</span>
  </span>
);

const EnvelopeHero = () => (
  <div className="relative mt-5 mb-2 flex h-[200px] w-full items-center justify-center">
    {/* radial halo */}
    <div
      className="absolute h-[240px] w-[240px] rounded-full"
      style={{
        background:
          "radial-gradient(circle at center, rgba(37,99,235,.18) 0%, rgba(37,99,235,.10) 35%, transparent 65%)",
        filter: "blur(2px)",
        animation: "verify-pulse 3.4s ease-in-out infinite",
      }}
    />

    {/* italic Fraunces serif flourishes */}
    <span
      aria-hidden
      className="absolute left-[8%] top-[38%] font-serif italic"
      style={{
        color: "#93C5FD",
        fontSize: "48px",
        opacity: 0.16,
        fontVariationSettings: "'opsz' 144, 'SOFT' 100",
        transform: "rotate(-12deg)",
        lineHeight: 1,
        letterSpacing: "-.04em",
        zIndex: 0,
      }}
    >
      e
    </span>
    <span
      aria-hidden
      className="absolute right-[8%] top-[30%] font-serif italic"
      style={{
        color: "#93C5FD",
        fontSize: "48px",
        opacity: 0.16,
        fontVariationSettings: "'opsz' 144, 'SOFT' 100",
        transform: "rotate(14deg)",
        lineHeight: 1,
        letterSpacing: "-.04em",
        zIndex: 0,
      }}
    >
      m
    </span>

    {/* flying paper background elements */}
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span
        className="verify-paper-fly"
        style={{
          top: "18%",
          left: "14%",
          transform: "rotate(-18deg)",
          animation: "verify-float-a 5s ease-in-out infinite",
        }}
      />
      <span
        className="verify-paper-fly"
        style={{
          top: "34%",
          right: "12%",
          transform: "rotate(22deg)",
          animation: "verify-float-b 5.4s ease-in-out infinite .6s",
        }}
      />
      <span
        className="verify-paper-fly"
        style={{
          bottom: "18%",
          left: "18%",
          transform: "rotate(14deg)",
          opacity: 0.55,
          animation: "verify-float-c 6s ease-in-out infinite .3s",
        }}
      />
      <span
        className="verify-paper-fly"
        style={{
          bottom: "24%",
          right: "18%",
          transform: "rotate(-14deg)",
          opacity: 0.4,
          animation: "verify-float-a 5.6s ease-in-out infinite 1.1s",
        }}
      />
    </div>

    {/* envelope */}
    <div
      className="relative z-[2]"
      style={{ animation: "verify-bob 3.6s ease-in-out infinite" }}
    >
      <div
        className="flex h-[120px] w-[120px] items-center justify-center rounded-full border border-line"
        style={{
          background: "linear-gradient(155deg, #F0EAD6 0%, #FAF9F5 100%)",
          boxShadow:
            "0 18px 36px rgba(37,99,235,.18), 0 4px 10px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.7)",
        }}
      >
        <svg
          className="relative z-[2] h-[62px] w-[62px]"
          viewBox="0 0 64 64"
          fill="none"
        >
          <rect
            x="8"
            y="20"
            width="48"
            height="32"
            rx="4"
            fill="#2563EB"
            opacity="0.10"
          />
          <rect
            x="8"
            y="20"
            width="48"
            height="32"
            rx="4"
            stroke="#2563EB"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <rect
            x="14"
            y="14"
            width="36"
            height="22"
            rx="2"
            stroke="#2563EB"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="#FFFFFF"
          />
          <line
            x1="18"
            y1="20"
            x2="36"
            y2="20"
            stroke="#93C5FD"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="18"
            y1="24"
            x2="44"
            y2="24"
            stroke="#93C5FD"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="18"
            y1="28"
            x2="40"
            y2="28"
            stroke="#93C5FD"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M8 22 L32 36 L56 22"
            stroke="#2563EB"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle
            cx="50"
            cy="18"
            r="6"
            fill="#22C55E"
            style={{
              opacity: 0,
              animation: "verify-check-blink 3.6s ease-in-out infinite 1s",
            }}
          />
        </svg>
      </div>
    </div>
  </div>
);

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "you@domain.com";
  const [countdown, setCountdown] = useState(42);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const canResend = countdown === 0;
  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E2DDC9] px-4 py-6 sm:py-12">
      <div className="relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-line/60 bg-cream shadow-[0_30px_60px_rgba(0,0,0,.18)]">
        {/* Top bar */}
        <div className="relative flex items-center justify-between px-4 pt-3 pb-1">
          <Link
            href="/signin"
            aria-label="Back to sign in"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream-2 text-ink-2 transition-colors hover:border-teal/50 hover:bg-white"
          >
            <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.3} />
          </Link>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <InlineWordmark />
          </span>
          <div className="h-9 w-9" />
        </div>

        {/* Body scroll */}
        <div className="flex flex-1 flex-col items-center px-5 pb-8">
          <EnvelopeHero />

          {/* Headline */}
          <div className="text-center">
            <h1
              className="font-serif text-[28px] font-medium leading-[1.15] tracking-[-.02em] text-ink"
              style={{ fontVariationSettings: "'opsz' 48, 'SOFT' 50" }}
            >
              Check your{" "}
              <em
                className="font-serif italic text-teal"
                style={{
                  fontVariationSettings: "'opsz' 48, 'SOFT' 100",
                  whiteSpace: "nowrap",
                }}
              >
                inbox.
              </em>
            </h1>
            <p
              className="mt-2.5 font-serif text-[16px] italic leading-[1.4] text-ink-3"
              style={{ fontVariationSettings: "'opsz' 24, 'SOFT' 80" }}
            >
              We sent a magic link to
              <br />
              <span className="mt-2 inline-block rounded-[8px] border border-line bg-cream-2 px-3 py-1.5 font-mono text-[14.5px] font-medium not-italic tracking-[-.01em] text-ink">
                {email}
              </span>
            </p>
          </div>

          {/* Action card */}
          <div className="mt-5 w-full rounded-[14px] border border-line bg-cream-2 px-4 py-3.5 text-center">
            <p className="text-[14.5px] font-medium leading-[1.4] tracking-[-.005em] text-ink">
              Tap the{" "}
              <span
                className="font-serif italic font-medium text-teal"
                style={{ fontVariationSettings: "'opsz' 24" }}
              >
                magic link
              </span>{" "}
              in the email to sign in.
            </p>
            <p className="mt-1.5 font-mono text-[11px] font-medium tracking-[.02em] text-ink-4">
              LINKS EXPIRE IN <span className="whitespace-nowrap">10 MINUTES</span>
            </p>
            <div className="my-2.5 h-px bg-line" />
            <p className="text-[12.5px] leading-[1.3] text-ink-3">
              Wrong email?{" "}
              <Link
                href="/signin"
                className="font-medium text-teal hover:underline"
              >
                Use a different one →
              </Link>
            </p>
          </div>

          {/* Open mail app button */}
          <a
            href="mailto:"
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-teal bg-white px-4 py-3 text-[14.5px] font-semibold tracking-[-.005em] text-teal transition-colors hover:bg-teal-soft"
          >
            <Mail className="h-[18px] w-[18px]" strokeWidth={2.2} />
            Open mail app
          </a>

          {/* Resend block */}
          <div className="mt-4 w-full rounded-[14px] border border-cream-2 bg-cream px-4 py-3.5 text-center">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-ink-4">
              <span className="h-px w-[18px] bg-line" />
              Didn&rsquo;t get it?
              <span className="h-px w-[18px] bg-line" />
            </div>
            <p className="mt-2 text-[12.5px] leading-[1.4] text-ink-3">
              Check spam, then resend.
            </p>
            <button
              disabled={!canResend}
              className={`mt-2.5 inline-flex items-center gap-1.5 font-mono text-[13px] font-medium ${
                canResend
                  ? "text-teal hover:underline"
                  : "cursor-not-allowed text-ink-4"
              }`}
            >
              <RotateCw className="h-[14px] w-[14px]" strokeWidth={2.2} />
              {canResend ? (
                "Resend link"
              ) : (
                <>
                  Resend link{" "}
                  <span className="tabular-nums whitespace-nowrap">
                    ({mm}:{ss})
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Support */}
          <p className="mt-auto pt-5 text-center text-[12px] leading-[1.4] text-ink-4">
            Still stuck?{" "}
            <Link
              href="/about#help"
              className="font-medium text-ink-3 hover:text-teal"
            >
              Email support
              <span className="ml-0.5 inline-block -translate-y-px">→</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
