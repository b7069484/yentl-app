import { Readable } from "stream";
import { NextResponse } from "next/server";
import {
  transcribeFile,
  transcribeStream,
  transcribeUrl,
} from "@/lib/server/deepgram-batch";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_DURATION_SEC = 4 * 60 * 60; // 4 hours
/** Files above this threshold are streamed to Deepgram rather than buffered. */
const STREAM_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: Request): Promise<NextResponse> {
  const contentType = req.headers.get("content-type") ?? "";

  // ── multipart/form-data: direct file upload (no Vercel Blob required) ──────
  if (contentType.startsWith("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
    }

    const file = formData.get("file");
    const durationSecRaw = formData.get("duration_sec");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (durationSecRaw === null) {
      return NextResponse.json(
        { error: "duration_sec must be a non-negative number" },
        { status: 400 },
      );
    }
    const durationSec = Number(durationSecRaw);
    if (!Number.isFinite(durationSec) || durationSec < 0) {
      return NextResponse.json(
        { error: "duration_sec must be a non-negative number" },
        { status: 400 },
      );
    }

    if (durationSec > MAX_DURATION_SEC) {
      return NextResponse.json(
        { error: "audio exceeds 4-hour cap" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "file exceeds 500MB cap" },
        { status: 400 },
      );
    }

    // ── Branch: stream large files; buffer small ones ─────────────────────────
    if (file.size > STREAM_THRESHOLD_BYTES) {
      // Convert Web ReadableStream → Node Readable to avoid a 60MB+ Buffer.
      // The Deepgram v5 SDK accepts a Node Readable directly as `uploadable`.
      const nodeStream = Readable.fromWeb(
        file.stream() as import("stream/web").ReadableStream,
      );
      try {
        const result = await transcribeStream(nodeStream, file.type);
        return NextResponse.json(result);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("transcribe-batch: Deepgram stream error (large file)", message);
        return NextResponse.json(
          { error: `Transcription failed: ${message}` },
          { status: 500 },
        );
      }
    }

    // ── Small file (≤50MB): existing Buffer path, unchanged ───────────────────
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const result = await transcribeFile(buffer, file.type);
      return NextResponse.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("transcribe-batch: Deepgram error (file)", message);
      return NextResponse.json(
        { error: `Transcription failed: ${message}` },
        { status: 500 },
      );
    }
  }

  // ── application/json: media URL path (back-compat / future callers) ─────────
  if (contentType.startsWith("application/json")) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { blob_url, url, duration_sec: dur } = body as Record<string, unknown>;
    const targetUrl = blob_url ?? url;

    if (!targetUrl || typeof targetUrl !== "string") {
      return NextResponse.json(
        { error: "blob_url is required and must be a string" },
        { status: 400 },
      );
    }

    if (typeof dur !== "number" || !Number.isFinite(dur) || dur < 0) {
      return NextResponse.json(
        { error: "duration_sec must be a non-negative number" },
        { status: 400 },
      );
    }

    if (dur > MAX_DURATION_SEC) {
      return NextResponse.json(
        { error: "audio exceeds 4-hour cap" },
        { status: 400 },
      );
    }

    try {
      const result = await transcribeUrl(targetUrl);
      return NextResponse.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("transcribe-batch: Deepgram error (url)", message);
      return NextResponse.json(
        { error: `Deepgram transcription failed: ${message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
}
