import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ - Yentl",
  description: "Frequently asked questions about Yentl's source handling, accounts, privacy, and limitations.",
};

const faqRows = [
  {
    q: "Is Yentl a final authority?",
    a: "No. Yentl is AI-assisted review software. Its verdicts can be wrong, incomplete, or overconfident, so the interface keeps source context, evidence quality, uncertainty, and challenge paths visible.",
  },
  {
    q: "What can I check?",
    a: "You can start from a Chrome tab, YouTube link, audio or video file, live microphone, pasted text, one claim, or a direct media URL. Platform-specific options vary: mobile web supports share/import, while current-tab capture depends on the Chrome extension.",
  },
  {
    q: "Do I need an account?",
    a: "Not for the v1 guest flow. Sessions save locally in the browser first. When Clerk and the Yentl database are configured, signing in also enables account-synced saved sessions.",
  },
  {
    q: "What happens to saved sessions?",
    a: "The library keeps browser-local snapshots for guests and can merge account-synced saves for signed-in users. Clearing site data can remove local saves; deleting a cloud save removes it from the account.",
  },
  {
    q: "Does Yentl store my uploaded media forever?",
    a: "No. Media may be processed by Yentl and its listed subprocessors to transcribe and analyze a source. Saved-session records store the review snapshot locally first and, for signed-in sync, in the account database.",
  },
  {
    q: "Why does Yentl show rhetoric markers?",
    a: "Markers are there to support critical reading. They identify patterns such as loaded language, false dilemmas, or confirmation bias and should point back to the quoted language that triggered them.",
  },
  {
    q: "What if a video has no captions or cannot be embedded?",
    a: "Yentl should explain the failure and route you to another path: browser capture, uploaded media, pasted transcript, direct media URL, or opening the original source outside the embedded player.",
  },
  {
    q: "How is pricing handled right now?",
    a: "The v1 public preview has no published paid plan. Responsible partner pilots are handled by contact until real commercial terms exist.",
  },
];

export default function FAQPage() {
  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <section className="mx-auto w-full max-w-4xl px-5 py-12">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-teal hover:text-teal-2"
        >
          Back to home
        </Link>

        <div className="mt-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase text-ink-3">
            <HelpCircle className="h-4 w-4 text-teal" aria-hidden />
            FAQ
          </p>
          <h1 className="mt-5 font-serif text-[44px] font-medium leading-[1.08] text-ink sm:text-[58px]">
            Questions a launch reviewer should not have to guess.
          </h1>
          <p className="mt-5 text-lg leading-8 text-ink-3">
            These answers keep source handling, account scope, privacy, pricing,
            and limitations visible before a user enters the app.
          </p>
        </div>

        <div className="mt-10 divide-y divide-line rounded-lg border border-line bg-paper">
          {faqRows.map((row, index) => (
            <details key={row.q} className="group p-5" open={index < 2}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
                <span>{row.q}</span>
                <span className="text-xl leading-none text-ink-4" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-3">{row.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/session"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
          >
            Start checking <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/methodology"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
          >
            Read methodology <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
          >
            Contact page <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-ink-3">
          Privacy questions can also go to{" "}
          <a href="mailto:privacy@yentl.it" className="font-semibold text-teal hover:text-teal-2">
            privacy@yentl.it
          </a>
          .
        </p>
      </section>
    </main>
  );
}
