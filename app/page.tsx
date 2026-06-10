import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileAudio,
  FileText,
  HelpCircle,
  LinkIcon,
  LockKeyhole,
  Mic,
  MonitorPlay,
  Play,
  SearchCheck,
  Smartphone,
  Upload,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Yentl - Live fact-check and rhetoric analysis",
  description:
    "Yentl keeps source, transcript, claims, evidence, and rhetoric markers together so you can review what is being said in context.",
};

type Icon = ComponentType<{ className?: string }>;

const sourcePaths: Array<{
  title: string;
  body: string;
  Icon: Icon;
}> = [
  {
    title: "Current Chrome tab",
    body: "Review an open article, video, livestream, class, or debate beside the source.",
    Icon: MonitorPlay,
  },
  {
    title: "YouTube link",
    body: "Paste a public video URL and keep the transcript, claims, and source cards together.",
    Icon: Play,
  },
  {
    title: "Audio or video file",
    body: "Import a recording or saved media file when the source lives on your device.",
    Icon: Upload,
  },
  {
    title: "Text, transcript, or claim",
    body: "Paste article text, captions, notes, a transcript, or one specific claim.",
    Icon: FileText,
  },
  {
    title: "Live microphone",
    body: "Use room audio for a talk, meeting, class discussion, or phone on speaker.",
    Icon: Mic,
  },
  {
    title: "Direct media URL",
    body: "Use a hosted MP3, MP4, stream, podcast file, or other direct media URL.",
    Icon: LinkIcon,
  },
];

const proofRows = [
  "Transcript stays source-anchored instead of becoming free-floating notes.",
  "Claims keep their quote, status, source cards, and open questions together.",
  "Bias, fallacy, and rhetoric markers point back to the language that triggered them.",
];

const exampleRows: Array<{
  title: string;
  body: string;
  Icon: Icon;
}> = [
  {
    title: "Video",
    body: "Debate clips, classes, livestreams, explainers",
    Icon: FileAudio,
  },
  {
    title: "Article",
    body: "Arguments, essays, news pages, shared text",
    Icon: FileText,
  },
  {
    title: "Conversation",
    body: "Room audio, talks, phone-on-speaker review",
    Icon: Mic,
  },
  {
    title: "Room display",
    body: "Put a live or saved session on a TV-sized read-only screen.",
    Icon: MonitorPlay,
  },
  {
    title: "Mobile app",
    body: "Share links or text into Yentl from iOS, Android, or mobile web.",
    Icon: Smartphone,
  },
];

const featureRows = [
  "Yentl's Read summarizes the overall posture without hiding uncertainty.",
  "Devil's Advocate pressure-tests weak conclusions before a user over-trusts them.",
  "Local saves and exports make the record portable without requiring an account in v1.",
];

const featureIcons = [BadgeCheck, HelpCircle, LockKeyhole] satisfies Icon[];

const faqRows = [
  {
    q: "Is Yentl a final authority?",
    a: "No. Yentl produces AI-assisted analysis for review. Treat every verdict as a starting point for inquiry, especially on fast-moving or high-stakes topics.",
  },
  {
    q: "Do I need an account?",
    a: "Not for the v1 guest flow. You can start a session and save snapshots locally in this browser. Account sync is only available when a deployment explicitly enables it.",
  },
  {
    q: "Where does my media go?",
    a: "Media may be processed by the app and its listed subprocessors to transcribe and analyze the source. Local saved snapshots stay in this browser unless you export or share them.",
  },
];

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-cream/95 backdrop-blur">
        <nav className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg text-ink" aria-label="Yentl home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/yentl-mark.svg" alt="" className="h-8 w-8" />
            <span className="font-serif text-2xl font-medium leading-none">
              yentl<span aria-hidden className="text-amber">.</span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 text-sm font-medium text-ink-3 md:flex">
            <a href="#examples" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">Examples</a>
            <a href="#ways-in" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">Ways in</a>
            <a href="#method" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">Method</a>
            <a href="#trust" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">Trust</a>
            <a href="#faq" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">FAQ</a>
          </div>
          <Link
            href="/session"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-2"
          >
            Start <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>
      </header>

      <section id="hero" className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-[1fr_0.78fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase text-ink-3">
            <SearchCheck className="h-4 w-4 text-teal" aria-hidden />
            Source-first fact checking
          </p>
          <h1 className="max-w-3xl font-serif text-[44px] font-medium leading-[1.04] text-ink sm:text-[58px] lg:text-[70px]">
            Yentl checks what is being said.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-3">
            Bring Yentl a video, live tab, microphone, uploaded media, media URL,
            pasted transcript, or one claim. It keeps the original source,
            transcript, claims, evidence, and rhetoric markers in one reviewable
            workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/session"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-2"
            >
              Start checking <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/demo"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-paper px-5 text-sm font-semibold text-ink-2 transition-colors hover:bg-cream-2"
            >
              Try guest demo <Play className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/methodology"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-paper px-5 text-sm font-semibold text-ink-2 transition-colors hover:bg-cream-2"
            >
              Read method <FileText className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/tv"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-paper px-5 text-sm font-semibold text-ink-2 transition-colors hover:bg-cream-2"
            >
              Room mode <MonitorPlay className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/mobile"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-paper px-5 text-sm font-semibold text-ink-2 transition-colors hover:bg-cream-2"
            >
              Mobile app <Smartphone className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-4">
            Guest-first in v1. Local-first saves with account sync when configured. AI analysis stays reviewable.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-paper p-4 shadow-sm">
          <div className="rounded-lg border border-line-soft bg-cream p-4">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold uppercase text-ink-4">Yentl&apos;s Read</p>
                <h2 className="mt-1 font-serif text-2xl font-medium text-ink">
                  Mixed claims, strong rhetoric, source health still checking.
                </h2>
              </div>
              <span className="rounded-lg bg-amber-soft px-2 py-1 text-xs font-semibold text-amber-2">
                Live
              </span>
            </div>
            <div className="grid gap-3 py-4 sm:grid-cols-3">
              {[
                ["Claims", "12", "4 need review"],
                ["Sources", "18", "3 no image"],
                ["Markers", "9", "Loaded language leads"],
              ].map(([label, value, note]) => (
                <div key={label} className="rounded-lg border border-line bg-paper p-3">
                  <p className="text-xs font-semibold uppercase text-ink-4">{label}</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-ink">{value}</p>
                  <p className="mt-1 text-xs text-ink-3">{note}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {proofRows.map((row, index) => (
                <div key={row} className="flex gap-3 rounded-lg border border-line bg-paper p-3">
                  <span className="mt-0.5 font-mono text-xs text-ink-4">0{index + 1}</span>
                  <p className="text-sm leading-6 text-ink-3">{row}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="examples" className="border-y border-line bg-paper">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase text-teal">Examples</p>
            <h2 className="mt-3 font-serif text-4xl font-medium text-ink">
              The product story is visible before the app asks for work.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-3">
              A user can see the kinds of sources Yentl handles, the kind of
              reasoning it exposes, and the limits it admits before creating an
              account or starting a session.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {exampleRows.map(({ title, body, Icon: ExampleIcon }) => {
              return (
                <article key={title} className="rounded-lg border border-line bg-cream p-4">
                  <ExampleIcon className="h-5 w-5 text-teal" aria-hidden />
                  <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-3">{body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="ways-in" className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-teal">Five ways in, plus direct media</p>
            <h2 className="mt-3 font-serif text-4xl font-medium text-ink">
              Start from the source you actually have.
            </h2>
          </div>
          <Link href="/session" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2">
            Open source picker <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sourcePaths.map(({ title, body, Icon: PathIcon }) => (
            <article key={title} className="rounded-lg border border-line bg-paper p-5">
              <PathIcon className="h-5 w-5 text-teal" aria-hidden />
              <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-3">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="method" className="border-y border-line bg-paper">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-teal">How it works</p>
            <h2 className="mt-3 font-serif text-4xl font-medium text-ink">
              Yentl separates transcription, claim extraction, evidence checks, and marker learning.
            </h2>
          </div>
          <ol className="space-y-3">
            {[
              "Capture or import the source with consent and context.",
              "Build a transcript with timestamps or document anchors when available.",
              "Extract checkable claims and keep non-checkable material visible as context.",
              "Search, cite, and label evidence quality without hiding uncertainty.",
              "Surface bias, fallacy, and rhetoric markers with quote-level context.",
            ].map((step, index) => (
              <li key={step} className="flex gap-4 rounded-lg border border-line bg-cream p-4">
                <span className="font-mono text-sm text-ink-4">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-sm leading-6 text-ink-3">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-5 py-16">
        <p className="text-xs font-semibold uppercase text-teal">Features</p>
        <h2 className="mt-3 max-w-3xl font-serif text-4xl font-medium text-ink">
          Built for review, not blind confidence.
        </h2>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {featureRows.map((row, index) => (
            <article key={row} className="rounded-lg border border-line bg-paper p-5">
              {(() => {
                const FeatureIcon = featureIcons[index] ?? BadgeCheck;
                return <FeatureIcon className="h-5 w-5 text-teal" aria-hidden />;
              })()}
              <p className="mt-4 text-sm leading-6 text-ink-3">{row}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="trust" className="border-y border-line bg-paper">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase text-teal">Trust, limits, pricing</p>
            <h2 className="mt-3 font-serif text-4xl font-medium text-ink">
              The trust layer is part of the product surface.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-3">
              Yentl publishes method, privacy, terms, subprocessors,
              accessibility, pricing posture, and contact routes so reviewers
              can inspect the product before using it.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["/methodology", "Methodology", "Decision tree, scope rules, prompt versioning"],
              ["/privacy", "Privacy", "Data handling, processors, saved sessions"],
              ["/pricing", "Pricing", "Current public preview and partner options"],
              ["/accessibility", "Accessibility", "WCAG posture and accessibility contact"],
              ["/faq", "FAQ", "Expanded answers for launch questions"],
              ["/contact", "Contact", "Support, privacy, and accessibility mailboxes"],
            ].map(([href, title, body]) => (
              <Link key={href} href={href} className="rounded-lg border border-line bg-cream p-4 transition-colors hover:bg-cream-2">
                <span className="text-sm font-semibold text-ink">{title}</span>
                <span className="mt-2 block text-sm leading-6 text-ink-3">{body}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="rounded-lg border border-line bg-paper p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-teal">Pricing</p>
              <h2 className="mt-3 font-serif text-4xl font-medium text-ink">
                Public preview: guest-first, no published paid plan yet.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-3">
                Yentl v1 is positioned as a free public preview while the product
                is validated. Responsible partners can contact the team about
                pilots or deployment support.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal px-5 text-sm font-semibold text-white hover:bg-teal-2"
            >
              Pricing details <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-line bg-paper">
        <div className="mx-auto w-full max-w-4xl px-5 py-16">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase text-teal">FAQ</p>
              <h2 className="mt-3 font-serif text-4xl font-medium text-ink">
                Launch questions answered in the page, not hidden after sign-in.
              </h2>
            </div>
            <Link href="/faq" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-cream px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2">
              Full FAQ <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 divide-y divide-line rounded-lg border border-line bg-cream">
            {faqRows.map((row, index) => (
              <details key={row.q} className="group p-5" open={index === 0}>
                <summary className="cursor-pointer list-none text-base font-semibold text-ink">
                  {row.q}
                </summary>
                <p className="mt-3 text-sm leading-6 text-ink-3">{row.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-cream">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Yentl is AI-assisted. Review sources before relying on a verdict.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/terms" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">Terms</Link>
            <Link href="/privacy" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">Privacy</Link>
            <Link href="/subprocessors" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">Subprocessors</Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center rounded-lg px-2 hover:text-ink">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
