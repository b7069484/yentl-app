import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileUp,
  LinkIcon,
  Mic,
  MonitorPlay,
  PanelsTopLeft,
  Save,
  Share2,
  Smartphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Yentl mobile app",
  description:
    "Mobile entry points for Yentl on iOS, Android, and mobile web.",
};

type Icon = ComponentType<{ className?: string }>;

const primaryActions: Array<{
  title: string;
  body: string;
  href: string;
  Icon: Icon;
}> = [
  {
    title: "Share a link or text",
    body: "Open the same source-aware workspace that iOS Share Sheet and Android share intents target.",
    href: "/session?title=Shared%20article&url=https%3A%2F%2Fexample.com%2Fstory",
    Icon: Share2,
  },
  {
    title: "Pick a source",
    body: "Use microphone, URL, upload, text, document, direct media, or one-claim mode.",
    href: "/session",
    Icon: PanelsTopLeft,
  },
  {
    title: "Open saved work",
    body: "Resume, export, rename, delete, or send a saved review into room mode.",
    href: "/sessions",
    Icon: Save,
  },
  {
    title: "Room display",
    body: "Open the read-only TV-sized view for live or saved sessions.",
    href: "/tv",
    Icon: MonitorPlay,
  },
];

const platformRows: Array<{
  title: string;
  body: string;
  Icon: Icon;
}> = [
  {
    title: "iOS",
    body: "Share Sheet can pass title, text, and URL into Yentl. Open-tab audio capture is not exposed by mobile Safari.",
    Icon: Smartphone,
  },
  {
    title: "Android",
    body: "Android share intents can hand off links and text; the installed app can also open supported files into the same session route.",
    Icon: Share2,
  },
  {
    title: "Mobile web",
    body: "Yentl keeps shared links, pasted text, uploaded media, microphone input, saved sessions, and exports in the browser app.",
    Icon: LinkIcon,
  },
];

const capabilityRows: Array<{
  title: string;
  body: string;
  Icon: Icon;
}> = [
  {
    title: "Microphone",
    body: "Live room audio starts from the mobile source picker with consent controls.",
    Icon: Mic,
  },
  {
    title: "Files",
    body: "Audio, video, captions, transcripts, PDFs, and text documents enter through upload/import flows or installed-app file opens.",
    Icon: FileUp,
  },
  {
    title: "Saves",
    body: "Guest saves stay in the browser. Signed-in cloud saves can be restored from another phone, tablet, or desktop.",
    Icon: Save,
  },
];

export default function MobilePage() {
  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-cream/95 backdrop-blur">
        <nav className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-5">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg text-ink" aria-label="Yentl home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/yentl-mark.svg" alt="" className="h-8 w-8" />
            <span className="font-serif text-2xl font-medium leading-none">
              yentl<span aria-hidden className="text-amber">.</span>
            </span>
          </Link>
          <Link
            href="/session"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-2"
          >
            Start <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 lg:grid-cols-[0.86fr_1.14fr] lg:py-14">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase text-ink-3">
            <Smartphone className="h-4 w-4 text-teal" aria-hidden />
            Mobile app
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-[42px] font-medium leading-[1.05] text-ink sm:text-[56px]">
            Yentl on iOS, Android, and mobile web.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-3">
            The mobile app path is installable web-first in v1: share into
            Yentl, import files, use the microphone, review saved sessions, and
            hand the result to room mode.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/session"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal px-5 text-sm font-semibold text-white hover:bg-teal-2"
            >
              Pick source <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/sessions"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-paper px-5 text-sm font-semibold text-ink-2 hover:bg-cream-2"
            >
              Saved work <Save className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {primaryActions.map(({ title, body, href, Icon: ActionIcon }) => (
            <Link
              key={title}
              href={href}
              className="rounded-lg border border-line bg-paper p-5 transition-colors hover:bg-cream-2"
            >
              <ActionIcon className="h-5 w-5 text-teal" aria-hidden />
              <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-3">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-12 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs font-semibold uppercase text-teal">Platform truth</p>
            <h2 className="mt-3 font-serif text-4xl font-medium text-ink">
              Mobile paths stay honest about OS limits.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {platformRows.map(({ title, body, Icon: PlatformIcon }) => (
              <article key={title} className="rounded-lg border border-line bg-cream p-4">
                <PlatformIcon className="h-5 w-5 text-teal" aria-hidden />
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-3">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-12">
        <div className="grid gap-3 md:grid-cols-3">
          {capabilityRows.map(({ title, body, Icon: CapabilityIcon }) => (
            <article key={title} className="rounded-lg border border-line bg-paper p-5">
              <CapabilityIcon className="h-5 w-5 text-teal" aria-hidden />
              <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-3">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
