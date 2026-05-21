import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { grok } from "@/lib/server/grok";
import {
  DevilAdvocateRequest,
  SYSTEM,
  parseDevilAdvocateText,
  userPrompt,
} from "@/lib/prompts/devil-advocate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = DevilAdvocateRequest.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: grok,
      system: SYSTEM,
      prompt: userPrompt(parsed.data),
      temperature: 0.2,
    });
    const output = parseDevilAdvocateText(text);

    return NextResponse.json({ ...output, model: grok });
  } catch (e) {
    console.error("devil-advocate failed", e);
    return NextResponse.json({ error: "devil advocate failed" }, { status: 500 });
  }
}
