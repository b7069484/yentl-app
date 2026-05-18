import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { opus } from "@/lib/server/anthropic";
import {
  SYSTEM,
  VerifyConfirmedRequest,
  VerifyConfirmedResponse,
} from "@/lib/prompts/verify-confirmed";
import { classifyDomain, extractDomain } from "@/lib/reputation";

export const runtime = "nodejs";
export const maxDuration = 60;

// Strip any field-bleed before the next JSON property leaked into the URL
// (e.g., `https://x.com/y/','domain':'...`). If the remainder still doesn't
// parse as a URL, fall back to the bare domain.
function sanitizeUrl(raw: string, domain: string): string {
  const cleaned = raw.split(/['"]\s*,/)[0];
  try {
    return new URL(cleaned).toString();
  } catch {
    return `https://${domain}/`;
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = VerifyConfirmedRequest.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: VerifyConfirmedResponse }),
      system: SYSTEM,
      prompt: `CLAIM:\n${parsed.data.claim_text}`,
      tools: {
        // `webSearch_20260209` is the current Anthropic helper as of May 2026.
        web_search: anthropic.tools.webSearch_20260209({ maxUses: 5 }),
      },
    });

    // Attach reputation tier server-side from the domain. LLM-provided tiers
    // would be hallucinable; the domain itself is grounded in the search hit.
    // Also sanitize URLs — Claude's structured output occasionally bleeds the
    // next field into the URL string (e.g., "https://x.com/y/','domain':'..."').
    const enriched = {
      ...output,
      sources: output.sources.map((s) => {
        const domain = extractDomain(s.domain || s.url);
        return {
          ...s,
          domain,
          url: sanitizeUrl(s.url, domain),
          reputation_tier: classifyDomain(domain),
        };
      }),
    };
    return NextResponse.json(enriched);
  } catch (e) {
    console.error("verify-confirmed failed", e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
