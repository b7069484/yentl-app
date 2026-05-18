import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { opus } from "@/lib/server/anthropic";
import {
  SYSTEM,
  VerifyProvisionalRequest,
  VerifyProvisionalResponse,
} from "@/lib/prompts/verify-provisional";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = VerifyProvisionalRequest.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: VerifyProvisionalResponse }),
      system: SYSTEM,
      prompt: `CLAIM:\n${parsed.data.claim_text}`,
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("verify-provisional failed", e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
