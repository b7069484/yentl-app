import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const row = await db.query.sessions.findFirst({
    where: eq(schema.sessions.id, id),
  });

  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Public projection — currently any session id is readable. Future Phase 1c
  // work will gate this on an explicit `is_public` flag from the verdict route
  // share action. For now the surface area is intentional: a verdict URL is
  // shared by knowing the id, no enumeration possible (ulid space).
  const data = row.data ?? {};
  return NextResponse.json({
    id: row.id,
    title: row.title,
    started_at: row.startedAt?.toISOString?.() ?? row.startedAt,
    ended_at: row.endedAt?.toISOString?.() ?? row.endedAt,
    ...(typeof data === "object" && data !== null ? data : {}),
  });
}
