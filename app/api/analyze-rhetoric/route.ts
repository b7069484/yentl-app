import { generateText, Output } from "ai";
import { opus } from "@/lib/server/anthropic";
import {
  AnalyzeRhetoricResponse,
  SYSTEM_PREFIX,
  userPrompt,
} from "@/lib/prompts/analyze-rhetoric";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
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
      prompt: userPrompt(body),
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
