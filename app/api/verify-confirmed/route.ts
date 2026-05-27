import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { opus } from "@/lib/server/anthropic";
import { SYSTEM, VerifyConfirmedResponse } from "@/lib/prompts/verify-confirmed";
import { classifyDomain, extractDomain } from "@/lib/reputation";
import { mergeStanceWithCitations } from "./citations";
import { enforceEngagementGate } from "@/lib/server/engagement-gate";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_JSON_BYTES = 24 * 1024;
const VerifyRequest = z.object({
  claim_text: z.string().trim().min(3).max(2_000),
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

  const parsed = VerifyRequest.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { claim_text, source_context } = parsed.data;
  const gateError = await enforceEngagementGate(claim_text, req, source_context);
  if (gateError) return gateError;

  const context = typeof source_context === "string" && source_context.trim()
    ? `SOURCE_CONTEXT (for disambiguation only; not evidence):\n${source_context.trim()}\n\n`
    : "";

  try {
    const result = await generateText({
      model: opus,
      output: Output.object({ schema: VerifyConfirmedResponse }),
      system: SYSTEM,
      prompt: `${context}CLAIM:\n${claim_text}`,
      tools: {
        web_search: anthropic.tools.webSearch_20260209({ maxUses: 5 }),
      },
    });

    const sources = mergeStanceWithCitations(
      result.steps,
      result.output.stance_refs,
    ).map((s) => {
      const domain = extractDomain(s.domain || s.url);
      return { ...s, domain, reputation_tier: classifyDomain(domain) };
    });

    return NextResponse.json({
      primary_label: result.output.primary_label,
      score: result.output.score,
      annotations: result.output.annotations,
      explanation: result.output.explanation,
      sources,
    });
  } catch (e) {
    console.error("verify-confirmed failed", e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
