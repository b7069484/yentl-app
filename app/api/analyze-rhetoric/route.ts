import { Output } from "ai";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import { z } from "zod";
import { opus } from "@/lib/server/anthropic";
import {
  AnalyzeRhetoricResponse,
  SYSTEM_PREFIX,
  userPrompt,
} from "@/lib/prompts/analyze-rhetoric";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_JSON_BYTES = 64 * 1024;
const AnalyzeRhetoricRequest = z.object({
  transcript_window: z.string().trim().min(1).max(16_000),
  recent_hashes: z.array(z.string().max(128)).max(300).default([]),
  source_context: z.string().max(6_000).optional(),
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

  const parsed = AnalyzeRhetoricRequest.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    // Use top-level `system` (not messages[] role:"system") to avoid the AI SDK
    // prompt-injection warning. SYSTEM_PREFIX is module-constant text, so
    // explicit `cache_control` would still be nice — but the messages-form
    // marker triggered a security warning on every call, polluting logs.
    // Anthropic's automatic prefix-cache still catches the static SYSTEM_PREFIX
    // when the same content is repeated, just without an explicit hint.
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: AnalyzeRhetoricResponse }),
      system: SYSTEM_PREFIX,
      prompt: userPrompt(parsed.data),
      providerOptions: {
        anthropic: { cacheControl: { type: "persistent" } },
      },
      // Phase 1d Task 4 — deterministic marker extraction. Same utterance →
      // same markers across modes + re-runs. Closes part of the trimodal
      // markerNameOverlap gap (~25-60% across candidates pre-fix).
      temperature: 0,
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("analyze-rhetoric failed", e);
    return NextResponse.json({ error: "analyze failed" }, { status: 500 });
  }
}
