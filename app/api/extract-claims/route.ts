import { NextRequest, NextResponse } from "next/server";
import { Output } from "ai";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import { z } from "zod";
import { opus } from "@/lib/server/anthropic";
import { EXTRACT_CLAIMS_SCHEMA, SYSTEM, userPrompt } from "@/lib/prompts/extract-claims";
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
    // Phase 1d Task 4 — determinism. Trimodal eval found cross-mode claim
    // Jaccard as low as 0% (hitchens_mcgrath SRT vs audio). Temperature
    // defaults to 1.0 across the Anthropic SDK; setting it to 0 makes the
    // same {utterance, context} input produce the same claim set across
    // modes + across re-runs. The cost: less varied wording on edge cases,
    // which is an acceptable trade for a fact-check product where the same
    // content has to produce the same fact-check.
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: EXTRACT_CLAIMS_SCHEMA }),
      system: SYSTEM,
      prompt: userPrompt(parsed.data),
      temperature: 0,
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("extract-claims failed", e);
    return NextResponse.json({ error: "extraction failed" }, { status: 500 });
  }
}
