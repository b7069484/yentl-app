"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  X as XIcon,
  Check,
  ExternalLink,
  Share2,
  Flag,
  Copy as CopyIcon,
  ArrowRight,
  ShoppingCart,
  Newspaper,
  Zap,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

// ─── Verdict state ──────────────────────────────────────────────────────────

type VerdictKind = "verified" | "nope" | "misleading" | "unverifiable";

const verdictMeta: Record<
  VerdictKind,
  {
    pillBg: string;
    pillIconBg: string;
    pillIconColor: string;
    pillLabel: string;
    accent: string; // left bar
    heroBg: string;
    heroBorder: string;
    confidenceColor: string;
    confidenceFill: string; // width%
    confidencePct: string;
    claimEmphasis: string; // color used inside claim text strong
    icon: React.ReactNode;
  }
> = {
  verified: {
    pillBg: "#15803D",
    pillIconBg: "#fff",
    pillIconColor: "#15803D",
    pillLabel: "Verified",
    accent: "#15803D",
    heroBg: "linear-gradient(180deg, #ECFDF3 0%, #FAF9F5 100%)",
    heroBorder: "rgba(34,197,94,.25)",
    confidenceColor: "#15803D",
    confidenceFill: "94%",
    confidencePct: "94%",
    claimEmphasis: "#15803D",
    icon: <Check className="h-2.5 w-2.5" strokeWidth={3} />,
  },
  nope: {
    pillBg: "#B91C1C",
    pillIconBg: "#fff",
    pillIconColor: "#B91C1C",
    pillLabel: "Nope",
    accent: "#B91C1C",
    heroBg: "linear-gradient(180deg, #FEF2F2 0%, #FAF9F5 100%)",
    heroBorder: "rgba(239,68,68,.28)",
    confidenceColor: "#B91C1C",
    confidenceFill: "91%",
    confidencePct: "91%",
    claimEmphasis: "#B91C1C",
    icon: <XIcon className="h-2.5 w-2.5" strokeWidth={3} />,
  },
  misleading: {
    pillBg: "#92400E",
    pillIconBg: "#fff",
    pillIconColor: "#92400E",
    pillLabel: "Misleading",
    accent: "#F59E0B",
    heroBg: "linear-gradient(180deg, #FEF3C7 0%, #FAF9F5 100%)",
    heroBorder: "rgba(245,158,11,.32)",
    confidenceColor: "#92400E",
    confidenceFill: "76%",
    confidencePct: "76%",
    claimEmphasis: "#92400E",
    icon: <AlertTriangle className="h-2.5 w-2.5" strokeWidth={3} />,
  },
  unverifiable: {
    pillBg: "#5B6075",
    pillIconBg: "#fff",
    pillIconColor: "#5B6075",
    pillLabel: "Unverifiable",
    accent: "#8B8FA0",
    heroBg: "linear-gradient(180deg, #F0EAD6 0%, #FAF9F5 100%)",
    heroBorder: "#E8E1CE",
    confidenceColor: "#5B6075",
    confidenceFill: "32%",
    confidencePct: "—",
    claimEmphasis: "#5B6075",
    icon: <HelpCircle className="h-2.5 w-2.5" strokeWidth={2.6} />,
  },
};

const claimText: Record<VerdictKind, { strong: string; tail: string }> = {
  verified: {
    strong: "about 4%",
    tail: " of the US grid in 2025.",
  },
  nope: {
    strong: "powering 30% of US homes",
    tail: " — solar is doing that already, today.",
  },
  misleading: {
    strong: "doubled in a year",
    tail: ", but the base was tiny — context matters.",
  },
  unverifiable: {
    strong: "insider sources confirm",
    tail: " the OpenAI internal benchmark numbers leaked last week.",
  },
};

// ─── Reusable ──────────────────────────────────────────────────────────────

function VerdictHero({ kind }: { kind: VerdictKind }) {
  const m = verdictMeta[kind];
  const ct = claimText[kind];
  return (
    <div
      className="relative mt-1.5 overflow-hidden rounded-[16px] border px-4 pb-3.5 pt-4"
      style={{ background: m.heroBg, borderColor: m.heroBorder }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: m.accent }}
      />
      <div className="mb-2.5 flex items-center justify-between gap-2.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-[5px] text-[12.5px] font-bold tracking-[-.01em] text-white"
          style={{ background: m.pillBg }}
        >
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: m.pillIconBg, color: m.pillIconColor }}
          >
            {m.icon}
          </span>
          {m.pillLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[.06em] text-ink-4">
            Conf
          </span>
          <span className="h-1 w-[54px] overflow-hidden rounded-full bg-line-soft">
            <span
              className="block h-full rounded-full"
              style={{
                background: m.confidenceColor,
                width: m.confidenceFill,
              }}
            />
          </span>
          <span
            className="font-mono text-[10.5px] font-bold tracking-[-.02em]"
            style={{ color: m.confidenceColor }}
          >
            {m.confidencePct}
          </span>
        </div>
      </div>
      <p
        className="font-serif text-[18px] font-medium leading-[1.35] tracking-[-.01em] text-ink"
        style={{ fontVariationSettings: "'opsz' 24, 'SOFT' 30" }}
      >
        <span className="text-ink-4">&ldquo;</span>
        AI training used{" "}
        <strong
          className="font-bold"
          style={{ color: m.claimEmphasis }}
        >
          {ct.strong}
        </strong>
        {ct.tail}
        <span className="text-ink-4">&rdquo;</span>
      </p>
      <div className="mt-2.5 flex items-center gap-2.5 font-mono text-[10px] tracking-[.04em] text-ink-4">
        <span className="text-ink-5 line-through">~5% (provisional, 0:09)</span>
        <span>→</span>
        <span>4% · confirmed 0:14</span>
      </div>
    </div>
  );
}

function ReceiptRow({
  thumbBg,
  outlet,
  thumbIcon,
  title,
  snippet,
  badges,
}: {
  thumbBg: string;
  outlet: string;
  thumbIcon: React.ReactNode;
  title: string;
  snippet: string;
  badges: { label: string; tone: "high-fact" | "center" | "left-lean" | "cite" }[];
}) {
  const badgeTone: Record<
    string,
    { bg: string; color: string }
  > = {
    "high-fact": { bg: "rgba(34,197,94,.16)", color: "#15803D" },
    center: { bg: "#F4F1E4", color: "#5B6075" },
    "left-lean": { bg: "#E0E7FF", color: "#4338CA" },
    cite: { bg: "#DBEAFE", color: "#1E40AF" },
  };
  return (
    <div className="flex items-start gap-2.5 rounded-[9px] border border-line bg-white px-2.5 py-2.5">
      <div
        className="relative h-[58px] w-[58px] flex-shrink-0 overflow-hidden rounded-[7px]"
        style={{ background: thumbBg }}
      >
        <span
          className="absolute left-1 top-1 z-[2] rounded-[4px] px-[5px] py-[2px] font-serif text-[9.5px] font-semibold tracking-[-.02em] text-white"
          style={{
            background: "rgba(0,0,0,.65)",
            backdropFilter: "blur(4px)",
          }}
        >
          {outlet}
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-white/65">
          {thumbIcon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold leading-[1.3] tracking-[-.01em] text-ink">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-[1.4] text-ink-3">{snippet}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {badges.map((b) => (
            <span
              key={b.label}
              className="rounded-full px-1.5 py-[1.5px] font-mono text-[9px] font-semibold uppercase tracking-[.05em]"
              style={{
                background: badgeTone[b.tone].bg,
                color: badgeTone[b.tone].color,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>
      <span className="self-center text-ink-4">
        <ExternalLink className="h-3 w-3" strokeWidth={2.2} />
      </span>
    </div>
  );
}

// ─── Sheet ──────────────────────────────────────────────────────────────────

function ClaimSheetContent() {
  const searchParams = useSearchParams();
  const kindRaw = searchParams.get("verdict") || "verified";
  const kind: VerdictKind = (["verified", "nope", "misleading", "unverifiable"].includes(
    kindRaw
  )
    ? kindRaw
    : "verified") as VerdictKind;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1A1D26]">
      {/* Dimmed backdrop showing faux session content */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cream" />
        <div className="absolute inset-0 px-5 py-16 opacity-30 blur-[1px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="block h-[18px] w-14 rounded-full bg-line" />
            <span className="block h-[11px] w-8 rounded-[3px] bg-line-soft" />
          </div>
          <span className="mb-1.5 block h-[11px] w-[80%] rounded-[3px] bg-line" />
          <span className="mb-1.5 block h-[11px] w-[100%] rounded-[3px] bg-line" />
          <span className="mb-7 block h-[11px] w-[60%] rounded-[3px] bg-line" />
          <div className="mb-2 flex items-center gap-2">
            <span className="block h-[18px] w-14 rounded-full bg-amber-soft" />
            <span className="block h-[11px] w-8 rounded-[3px] bg-line-soft" />
          </div>
          <span className="mb-1.5 block h-[11px] w-[100%] rounded-[3px] bg-line" />
          <span className="block h-[11px] w-[80%] rounded-[3px] bg-line" />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(20,23,31,.42)",
            backdropFilter: "blur(2px)",
          }}
        />
      </div>

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[50] flex flex-col rounded-t-[24px] bg-cream"
        style={{
          maxHeight: "88vh",
          boxShadow: "0 -24px 60px rgba(0,0,0,.42)",
          animation: "v3-sheet-up 0.4s cubic-bezier(.18,.89,.32,1.18)",
        }}
      >
        {/* Drag handle */}
        <div className="flex flex-shrink-0 justify-center pb-1 pt-2.5">
          <span className="block h-1 w-[38px] rounded-full bg-ink-5" />
        </div>

        {/* Head */}
        <div className="flex flex-shrink-0 items-center justify-between gap-2.5 px-5 pb-1 pt-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full pl-[5px] pr-2.5 py-1 text-[11.5px] font-semibold"
            style={{ background: "#CCFBF1", color: "#0EA5A4" }}
          >
            <span
              className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "#0EA5A4" }}
            >
              M
            </span>
            Maria
            <span className="ml-0.5 font-mono text-[10px] font-medium tracking-[.02em] text-ink-4">
              · 0:08
            </span>
          </span>
          <Link
            href="/session"
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-cream-2 text-ink-3 transition-colors hover:bg-white"
          >
            <XIcon className="h-3 w-3" strokeWidth={2.4} />
          </Link>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2 [&::-webkit-scrollbar]:w-0">
          <VerdictHero kind={kind} />

          {/* Receipts section */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[.09em] text-ink-4">
                <ShoppingCart className="h-[11px] w-[11px]" strokeWidth={2.4} />
                Receipts
                <span className="rounded-full border border-line bg-cream-2 px-1.5 py-[1px] font-mono text-[9.5px] font-semibold text-ink-4">
                  3
                </span>
              </span>
              <span className="text-[11px] font-medium text-teal">See all 3 →</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <ReceiptRow
                thumbBg="linear-gradient(135deg, #1e3a5f 0%, #0F4C81 50%, #4A7BA6 100%)"
                outlet="IEA"
                thumbIcon={<Zap className="h-6 w-6 fill-white/85" />}
                title="Electricity 2025 — Analysis and forecast to 2027"
                snippet={`"Data centres consumed 4.4% of US electricity demand in 2025, of which roughly 1.0 ppt was directly attributable to AI training workloads."`}
                badges={[
                  { label: "High factuality", tone: "high-fact" },
                  { label: "Center", tone: "center" },
                  { label: "Primary source", tone: "cite" },
                ]}
              />
              <ReceiptRow
                thumbBg="linear-gradient(160deg, #1a1a1a 0%, #3a3a3a 60%, #1c1c1c 100%)"
                outlet="NYT"
                thumbIcon={<Newspaper className="h-6 w-6" strokeWidth={1.6} />}
                title="The numbers behind AI's power problem"
                snippet={`"By the third quarter of 2025, AI-specific training accounted for an estimated 3.8% of all grid load, per IEA figures."`}
                badges={[
                  { label: "High factuality", tone: "high-fact" },
                  { label: "Center-left", tone: "left-lean" },
                  { label: "Reporting on primary", tone: "cite" },
                ]}
              />
            </div>
          </div>

          {/* Devil's advocate */}
          <div
            className="relative mt-3.5 overflow-hidden rounded-[14px] px-4 py-3.5"
            style={{ background: "#1A1D26", color: "#E8E1CE" }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-full"
              style={{ background: "#F59E0B" }}
            />
            <div className="mb-2.5 flex items-center justify-between pl-2.5">
              <span
                className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[.1em]"
                style={{ color: "#F59E0B" }}
              >
                <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                Devil&rsquo;s advocate
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[9.5px] tracking-[.04em] text-white/55">
                {[1, 1, 1, 0.3, 0.3].map((o, i) => (
                  <span
                    key={i}
                    className="inline-block h-[5px] w-[5px] rounded-full"
                    style={{ background: `rgba(245,158,11,${o})` }}
                  />
                ))}
              </span>
            </div>
            <p
              className="pl-2.5 font-serif text-[13.5px] font-normal leading-[1.5] tracking-[-.005em]"
              style={{
                color: "rgba(232,225,206,.9)",
                fontVariationSettings: "'opsz' 14, 'SOFT' 50",
              }}
            >
              <strong className="font-semibold text-white">
                4% is a US-only, 2025-only snapshot.
              </strong>{" "}
              Global training is closing on 8% of grid load in dense regions,
              and that&rsquo;s <em className="italic">before</em> the next-gen
              GPU rollouts. The &ldquo;only 4%&rdquo; framing makes the buildout
              sound containable when it&rsquo;s already doubling year-over-year.
            </p>
            <a
              className="mt-2 inline-flex cursor-pointer items-center gap-1 pl-2.5 text-[11px] font-medium"
              style={{ color: "#F59E0B" }}
            >
              Read the full counter-case in the session report
              <ArrowRight className="h-2.5 w-2.5" strokeWidth={2.5} />
            </a>
          </div>

          {/* Related markers */}
          <div
            className="mt-3.5 flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3"
            style={{
              background: "#EDE9FE",
              borderColor: "#C4B5FD",
            }}
          >
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] text-white"
              style={{ background: "#5B21B6" }}
            >
              <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.08em]" style={{ color: "#5B21B6" }}>
                Watch out for
                <span
                  className="font-sans italic font-medium not-uppercase"
                  style={{
                    color: "#5B21B6",
                    fontSize: "10.5px",
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  &ldquo;Appeal to incredulity&rdquo;
                </span>
              </div>
              <p className="text-[12px] leading-[1.45] text-ink-2">
                This claim was followed at <strong>0:31</strong> by Maria
                framing 4% as already huge —{" "}
                <em
                  className="font-serif italic font-medium"
                  style={{
                    color: "#5B21B6",
                    fontVariationSettings: "'opsz' 14, 'SOFT' 50",
                  }}
                >
                  without quantifying what &ldquo;huge&rdquo; means
                </em>{" "}
                in grid context.
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="grid grid-cols-4 gap-1.5 border-t border-line-soft bg-cream px-4 pb-7 pt-3">
          {[
            { Icon: Share2, label: "Share", red: false },
            { Icon: Flag, label: "Flag wrong", red: true },
            { Icon: CopyIcon, label: "Copy", red: false },
            { Icon: ArrowRight, label: "Jump to", red: false },
          ].map(({ Icon, label, red }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-0.5 rounded-[9px] bg-transparent px-1 py-2 text-ink-2 hover:bg-cream-2"
            >
              <Icon
                className={`h-[17px] w-[17px] ${red ? "text-red" : ""}`}
                strokeWidth={1.9}
              />
              <span className="text-[10px] font-medium text-ink-3">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClaimSheetPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#1A1D26]" />}
    >
      <ClaimSheetContent />
    </Suspense>
  );
}
