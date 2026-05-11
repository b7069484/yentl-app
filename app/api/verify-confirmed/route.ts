import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { opus } from "@/lib/server/anthropic";
import { SYSTEM, VerifyConfirmedResponse } from "@/lib/prompts/verify-confirmed";
import { classifyDomain, extractDomain } from "@/lib/reputation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { claim_text } = await req.json();
  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: VerifyConfirmedResponse }),
      system: SYSTEM,
      prompt: `CLAIM:\n${claim_text}`,
      tools: {
        web_search: anthropic.tools.webSearch_20260209({ maxUses: 5 }),
      },
    });

    // Attach reputation tier to each source server-side (not LLM-derived)
    const enriched = {
      ...output,
      sources: output.sources.map((s) => {
        const domain = extractDomain(s.domain || s.url);
        return { ...s, domain, reputation_tier: classifyDomain(domain) };
      }),
    };
    return NextResponse.json(enriched);
  } catch (e) {
    console.error("verify-confirmed failed", e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
