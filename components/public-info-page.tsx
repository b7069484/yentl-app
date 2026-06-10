import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const trustLinks = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Methodology" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/subprocessors", label: "Subprocessors" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/contact", label: "Contact" },
];

type PublicInfoPageProps = {
  children: ReactNode;
  currentPath: string;
  description: string;
  eyebrow: string;
  lastUpdated?: string;
  title: string;
};

export function PublicInfoPage({
  children,
  currentPath,
  description,
  eyebrow,
  lastUpdated,
  title,
}: PublicInfoPageProps) {
  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-teal hover:text-teal-2"
          >
            Back to home
          </Link>
          <Link
            href="/session"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
          >
            Start checking <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <header className="mt-9 max-w-3xl">
          <p className="inline-flex items-center rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase text-ink-3">
            {eyebrow}
          </p>
          <h1 className="mt-5 font-serif text-[42px] font-medium leading-[1.08] text-ink sm:text-[56px]">
            {title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-ink-3">{description}</p>
          {lastUpdated && (
            <p className="mt-3 text-sm font-medium text-ink-4">
              Last updated: {lastUpdated}
            </p>
          )}
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <article className="min-w-0 space-y-10">{children}</article>
          <aside className="min-w-0 rounded-lg border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase text-ink-4">Trust pages</p>
            <nav aria-label="Trust pages" className="mt-3 grid gap-1">
              {trustLinks.map((link) => {
                const active = link.href === currentPath;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "inline-flex min-h-11 items-center rounded-lg bg-teal-soft px-3 text-sm font-semibold text-teal"
                        : "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink-2 hover:bg-cream-2"
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      </section>
    </main>
  );
}
