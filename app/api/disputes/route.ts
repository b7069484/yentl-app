import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ulid } from "ulid";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_JSON_BYTES = 32 * 1024;

const DisputePayload = z
  .object({
    sessionId: z.string().min(1).max(200),
    claimId: z.string().min(1).max(200).optional(),
    disputerEmail: z.string().email().max(320),
    evidenceUrl: z.string().url().max(2000).optional().or(z.literal("")),
    correctionRequested: z.string().min(10).max(4000),
  })
  .strict();

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return NextResponse.json({ error: "request body too large" }, { status: 413 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = DisputePayload.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  // Auth is optional — disputes may come from authed users or anonymous
  // visitors who only have the verdict URL. Authed userId is captured when
  // available for moderation provenance.
  const { userId } = await auth();

  const id = `dispute_${ulid()}`;
  try {
    await db.insert(schema.disputes).values({
      id,
      sessionId: parsed.data.sessionId,
      claimId: parsed.data.claimId ?? null,
      disputerClerkUserId: userId ?? null,
      disputerEmail: parsed.data.disputerEmail,
      evidenceUrl: parsed.data.evidenceUrl || null,
      correctionRequested: parsed.data.correctionRequested,
      status: "pending",
    });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[/api/disputes] insert failed", err);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}
