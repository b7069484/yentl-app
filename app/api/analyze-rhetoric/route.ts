import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { opus } from "@/lib/server/anthropic";
import {
  AnalyzeRhetoricResponse,
  SYSTEM,
  userPrompt,
} from "@/lib/prompts/analyze-rhetoric";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: AnalyzeRhetoricResponse }),
      system: SYSTEM,
      prompt: userPrompt(body),
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("analyze-rhetoric failed", e);
    return NextResponse.json({ error: "analyze failed" }, { status: 500 });
  }
}
