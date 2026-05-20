import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  Mic,
  FileAudio2,
  FileText,
  Link2,
  ChevronRight,
} from "lucide-react";

const YouTubeGlyph = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path
      d="M21.6 6.2a2.5 2.5 0 0 0-1.8-1.8C18 4 12 4 12 4s-6 0-7.8.4A2.5 2.5 0 0 0 2.4 6.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 5.8 2.5 2.5 0 0 0 1.8 1.8C6 20 12 20 12 20s6 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-5.8z"
      opacity=".95"
    />
    <polygon points="10,8.5 16,12 10,15.5" fill="#FAF9F5" />
  </svg>
);

const YMark = () => (
  <svg
    className="mr-[6px] h-[22px] w-[22px] translate-y-[2px] text-teal"
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
);

type SourceCard = {
  href: string;
  title: string;
  desc: string;
  pill?: string;
  primary?: boolean;
  iconColor: string;
  iconBg: string;
  icon: React.ReactNode;
};

const sources: SourceCard[] = [
  {
    href: "/session?source=mic",
    title: "Live mic",
    desc: "Record a conversation, debate, lecture — transcribed in real time",
    pill: "Fastest",
    primary: true,
    iconColor: "text-white",
    iconBg: "bg-teal",
    icon: <Mic className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    href: "/session?source=audio",
    title: "Audio file",
    desc: "Drop .mp3 / .m4a / .wav up to 4 hours",
    iconColor: "text-ink-2",
    iconBg: "bg-cream-2",
    icon: <FileAudio2 className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    href: "/session?source=youtube",
    title: "YouTube",
    desc: "Paste a URL — captions or audio, your choice",
    iconColor: "text-[#DC2626]",
    iconBg: "bg-[#FEE2E2]",
    icon: <YouTubeGlyph className="h-[22px] w-[22px]" />,
  },
  {
    href: "/session?source=text",
    title: "Text / transcript",
    desc: "Paste an article, post, or transcript",
    iconColor: "text-[#92400E]",
    iconBg: "bg-amber-soft",
    icon: <FileText className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
  {
    href: "/session?source=url",
    title: "Podcast / media URL",
    desc: "Direct link to any audio or video",
    iconColor: "text-[#4338CA]",
    iconBg: "bg-[#E0E7FF]",
    icon: <Link2 className="h-[22px] w-[22px]" strokeWidth={2} />,
  },
];

export default function SourcesPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-[#E2DDC9] px-4 py-6 sm:py-12">
      <div className="relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-line/60 bg-cream shadow-[0_30px_60px_rgba(0,0,0,.18)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <Link
            href="/"
            className="inline-flex items-baseline font-serif text-[22px] font-medium tracking-[-.02em] text-ink"
            style={{
              fontVariationSettings: "'opsz' 36, 'SOFT' 50",
              whiteSpace: "nowrap",
            }}
          >
            <YMark />
            yentl
            <span
              aria-hidden
              className="mx-[1px] inline-block h-[5px] w-[5px] -translate-y-[2px] rounded-full bg-amber"
            />
            <span className="font-normal text-ink-3">it</span>
          </Link>
          <div className="flex h-[34px] w-[34px] items-center justify-center">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "!h-[34px] !w-[34px]",
                  userButtonAvatarBox: "!h-[34px] !w-[34px]",
                },
              }}
            />
          </div>
        </div>

        {/* Headline */}
        <div className="px-5 pt-2 pb-5">
          <h1
            className="font-serif text-[30px] font-medium leading-[1.1] tracking-[-.02em] text-ink"
            style={{ fontVariationSettings: "'opsz' 48, 'SOFT' 50" }}
          >
            What do you want to{" "}
            <em
              className="font-serif italic text-teal"
              style={{
                fontVariationSettings: "'opsz' 48, 'SOFT' 100",
                whiteSpace: "nowrap",
              }}
            >
              fact-check?
            </em>
          </h1>
          <p className="mt-1.5 text-[13px] leading-[1.4] text-ink-3">
            3 seconds in. Truth on tap.
          </p>
        </div>

        {/* Source cards */}
        <div className="flex flex-col gap-2.5 px-4 pb-2">
          {sources.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className={`group relative flex items-center gap-3.5 rounded-[14px] border bg-white px-4 py-3.5 transition-all hover:border-teal/50 hover:shadow-[0_4px_12px_rgba(0,0,0,.06)] ${
                s.primary
                  ? "border-[1.5px] border-teal bg-gradient-to-b from-teal-soft to-white shadow-[0_6px_18px_rgba(37,99,235,.18)]"
                  : "border-line"
              }`}
            >
              <span
                className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] ${s.iconBg} ${s.iconColor}`}
              >
                {s.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold tracking-[-.01em] text-ink">
                    {s.title}
                  </span>
                  {s.pill && (
                    <span className="inline-flex items-center rounded-full bg-amber px-[7px] py-[2px] font-mono text-[9px] font-bold uppercase tracking-[.08em] text-ink">
                      {s.pill}
                    </span>
                  )}
                </span>
                <span className="mt-[3px] block text-[11.5px] leading-[1.35] text-ink-3">
                  {s.desc}
                </span>
              </span>
              <ChevronRight
                className={`h-[18px] w-[18px] flex-shrink-0 ${
                  s.primary ? "text-teal" : "text-ink-4"
                }`}
                strokeWidth={2.2}
              />
            </Link>
          ))}
        </div>

        {/* Recent sessions */}
        <div className="mt-4 px-5 pb-4">
          <div className="mb-2 flex items-center justify-between px-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-ink-4">
              Pick up where you left off
            </span>
            <Link
              href="/sessions"
              className="text-[11px] font-medium text-teal hover:underline"
            >
              See all →
            </Link>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 rounded-[9px] border border-line-soft bg-cream px-2.5 py-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-teal-soft text-teal">
                <Mic className="h-[13px] w-[13px]" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium tracking-[-.01em] text-ink">
                  Maria &amp; David — energy debate
                </span>
                <span className="block font-mono text-[10px] text-ink-4">
                  today · 42m · 14 claims
                </span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-[3px]">
                <span className="rounded-full bg-green-soft px-[5px] py-[1px] font-mono text-[9.5px] font-semibold text-[#15803D]">
                  8 T
                </span>
                <span className="rounded-full bg-red-soft px-[5px] py-[1px] font-mono text-[9.5px] font-semibold text-[#B91C1C]">
                  3 F
                </span>
                <span className="rounded-full bg-amber-soft px-[5px] py-[1px] font-mono text-[9.5px] font-semibold text-[#92400E]">
                  3 ?
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2.5 rounded-[9px] border border-line-soft bg-cream px-2.5 py-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#FEE2E2] text-[#DC2626]">
                <YouTubeGlyph className="h-[13px] w-[13px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium tracking-[-.01em] text-ink">
                  Lex Fridman #418 — Sam Altman
                </span>
                <span className="block font-mono text-[10px] text-ink-4">
                  2 days ago · 2h 14m · 31 claims
                </span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-[3px]">
                <span className="rounded-full bg-green-soft px-[5px] py-[1px] font-mono text-[9.5px] font-semibold text-[#15803D]">
                  19 T
                </span>
                <span className="rounded-full bg-red-soft px-[5px] py-[1px] font-mono text-[9.5px] font-semibold text-[#B91C1C]">
                  5 F
                </span>
                <span className="rounded-full bg-amber-soft px-[5px] py-[1px] font-mono text-[9.5px] font-semibold text-[#92400E]">
                  7 ?
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Usage footer */}
        <div className="border-t border-line-soft bg-cream px-5 pb-7 pt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-ink-4">
              This month
            </span>
            <span className="font-mono text-[11px] tabular-nums text-ink-3">
              5.0 of 15 min · free tier
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-line-soft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal to-[#5b8cf7]"
              style={{ width: "33%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
