import { NextRequest, NextResponse } from "next/server";
import { transcribeUrl } from "@/lib/server/deepgram-batch";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

const MAX_DURATION_SEC = 4 * 60 * 60; // 4 hours

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { blob_url, duration_sec } = body as Record<string, unknown>;

  if (!blob_url || typeof blob_url !== "string") {
    return NextResponse.json(
      { error: "blob_url is required and must be a string" },
      { status: 400 },
    );
  }

  if (
    duration_sec !== undefined &&
    typeof duration_sec === "number" &&
    duration_sec > MAX_DURATION_SEC
  ) {
    return NextResponse.json(
      {
        error: `Audio exceeds maximum allowed duration of 4 hours (${duration_sec}s > ${MAX_DURATION_SEC}s)`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await transcribeUrl(blob_url);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("transcribe-batch: Deepgram error", message);
    return NextResponse.json(
      { error: `Deepgram transcription failed: ${message}` },
      { status: 500 },
    );
  }
}
