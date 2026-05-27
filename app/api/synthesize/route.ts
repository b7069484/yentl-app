import { generateText, Output } from "ai";
import { opus } from "@/lib/server/anthropic";
import {
  SynthesizeRequest,
  SynthesizeResponse,
  SYSTEM_PREFIX,
  userPrompt,
} from "@/lib/prompts/synthesize";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.model);
  if (limited) return limited;

  const body = await req.json();

  // Validate request body
  const parsed = SynthesizeRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    // Use top-level `system` (not messages[] role:"system") to avoid the AI SDK
    // prompt-injection warning. Mirrors the deliberate pattern from analyze-rhetoric
    // route (commit 32095d8).
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: SynthesizeResponse }),
      system: SYSTEM_PREFIX,
      prompt: userPrompt(parsed.data),
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("synthesize failed", e);
    return NextResponse.json({ error: "synthesis failed" }, { status: 500 });
  }
}
