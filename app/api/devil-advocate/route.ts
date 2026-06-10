import { NextRequest, NextResponse } from "next/server";
import { grok } from "@/lib/server/grok";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import {
  DevilAdvocateRequest,
  SYSTEM,
  parseDevilAdvocateText,
  userPrompt,
} from "@/lib/prompts/devil-advocate";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import { documentValidationDevilAdvocateFixture } from "@/lib/server/document-validation-analysis-fixtures";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_JSON_BYTES = 64 * 1024;

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = DevilAdvocateRequest.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const documentValidationFixture = documentValidationDevilAdvocateFixture(parsed.data);
  if (documentValidationFixture) {
    return NextResponse.json(documentValidationFixture);
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
