import { ulid } from "ulid";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Session } from "@/lib/types";

function sessionDurationSeconds(session: Session): number {
  if (!session.started_at || !session.ended_at) return 0;
  const startedMs = new Date(session.started_at).getTime();
  const endedMs = new Date(session.ended_at).getTime();
  if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs)) return 0;
  return Math.max(0, Math.floor((endedMs - startedMs) / 1000));
}

export async function saveSession(input: {
  clerkUserId: string;
  session: Session;
}): Promise<{ id: string }> {
  const id = `sess_${ulid()}`;
  const rows = await db
    .insert(schema.sessions)
    .values({
      id,
      clerkUserId: input.clerkUserId,
      title: input.session.title ?? null,
      startedAt: new Date(input.session.started_at),
      endedAt: input.session.ended_at ? new Date(input.session.ended_at) : null,
      sourceKind: input.session.source.kind,
      sourceMeta: input.session.source,
      data: input.session,
    })
    .returning({ id: schema.sessions.id });

  // Phase 1c Task 4 — increment the user's audioSecondsUsed counter so the
  // paywall gate sees real usage. Upsert: insert a free-tier row with the
  // duration when no subscription exists yet; otherwise add to the existing
  // count. Stripe webhook (Phase 1d) will own the tier field and the
  // periodResetAt rollover.
  const durationSeconds = sessionDurationSeconds(input.session);
  if (durationSeconds > 0) {
    await db
      .insert(schema.subscriptions)
      .values({
        clerkUserId: input.clerkUserId,
        tier: "free",
        audioSecondsUsed: durationSeconds,
      })
      .onConflictDoUpdate({
        target: schema.subscriptions.clerkUserId,
        set: {
          audioSecondsUsed: sql`${schema.subscriptions.audioSecondsUsed} + ${durationSeconds}`,
          updatedAt: new Date(),
        },
      });
  }

  return { id: rows[0]?.id ?? id };
}
