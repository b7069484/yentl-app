import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { opus } from "@/lib/server/anthropic";
import { ExtractClaimsResponse, SYSTEM, userPrompt } from "@/lib/prompts/extract-claims";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: ExtractClaimsResponse }),
      system: SYSTEM,
      prompt: userPrompt(body),
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("extract-claims failed", e);
    return NextResponse.json({ error: "extraction failed" }, { status: 500 });
  }
}
