import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Save, ShieldCheck } from "lucide-react";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function AuthContextPanel() {
  return (
    <aside className="rounded-lg border border-line bg-paper p-6 shadow-sm">
      <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-xs font-semibold uppercase text-ink-3">
        <LockKeyhole className="h-4 w-4 text-teal" aria-hidden />
        Account context
      </p>
      <h1 className="mt-5 font-serif text-3xl font-medium text-ink">
        Sign in only when the saved-work story needs it.
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-3">
        Yentl v1 is guest-first. Account sign-in is for deployments that
        explicitly enable saved sessions, cross-device sync, or account-scoped
        exports.
      </p>
      <div className="mt-5 grid gap-3">
        <div className="rounded-lg border border-line bg-cream p-4">
          <Save className="h-4 w-4 text-teal" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-ink">Local saves remain available</p>
          <p className="mt-1 text-sm leading-6 text-ink-3">
            Guest snapshots stay in this browser unless you export them.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-cream p-4">
          <ShieldCheck className="h-4 w-4 text-teal" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-ink">Privacy stays visible</p>
          <p className="mt-1 text-sm leading-6 text-ink-3">
            Review data handling before linking work to an account.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/demo"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
        >
          Continue as guest <ArrowRight className="h-4 w-4" aria-hidden />
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

export default function SignInPage() {
  if (!clerkConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
        <section className="w-full max-w-md rounded-lg border border-line bg-paper p-7 text-center shadow-sm">
          <p className="mb-2 font-serif text-2xl font-medium text-ink">
            Accounts are not enabled in this build.
          </p>
          <p className="mb-6 text-sm leading-relaxed text-ink-3">
            Yentl v1 is guest-first. You can check a source and save sessions
            locally in this browser without signing in.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/session"
              className="inline-flex min-h-11 items-center rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
            >
              Start checking
            </Link>
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
            >
              Try demo
            </Link>
            <Link
              href="/sessions"
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
            >
              Local saves
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1fr] lg:items-center">
        <AuthContextPanel />
        <section className="flex justify-center rounded-lg border border-line bg-paper p-6 shadow-sm" aria-label="Sign in form">
          <SignIn />
        </section>
      </div>
    </main>
  );
}
