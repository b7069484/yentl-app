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
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: AnalyzeRhetoricResponse }),
      messages: [
        {
          role: "system",
          content: SYSTEM_PREFIX,
          // Mark this large static block as cacheable. Field name may differ —
          // verify against current @ai-sdk/anthropic docs; the wire-level expectation
          // is `{ "cache_control": { "type": "ephemeral" } }` on the system content block.
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { role: "user", content: userPrompt(body) },
      ],
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("analyze-rhetoric failed", e);
    return NextResponse.json({ error: "analyze failed" }, { status: 500 });
  }
}
