import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { opus } from "@/lib/server/anthropic";
import { SYSTEM, VerifyConfirmedResponse } from "@/lib/prompts/verify-confirmed";
import { classifyDomain, extractDomain } from "@/lib/reputation";
import type { Source, Stance } from "@/lib/types";
import { mergeStanceWithCitations } from "./citations";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { claim_text } = await req.json();
  try {
    const result = await generateText({
      model: opus,
      output: Output.object({ schema: VerifyConfirmedResponse }),
      system: SYSTEM,
      prompt: `CLAIM:\n${claim_text}`,
      tools: {
        web_search: anthropic.tools.webSearch_20260209({ maxUses: 5 }),
      },
    });

    const sources = mergeStanceWithCitations(
      result.steps,
      result.output.stance_refs,
    ).map((s) => {
      const domain = extractDomain(s.domain || s.url);
      return { ...s, domain, reputation_tier: classifyDomain(domain) };
    });

    return NextResponse.json({
      primary_label: result.output.primary_label,
      score: result.output.score,
      annotations: result.output.annotations,
      explanation: result.output.explanation,
      sources,
    });
  } catch (e) {
    console.error("verify-confirmed failed", e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
