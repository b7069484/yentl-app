import { ulid } from "ulid";
import { db, schema } from "@/lib/db/client";
import type { Session } from "@/lib/types";

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

  return { id: rows[0]?.id ?? id };
}
