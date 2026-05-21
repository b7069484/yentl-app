import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { opus } from "@/lib/server/anthropic";
import { SYSTEM, VerifyProvisionalResponse } from "@/lib/prompts/verify-provisional";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { claim_text, source_context } = await req.json();
  const context = typeof source_context === "string" && source_context.trim()
    ? `SOURCE_CONTEXT (for disambiguation only; not evidence):\n${source_context.trim()}\n\n`
    : "";

  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: VerifyProvisionalResponse }),
      system: SYSTEM,
      prompt: `${context}CLAIM:\n${claim_text}`,
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("verify-provisional failed", e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
