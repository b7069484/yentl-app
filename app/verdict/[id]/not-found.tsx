import Link from "next/link";

export default function VerdictNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Verdict not found
      </h1>
      <p className="text-muted-foreground">
        This verdict may have been deleted, or the link is incorrect. Start a
        new session to fact-check something live.
      </p>
      <Link
        href="/session"
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
      >
        Start a Yentl session
      </Link>
    </main>
  );
}
