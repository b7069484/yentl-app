import { NextRequest, NextResponse } from "next/server";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import { grok } from "@/lib/server/grok";
import {
  DevilAdvocateRequest,
  SYSTEM,
  parseDevilAdvocateText,
  userPrompt,
} from "@/lib/prompts/devil-advocate";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.model);
  if (limited) return limited;

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
