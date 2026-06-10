import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, MonitorPlay, Save, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Guest Demo - Yentl",
  description: "Try Yentl as a guest and understand what saves locally before creating an account.",
};

const demoText = encodeURIComponent(
  "Demo claim: The city reduced traffic deaths by 40 percent after installing protected bike lanes.\n\nContext: Use this as a short guest-mode text sample to see how Yentl moves from source text to checkable claims, evidence, and rhetoric review.",
);

const demoTitle = encodeURIComponent("Guest demo text sample");

const guestRows = [
  {
    title: "Start without an account",
    body: "Use the source picker, paste a sample, bring your own source, or import media before any account wall.",
    Icon: MonitorPlay,
  },
  {
    title: "Know what persists",
    body: "Guest saves stay in this browser. Signed-in deployments can also sync saved sessions to your account.",
    Icon: Save,
  },
  {
    title: "Keep limits visible",
    body: "AI analysis can be wrong. Yentl keeps method, privacy, and source context available while you review.",
    Icon: ShieldCheck,
  },
];

export default function DemoPage() {
  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <section className="mx-auto w-full max-w-5xl px-5 py-12">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-teal hover:text-teal-2"
        >
          Back to home
        </Link>

        <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase text-ink-3">
              <FileText className="h-4 w-4 text-teal" aria-hidden />
              Guest mode
            </p>
            <h1 className="mt-5 font-serif text-[44px] font-medium leading-[1.08] text-ink sm:text-[58px]">
              Try Yentl before deciding whether an account matters.
            </h1>
            <p className="mt-5 text-lg leading-8 text-ink-3">
              The v1 launch path is guest-first. Start with a prepared text
              sample or open the source picker and bring your own material.
              Save expectations are clear before you rely on them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/session?title=${demoTitle}&text=${demoText}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
              >
                Open sample text <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/session"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
              >
                Choose another source <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          <section aria-labelledby="guest-expectations" className="rounded-lg border border-line bg-paper p-5">
            <h2 id="guest-expectations" className="font-serif text-3xl font-medium text-ink">
              Guest expectations
            </h2>
            <div className="mt-5 space-y-3">
              {guestRows.map(({ title, body, Icon }) => (
                <article key={title} className="rounded-lg border border-line bg-cream p-4">
                  <Icon className="h-5 w-5 text-teal" aria-hidden />
                  <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-3">{body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
