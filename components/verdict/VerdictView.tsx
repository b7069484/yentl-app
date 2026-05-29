import { ClaimCard } from "@/components/session/ClaimCard";
import { AIGeneratedBadge } from "@/components/ui/ai-generated-badge";
import { AIDisclosureFooter } from "@/components/session/AIDisclosureFooter";
import type { Session } from "@/lib/types";

export function VerdictView({
  sessionId,
  session,
}: {
  sessionId: string;
  session: Session;
}) {
  const claims = session.claims ?? [];
  const synthesisText = session.synthesis?.text;

  return (
    <article className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <AIGeneratedBadge />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Yentl verdict
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {session.title || "Untitled session"}
        </h1>
        {session.ended_at && (
          <p className="text-sm text-muted-foreground">
            Ended {new Date(session.ended_at).toLocaleString()}
          </p>
        )}
      </header>

      {synthesisText && (
        <section
          aria-label="Session summary"
          className="rounded-xl border border-border/60 bg-card p-5 text-card-foreground"
        >
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Summary
          </h2>
          <p className="text-base leading-relaxed">{synthesisText}</p>
        </section>
      )}

      <section aria-label="Claims" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Claims fact-checked ({claims.length})
        </h2>

        {claims.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No claims were fact-checked in this session.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {claims.map((claim) => (
              <li key={claim.id} data-claim-id={claim.id}>
                <ClaimCard card={claim} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex flex-col gap-2 border-t border-border/60 pt-4 text-sm">
        <a
          href={`/verdict/${sessionId}/dispute`}
          className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:underline"
        >
          Flag this verdict for review
        </a>
        <p className="text-xs text-muted-foreground" data-testid="verdict-session-id">
          Session id: {sessionId}
        </p>
      </div>

      <AIDisclosureFooter />
    </article>
  );
}
