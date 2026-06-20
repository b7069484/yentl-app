import { Output } from "ai";
import type { z } from "zod";
import { opus } from "@/lib/server/anthropic";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import {
  SynthesizeRequest,
  SynthesizeResponse,
  SYSTEM_PREFIX,
  userPrompt,
} from "@/lib/prompts/synthesize";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import { requirePaidLiveAccess } from "@/lib/server/paid-live-gate";
import { youtubeValidationSynthesisFixture } from "@/lib/server/youtube-validation-analysis-fixtures";
import { documentValidationSynthesisFixture } from "@/lib/server/document-validation-analysis-fixtures";
import { syntheticPanelSynthesisFixture } from "@/lib/server/validation-media-fixtures";
import {
  buildSynthesisMetaRead,
  isCleanOwnedSynthesisClaim,
  sanitizeSynthesisMetaRead,
} from "@/lib/synthesis-meta-read";

export const runtime = "nodejs";
export const maxDuration = 60;

type SynthesisOutput = z.infer<typeof SynthesizeResponse>;
type SynthesisInput = z.infer<typeof SynthesizeRequest>;
type SpeakerVerdict = NonNullable<SynthesisOutput["per_speaker_verdicts"]>[number];

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.model);
  if (limited) return limited;

  const body = await req.json();

  // Validate request body
  const parsed = SynthesizeRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const validationFixture = youtubeValidationSynthesisFixture(parsed.data);
  if (validationFixture) {
    return NextResponse.json(enrichSynthesisFixture(validationFixture, parsed.data));
  }
  const mediaValidationFixture = syntheticPanelSynthesisFixture(parsed.data);
  if (mediaValidationFixture) {
    return NextResponse.json(enrichSynthesisFixture(mediaValidationFixture, parsed.data));
  }
  const documentValidationFixture = documentValidationSynthesisFixture(parsed.data);
  if (documentValidationFixture) {
    return NextResponse.json(enrichSynthesisFixture(documentValidationFixture, parsed.data));
  }

  const authError = await requirePaidLiveAccess(req, "model:synthesize");
  if (authError) return authError;

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
    return NextResponse.json(sanitizeSynthesisOutput(output, parsed.data));
  } catch (e) {
    const recovered = recoverSynthesisOutput(e);
    if (recovered) {
      return NextResponse.json(sanitizeSynthesisOutput(recovered, parsed.data));
    }
    if (shouldUseLocalSynthesisFallback(e)) {
      return NextResponse.json(localSynthesisFallback(parsed.data));
    }
    console.error("synthesize failed", e);
    return NextResponse.json({ error: "synthesis failed" }, { status: 500 });
  }
}

const TRUE_VERDICTS = new Set(["TRUE", "MOSTLY_TRUE"]);
const FALSE_VERDICTS = new Set(["FALSE", "MISLEADING"]);
const MIXED_VERDICTS = new Set(["PARTIAL", "OMISSION"]);

function sanitizeSynthesisOutput(output: SynthesisOutput, input: SynthesisInput): SynthesisOutput {
  const perSpeakerVerdicts = output.per_speaker_verdicts?.length
    ? output.per_speaker_verdicts.map((verdict) => sanitizeSpeakerVerdict(verdict, input))
    : output.per_speaker_verdicts;

  return {
    ...output,
    ...(perSpeakerVerdicts !== undefined ? { per_speaker_verdicts: perSpeakerVerdicts } : {}),
    meta_read: sanitizeSynthesisMetaRead(
      output.meta_read ?? buildSynthesisMetaRead(input, perSpeakerVerdicts ?? []),
      input,
      perSpeakerVerdicts ?? [],
    ),
  };
}

function enrichSynthesisFixture(output: SynthesisOutput, input: SynthesisInput): SynthesisOutput {
  return {
    ...output,
    meta_read: sanitizeSynthesisMetaRead(
      output.meta_read ?? buildSynthesisMetaRead(input, output.per_speaker_verdicts ?? []),
      input,
      output.per_speaker_verdicts ?? [],
    ),
  };
}

function sanitizeSpeakerVerdict(verdict: SpeakerVerdict, input: SynthesisInput): SpeakerVerdict {
  const expectedFactualGrade = factualGradeFromCleanOwnedClaims(input, verdict.speaker_id);
  if (verdict.factual_grade === expectedFactualGrade) return verdict;

  return {
    ...verdict,
    factual_grade: expectedFactualGrade,
    one_liner: factualGradeCaveat(expectedFactualGrade),
  };
}

function factualGradeFromCleanOwnedClaims(
  input: SynthesisInput,
  speakerId: number,
): SpeakerVerdict["factual_grade"] {
  const cleanClaims = input.claims.filter((claim) => isCleanOwnedClaim(claim, speakerId));
  if (cleanClaims.length < 2) return "insufficient";

  const trueCount = cleanClaims.filter((claim) => TRUE_VERDICTS.has(claim.verdict)).length;
  const falseCount = cleanClaims.filter((claim) => FALSE_VERDICTS.has(claim.verdict)).length;
  const mixedCount = cleanClaims.filter((claim) => MIXED_VERDICTS.has(claim.verdict)).length;

  if (trueCount >= 2 && falseCount <= 1) return "mostly_factual";
  if (falseCount >= 2 && trueCount <= 1) return "mostly_inaccurate";
  if (trueCount + falseCount + mixedCount >= 2) return "mixed";
  return "insufficient";
}

function isCleanOwnedClaim(
  claim: SynthesisInput["claims"][number],
  speakerId: number,
): boolean {
  return isCleanOwnedSynthesisClaim(claim, speakerId);
}

function factualGradeCaveat(grade: SpeakerVerdict["factual_grade"]): string {
  switch (grade) {
    case "mostly_factual":
      return "Clean owned claims are mostly supported.";
    case "mostly_inaccurate":
      return "Clean owned claims are mostly contradicted.";
    case "mixed":
      return "Clean owned claims point in mixed directions.";
    case "insufficient":
      return "Not enough clean owned claims for a factual read.";
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
  for (const candidate of normalizedSynthesisCandidates(value)) {
    const direct = parseAndValidateSynthesis(candidate);
    if (direct) return direct;
  }

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
    for (const candidate of normalizedSynthesisCandidates(value.slice(firstBrace, lastBrace + 1))) {
      const recovered = parseAndValidateSynthesis(candidate);
      if (recovered) return recovered;
    }
  }

  return null;
}

function normalizedSynthesisCandidates(value: string): string[] {
  const candidates = new Set<string>();
  const add = (candidate: string) => {
    const trimmed = candidate.trim();
    if (trimmed) candidates.add(trimmed);
  };

  add(value);
  const withoutToolTail = value.replace(/<\/parameter>[\s\S]*$/i, "").replace(/<\/invoke>[\s\S]*$/i, "");
  add(withoutToolTail);

  for (const candidate of [...candidates]) {
    if (!looksLikePartialSynthesisObject(candidate)) continue;

    const lastHeadlineArray = candidate.lastIndexOf("]");
    const lastObjectClose = candidate.lastIndexOf("}");
    if (lastHeadlineArray > lastObjectClose) {
      add(`${candidate.slice(0, lastHeadlineArray + 1)}}`);
    }
  }

  return [...candidates];
}

function looksLikePartialSynthesisObject(value: string): boolean {
  return (
    value.trimStart().startsWith("{") &&
    value.includes('"text"') &&
    value.includes('"headlines"')
  );
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
    meta_read: buildSynthesisMetaRead(args, []),
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
