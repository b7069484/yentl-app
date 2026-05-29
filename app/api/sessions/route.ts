import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { saveSession } from "@/lib/server/save-session";

export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_JSON_BYTES = 2 * 1024 * 1024;

const SessionPayload = z
  .object({
    session: z
      .object({
        title: z.string().optional(),
        started_at: z.string(),
        ended_at: z.string().optional(),
        transcript: z.array(z.any()),
        claims: z.array(z.any()),
        markers: z.array(z.any()),
        speakers: z.array(z.any()),
        source: z.object({ kind: z.string() }).passthrough(),
      })
      .passthrough(),
  })
  .strict();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

  const parsed = SessionPayload.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const { id } = await saveSession({
      clerkUserId: userId,
      session: parsed.data.session as never,
    });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[/api/sessions] save failed", err);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}
