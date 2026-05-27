import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { opus } from "@/lib/server/anthropic";
import { ExtractClaimsResponse, SYSTEM, userPrompt } from "@/lib/prompts/extract-claims";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_JSON_BYTES = 32 * 1024;
const ExtractClaimsRequest = z.object({
  utterance: z.string().trim().min(1).max(4_000),
  utterance_start: z.number().finite().min(0).max(24 * 60 * 60),
  utterance_end: z.number().finite().min(0).max(24 * 60 * 60),
  context: z.string().max(12_000).default(""),
  recent_hashes: z.array(z.string().max(128)).max(200).default([]),
}).strict();

function rejectOversizedJson(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  return Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES;
}

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.model);
  if (limited) return limited;

  if (rejectOversizedJson(req)) {
    return NextResponse.json({ error: "request body too large" }, { status: 413 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = ExtractClaimsRequest.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: ExtractClaimsResponse }),
      system: SYSTEM,
      prompt: userPrompt(parsed.data),
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("extract-claims failed", e);
    return NextResponse.json({ error: "extraction failed" }, { status: 500 });
  }
}
