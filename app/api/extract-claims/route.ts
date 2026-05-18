import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { opus } from "@/lib/server/anthropic";
import {
  ExtractClaimsRequest,
  ExtractClaimsResponse,
  SYSTEM,
  userPrompt,
} from "@/lib/prompts/extract-claims";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = ExtractClaimsRequest.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: ExtractClaimsResponse }),
      system: SYSTEM,
      prompt: userPrompt(parsed.data),
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("extract-claims failed", e);
    return NextResponse.json({ error: "extraction failed" }, { status: 500 });
  }
}
