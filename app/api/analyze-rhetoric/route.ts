import { Output } from "ai";
import { z } from "zod";
import { opus } from "@/lib/server/anthropic";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import {
  AnalyzeRhetoricResponse,
  SYSTEM_PREFIX,
  userPrompt,
} from "@/lib/prompts/analyze-rhetoric";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import { requirePaidLiveAccess } from "@/lib/server/paid-live-gate";
import { youtubeValidationAnalyzeRhetoricFixture } from "@/lib/server/youtube-validation-analysis-fixtures";
import { documentValidationAnalyzeRhetoricFixture } from "@/lib/server/document-validation-analysis-fixtures";

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

  const validationFixture = youtubeValidationAnalyzeRhetoricFixture(parsed.data);
  if (validationFixture) {
    return NextResponse.json(validationFixture);
  }
  const documentValidationFixture = documentValidationAnalyzeRhetoricFixture(parsed.data);
  if (documentValidationFixture) {
    return NextResponse.json(documentValidationFixture);
  }

  const authError = await requirePaidLiveAccess(req, "model:analyze-rhetoric");
  if (authError) return authError;

  try {
    // Use top-level `system` (not messages[] role:"system") to avoid the AI SDK
    // prompt-injection warning. Use the gateway-supported ephemeral cache hint;
    // the previous persistent value is rejected by the current Anthropic schema.
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: AnalyzeRhetoricResponse }),
      system: SYSTEM_PREFIX,
      prompt: userPrompt(parsed.data),
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("analyze-rhetoric failed", e);
    return NextResponse.json({ error: "analyze failed" }, { status: 500 });
  }
}
