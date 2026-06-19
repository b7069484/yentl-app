import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, FileText, Save, ShieldCheck } from "lucide-react";

import { readAuthReturnTarget, type AuthSearchParams } from "@/lib/auth-return";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type AuthPageProps = {
  searchParams?: Promise<AuthSearchParams>;
};

function SignUpContextPanel({ returnHref }: { returnHref: string | null }) {
  return (
    <aside className="rounded-lg border border-line bg-paper p-6 shadow-sm">
      <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-xs font-semibold uppercase text-ink-3">
        <FileText className="h-4 w-4 text-teal" aria-hidden />
        Account value
      </p>
      <h1 className="mt-5 font-serif text-3xl font-medium text-ink">
        Create an account only when it adds durability.
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-3">
        Guest review stays available in v1. A configured account deployment
        should clearly explain what changes: saved sessions, sync, exports, and
        account-level privacy controls.
      </p>
      <div className="mt-5 grid gap-3">
        <div className="rounded-lg border border-line bg-cream p-4">
          <Save className="h-4 w-4 text-teal" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-ink">Save expectations first</p>
          <p className="mt-1 text-sm leading-6 text-ink-3">
            The app should say whether work is browser-local or account-linked
            before a user relies on it.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-cream p-4">
          <ShieldCheck className="h-4 w-4 text-teal" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-ink">Privacy before signup</p>
          <p className="mt-1 text-sm leading-6 text-ink-3">
            Method, privacy, terms, and subprocessors remain public routes.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={returnHref ?? "/demo"}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
        >
          {returnHref ? "Return as guest" : "Try guest demo"} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-cream px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
        >
          Privacy
        </Link>
      </div>
    </aside>
  );
}

function AuthReturnNotice({ returnHref, unsafeIgnored }: { returnHref: string | null; unsafeIgnored: boolean }) {
  if (returnHref) {
    return (
      <p className="mb-5 rounded-lg border border-line bg-cream px-4 py-3 text-sm leading-6 text-ink-3">
        Return to your Yentl flow after this account step. Your source, saved
        session, or share context will stay attached.
      </p>
    );
  }

  if (unsafeIgnored) {
    return (
      <p className="mb-5 rounded-lg border border-amber/40 bg-cream px-4 py-3 text-sm leading-6 text-ink-3">
        Unsafe return target ignored. Start from a fresh Yentl workspace
        instead.
      </p>
    );
  }

  return null;
}

export default async function SignUpPage({ searchParams }: AuthPageProps) {
  const returnTarget = readAuthReturnTarget(await searchParams);

  if (!clerkConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
        <section className="w-full max-w-md rounded-lg border border-line bg-paper p-7 text-center shadow-sm">
          <p className="mb-2 font-serif text-2xl font-medium text-ink">
            Account creation is not enabled in this build.
          </p>
          <p className="mb-6 text-sm leading-relaxed text-ink-3">
            Yentl v1 is guest-first. Saved sessions stay local to this browser
            unless you export them.
          </p>
          <AuthReturnNotice returnHref={returnTarget.href} unsafeIgnored={returnTarget.unsafeIgnored} />
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={returnTarget.href ?? "/session"}
              className="inline-flex min-h-11 items-center rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
            >
              {returnTarget.href ? "Return to flow" : "Start checking"}
            </Link>
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
            >
              Try demo
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
            >
              Privacy
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1fr] lg:items-center">
        <SignUpContextPanel returnHref={returnTarget.href} />
        <section className="flex justify-center rounded-lg border border-line bg-paper p-6 shadow-sm" aria-label="Sign up form">
          <SignUp />
        </section>
      </div>
    </main>
  );
}
