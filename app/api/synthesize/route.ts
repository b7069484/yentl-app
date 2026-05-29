import { Output } from "ai";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import type { z } from "zod";
import { opus } from "@/lib/server/anthropic";
import {
  SynthesizeRequest,
  SynthesizeResponse,
  SYSTEM_PREFIX,
  userPrompt,
} from "@/lib/prompts/synthesize";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

type SynthesisOutput = z.infer<typeof SynthesizeResponse>;

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.model);
  if (limited) return limited;

  const body = await req.json();

  // Validate request body
  const parsed = SynthesizeRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    // Use top-level `system` (not messages[] role:"system") to avoid the AI SDK
    // prompt-injection warning. Mirrors the deliberate pattern from analyze-rhetoric
    // route (commit 32095d8).
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: SynthesizeResponse }),
      system: SYSTEM_PREFIX,
      prompt: userPrompt(parsed.data),
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });
    return NextResponse.json(output);
  } catch (e) {
    const recovered = recoverSynthesisOutput(e);
    if (recovered) {
      return NextResponse.json(recovered);
    }
    if (shouldUseLocalSynthesisFallback(e)) {
      return NextResponse.json(localSynthesisFallback(parsed.data));
    }
    console.error("synthesize failed", e);
    return NextResponse.json({ error: "synthesis failed" }, { status: 500 });
  }
}

function recoverSynthesisOutput(error: unknown): SynthesisOutput | null {
  const candidates = new Set<string>();
  addCandidateText(candidates, (error as { text?: unknown })?.text);
  addCandidateText(candidates, (error as { cause?: { value?: unknown } })?.cause?.value);

  for (const candidate of candidates) {
    const recovered = parseSynthesisCandidate(candidate);
    if (recovered) return recovered;
  }

  return null;
}

function addCandidateText(candidates: Set<string>, value: unknown): void {
  if (typeof value === "string") {
    candidates.add(value);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value)) {
    candidates.add(key);
    if (typeof nested === "string") candidates.add(nested);
  }
}

function parseSynthesisCandidate(value: string): SynthesisOutput | null {
  const direct = parseAndValidateSynthesis(value);
  if (direct) return direct;

  const parsed = safeParseJson(value);
  if (parsed && typeof parsed === "object") {
    const objectValidation = SynthesizeResponse.safeParse(parsed);
    if (objectValidation.success) return objectValidation.data;

    for (const [key, nested] of Object.entries(parsed)) {
      const fromKey = parseSynthesisCandidate(key);
      if (fromKey) return fromKey;
      if (typeof nested === "string") {
        const fromValue = parseSynthesisCandidate(nested);
        if (fromValue) return fromValue;
      }
    }
  }

  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return parseAndValidateSynthesis(value.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

function parseAndValidateSynthesis(value: string): SynthesisOutput | null {
  const parsed = safeParseJson(value);
  const validation = SynthesizeResponse.safeParse(parsed);
  return validation.success ? validation.data : null;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function shouldUseLocalSynthesisFallback(error: unknown): boolean {
  const err = error as {
    statusCode?: unknown;
    cause?: { statusCode?: unknown; responseBody?: unknown; data?: unknown };
    responseBody?: unknown;
  };
  const statusCode = Number(err.statusCode ?? err.cause?.statusCode ?? 0);
  if (statusCode === 402) return true;

  const body = [
    err.responseBody,
    err.cause?.responseBody,
    err.cause?.data ? JSON.stringify(err.cause.data) : "",
    error instanceof Error ? error.message : "",
  ].join("\n");
  return /insufficient_funds|positive credit balance|required for all requests/i.test(body);
}

function localSynthesisFallback(args: z.infer<typeof SynthesizeRequest>): SynthesisOutput {
  const speakerMap = new Map(args.speakers.map((speaker) => [speaker.id, speaker.label]));
  const speakerIds = new Set(args.utterances.map((utterance) => utterance.speaker_id).filter((id): id is number => id !== null));
  const speakerLabels = [...speakerIds]
    .map((id) => speakerMap.get(id) ?? `Speaker ${id + 1}`)
    .slice(0, 3);
  const sourceLabel = speakerLabels.length > 0 ? speakerLabels.join(" and ") : "The source";
  const cleanedText = args.utterances
    .map((utterance) => utterance.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
  const excerpt = sentenceSnippet(cleanedText);
  const markerTotal = args.counters.fallacy + args.counters.bias + args.counters.rhetoric;
  const verdictSummary =
    args.counters.claims > 0
      ? `${args.counters.claims} claims are in play: ${args.counters.true} true, ${args.counters.partial} partial, ${args.counters.false} false.`
      : "No claim verdicts have landed yet.";
  const markerSummary =
    markerTotal > 0
      ? `${markerTotal} rhetoric or bias markers have surfaced.`
      : "No rhetoric, bias, or fallacy markers have surfaced yet.";

  return {
    text: `${sourceLabel} is moving through the imported material while Yentl keeps the transcript anchored to the current session. ${verdictSummary} ${markerSummary} Current thread: ${excerpt}`,
    headlines: [
      args.counters.claims > 0 ? `${args.counters.claims} claims currently tracked.` : "No checkable claims logged yet.",
      markerTotal > 0 ? `${markerTotal} rhetoric or bias markers logged.` : "No rhetoric markers logged yet.",
      speakerLabels.length > 1 ? `${speakerLabels.length} speakers active in this read.` : "One source voice is carrying the session.",
    ],
    per_speaker_verdicts: args.speakers.map((speaker) => ({
      speaker_id: speaker.id,
      label: speaker.label,
      factual_grade: "insufficient" as const,
      faith_grade: "insufficient" as const,
      one_liner: "Local fallback read; model verdict unavailable.",
    })),
  };
}

function sentenceSnippet(text: string): string {
  if (!text) return "Yentl is waiting for more transcript content.";
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
  const selected = (sentences[0] ?? text).split(/\s+/).slice(0, 34).join(" ");
  return selected.endsWith(".") ? selected : `${selected}.`;
}
