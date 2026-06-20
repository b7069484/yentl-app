import { NextRequest, NextResponse } from "next/server";
import { Output } from "ai";
import { z } from "zod";
import { opus } from "@/lib/server/anthropic";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import {
  SYSTEM,
  VerifyClaimContext,
  VerifyProvisionalResponse,
  userPrompt,
} from "@/lib/prompts/verify-provisional";
import { enforceEngagementGate } from "@/lib/server/engagement-gate";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import { requirePaidLiveAccess } from "@/lib/server/paid-live-gate";
import { youtubeValidationVerifyProvisionalFixture } from "@/lib/server/youtube-validation-analysis-fixtures";
import { documentValidationVerifyProvisionalFixture } from "@/lib/server/document-validation-analysis-fixtures";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_JSON_BYTES = 24 * 1024;
const VerifyRequest = z.object({
  claim_text: z.string().trim().min(3).max(2_000),
  source_context: z.string().max(6_000).optional(),
  claim_context: VerifyClaimContext.optional(),
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

  const parsed = VerifyRequest.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { claim_text, source_context } = parsed.data;
  const validationFixture = youtubeValidationVerifyProvisionalFixture(parsed.data);
  if (validationFixture) {
    return NextResponse.json(validationFixture);
  }
  const documentValidationFixture = documentValidationVerifyProvisionalFixture(parsed.data);
  if (documentValidationFixture) {
    return NextResponse.json(documentValidationFixture);
  }

  const authError = await requirePaidLiveAccess(req, "model:verify-provisional");
  if (authError) return authError;

  const gateError = await enforceEngagementGate(claim_text, req, source_context);
  if (gateError) return gateError;

  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: VerifyProvisionalResponse }),
      system: SYSTEM,
      prompt: userPrompt(parsed.data),
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("verify-provisional failed", e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
