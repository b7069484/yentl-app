import { AIGeneratedBadge } from "@/components/ui/ai-generated-badge";

export const metadata = {
  title: "Corrections — Yentl",
  description: "Verdicts Yentl has revised after community-flagged disputes.",
};

export default function CorrectionsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2 border-b border-border/60 pb-4">
        {/* Phase 1e — AI Act Art 50 disclosure on every AI-content surface. */}
        <div className="flex items-center gap-2">
          <AIGeneratedBadge />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Corrections to AI-generated verdicts
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Corrections
        </h1>
        <p className="text-sm text-muted-foreground">
          When a dispute lands and we determine the verdict was wrong, we
          publish the correction here and flag the original verdict card.
        </p>
      </header>

      <section
        aria-label="No corrections yet"
        className="rounded-xl border border-dashed border-border/60 p-8 text-center text-muted-foreground"
      >
        <p className="text-base">No corrections yet.</p>
        <p className="mt-2 text-sm">
          When the first correction lands, you&apos;ll see it here with the
          claim, the original verdict, the corrected verdict, and the source
          that drove the change.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Found something we got wrong? Open a verdict you disagree with and
        click <span className="font-medium text-foreground">Flag this verdict</span>.
      </p>
    </main>
  );
}
