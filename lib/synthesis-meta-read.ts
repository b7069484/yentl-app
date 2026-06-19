import type { z } from "zod";
import {
  SynthesizeRequest,
  type SpeakerVerdict,
  type SynthesisMetaRead,
} from "@/lib/prompts/synthesize";

export type SynthesisMetaReadInput = z.infer<typeof SynthesizeRequest>;
export type SynthesisClaimSummary = SynthesisMetaReadInput["claims"][number];

const RESOLVED_CLAIM_ATTRIBUTIONS = new Set(["confident", "probable", "manual_corrected"]);
const NON_ASSERTIVE_CLAIM_STANCES = new Set(["quoted", "reported", "mocked", "questioned", "unclear"]);
const SOURCE_HEALTH_RANK: Record<SynthesisMetaRead["source_health"], number> = {
  unknown: 0,
  thin: 1,
  mixed: 2,
  strong: 3,
};

export interface SynthesisMetaReadQualityAssessment {
  ok: boolean;
  score: number;
  expected: Pick<SynthesisMetaRead, "posture" | "source_health" | "scope">;
  actual: Pick<SynthesisMetaRead, "posture" | "source_health" | "scope">;
  evidence_depth: {
    clean_claims: number;
    uncertain_claims: number;
    marker_total: number;
    partial_claims: number;
    source_context_present: boolean;
    scope: SynthesisMetaRead["scope"];
  };
  mismatches: Array<{
    field: "posture" | "source_health" | "scope" | "uncertainty";
    expected: string;
    actual: string;
    reason: string;
  }>;
}

export function isCleanOwnedSynthesisClaim(
  claim: SynthesisClaimSummary,
  speakerId?: number,
): boolean {
  if (speakerId !== undefined && claim.speaker_id !== speakerId) return false;
  if (claim.speaker_id === null) return false;
  if (
    claim.attribution_status &&
    !RESOLVED_CLAIM_ATTRIBUTIONS.has(claim.attribution_status)
  ) {
    return false;
  }
  if (claim.stance && NON_ASSERTIVE_CLAIM_STANCES.has(claim.stance)) return false;
  return true;
}

export function sanitizeSynthesisMetaRead(
  metaRead: SynthesisMetaRead,
  input: SynthesisMetaReadInput,
  verdicts: SpeakerVerdict[] = [],
): SynthesisMetaRead {
  const expected = buildSynthesisMetaRead(input, verdicts);
  return {
    posture: sanitizePosture(metaRead.posture, expected.posture),
    source_health: sanitizeSourceHealth(metaRead.source_health, expected.source_health),
    scope: input.analysis_scope?.mode ?? metaRead.scope,
    summary: clampSentence(metaRead.summary, "Conversation posture is still forming."),
    uncertainty: clampSentence(metaRead.uncertainty, "Uncertainty remains around attribution, evidence strength, or missing context."),
    key_question: clampSentence(metaRead.key_question, "Which claim has the strongest source-backed support?"),
  };
}

export function buildSynthesisMetaRead(
  input: SynthesisMetaReadInput,
  verdicts: SpeakerVerdict[],
): SynthesisMetaRead {
  const cleanClaims = input.claims.filter((claim) => isCleanOwnedSynthesisClaim(claim));
  const uncertainClaims = input.claims.length - cleanClaims.length;
  const sourceContextPresent = input.source_context.trim().length > 0;
  const markerTotal = input.counters.fallacy + input.counters.bias + input.counters.rhetoric;
  const badFaithCount = verdicts.filter((verdict) => verdict.faith_grade === "bad_faith").length;
  const goodFaithCount = verdicts.filter((verdict) => verdict.faith_grade === "good_faith").length;
  const mixedFaithCount = verdicts.filter((verdict) => verdict.faith_grade === "mixed").length;
  const decidedFaith = badFaithCount + goodFaithCount + mixedFaithCount;
  const scope = input.analysis_scope?.mode ?? "live_window";
  const scopeLabel = scope === "full_session" ? "the full session" : "the current live window";

  const posture: SynthesisMetaRead["posture"] =
    cleanClaims.length < 2 && markerTotal < 2
      ? "insufficient"
      : badFaithCount >= 2 || (badFaithCount >= 1 && badFaithCount > goodFaithCount && markerTotal >= 2)
        ? "bad_faith_risk"
        : decidedFaith > 0 && goodFaithCount > badFaithCount && mixedFaithCount === 0
          ? "good_faith"
          : "mixed";

  const sourceHealth: SynthesisMetaRead["source_health"] =
    !sourceContextPresent && cleanClaims.length === 0
      ? "unknown"
      : !sourceContextPresent || cleanClaims.length < 2
        ? "thin"
        : uncertainClaims > 0 || input.counters.partial > 0
          ? "mixed"
          : "strong";

  return {
    posture,
    source_health: sourceHealth,
    scope,
    summary: metaSummary(posture, scopeLabel, cleanClaims.length, markerTotal),
    uncertainty: metaUncertainty(uncertainClaims, sourceContextPresent, input.counters.partial),
    key_question: metaKeyQuestion(input, cleanClaims.length, markerTotal),
  };
}

export function assessSynthesisMetaReadQuality(
  metaRead: SynthesisMetaRead,
  input: SynthesisMetaReadInput,
  verdicts: SpeakerVerdict[] = [],
): SynthesisMetaReadQualityAssessment {
  const expectedMetaRead = buildSynthesisMetaRead(input, verdicts);
  const evidence = metaReadEvidenceDepth(input);
  const mismatches: SynthesisMetaReadQualityAssessment["mismatches"] = [];

  if (metaRead.posture !== expectedMetaRead.posture) {
    mismatches.push({
      field: "posture",
      expected: expectedMetaRead.posture,
      actual: metaRead.posture,
      reason: "Conversation posture does not match the clean-claim, marker, and speaker-verdict evidence depth.",
    });
  }

  if (metaRead.source_health !== expectedMetaRead.source_health) {
    mismatches.push({
      field: "source_health",
      expected: expectedMetaRead.source_health,
      actual: metaRead.source_health,
      reason: "Source health does not match available source context, clean ownership, and partial evidence.",
    });
  }

  if (metaRead.scope !== expectedMetaRead.scope) {
    mismatches.push({
      field: "scope",
      expected: expectedMetaRead.scope,
      actual: metaRead.scope,
      reason: "Meta-read scope must mirror the request analysis scope.",
    });
  }

  for (const missing of missingUncertaintyCues(metaRead.uncertainty, evidence)) {
    mismatches.push({
      field: "uncertainty",
      expected: missing.expected,
      actual: metaRead.uncertainty,
      reason: missing.reason,
    });
  }

  const score = Math.max(0, 100 - mismatches.reduce((total, mismatch) => {
    if (mismatch.field === "posture") return total + 35;
    if (mismatch.field === "source_health") return total + 30;
    if (mismatch.field === "scope") return total + 20;
    return total + 15;
  }, 0));

  return {
    ok: mismatches.length === 0,
    score,
    expected: {
      posture: expectedMetaRead.posture,
      source_health: expectedMetaRead.source_health,
      scope: expectedMetaRead.scope,
    },
    actual: {
      posture: metaRead.posture,
      source_health: metaRead.source_health,
      scope: metaRead.scope,
    },
    evidence_depth: evidence,
    mismatches,
  };
}

function sanitizePosture(
  posture: SynthesisMetaRead["posture"],
  expectedPosture: SynthesisMetaRead["posture"],
): SynthesisMetaRead["posture"] {
  if (expectedPosture === "insufficient" && posture !== "insufficient") return "insufficient";
  if (expectedPosture === "mixed" && (posture === "good_faith" || posture === "bad_faith_risk")) return "mixed";
  if (expectedPosture === "good_faith" && posture === "bad_faith_risk") return "mixed";
  if (expectedPosture === "bad_faith_risk" && posture === "good_faith") return "mixed";
  return posture;
}

function sanitizeSourceHealth(
  sourceHealth: SynthesisMetaRead["source_health"],
  expectedSourceHealth: SynthesisMetaRead["source_health"],
): SynthesisMetaRead["source_health"] {
  if (SOURCE_HEALTH_RANK[sourceHealth] > SOURCE_HEALTH_RANK[expectedSourceHealth]) {
    return expectedSourceHealth;
  }
  return sourceHealth;
}

function metaReadEvidenceDepth(input: SynthesisMetaReadInput): SynthesisMetaReadQualityAssessment["evidence_depth"] {
  const cleanClaims = input.claims.filter((claim) => isCleanOwnedSynthesisClaim(claim));
  return {
    clean_claims: cleanClaims.length,
    uncertain_claims: input.claims.length - cleanClaims.length,
    marker_total: input.counters.fallacy + input.counters.bias + input.counters.rhetoric,
    partial_claims: input.counters.partial,
    source_context_present: input.source_context.trim().length > 0,
    scope: input.analysis_scope?.mode ?? "live_window",
  };
}

function missingUncertaintyCues(
  uncertainty: string,
  evidence: SynthesisMetaReadQualityAssessment["evidence_depth"],
): Array<{ expected: string; reason: string }> {
  const lower = uncertainty.toLowerCase();
  const missing = [];

  if (evidence.uncertain_claims > 0 && !/(uncertain|ownership|stance|attribution|speaker)/.test(lower)) {
    missing.push({
      expected: "uncertainty should name ownership, stance, or attribution uncertainty",
      reason: "The request includes claims that are not clean owned assertions.",
    });
  }

  if (!evidence.source_context_present && !/(source|evidence|context)/.test(lower)) {
    missing.push({
      expected: "uncertainty should name missing source context",
      reason: "The meta-read lacks source context but does not warn about it.",
    });
  }

  if (evidence.partial_claims > 0 && !/(partial|qualified|incomplete|mixed)/.test(lower)) {
    missing.push({
      expected: "uncertainty should name partial or qualified evidence",
      reason: "The request includes partial claims but the uncertainty sentence does not surface that limitation.",
    });
  }

  return missing;
}

function metaSummary(
  posture: SynthesisMetaRead["posture"],
  scopeLabel: string,
  cleanClaimCount: number,
  markerTotal: number,
): string {
  switch (posture) {
    case "good_faith":
      return `Across ${scopeLabel}, the read is mostly topic-engaged, with ${cleanClaimCount} clean owned claims and limited rhetorical pressure.`;
    case "bad_faith_risk":
      return `Across ${scopeLabel}, Yentl sees a pattern of rhetorical pressure or weakly supported moves that deserves closer review.`;
    case "mixed":
      return `Across ${scopeLabel}, the conversation is mixed: ${cleanClaimCount} clean owned claims and ${markerTotal} markers point in different directions.`;
    case "insufficient":
      return `Across ${scopeLabel}, Yentl does not yet have enough clean evidence for a confident conversation-level read.`;
  }
}

function metaUncertainty(uncertainClaims: number, hasSourceContext: boolean, partialCount: number): string {
  const parts = [];
  if (uncertainClaims > 0) parts.push(`${uncertainClaims} claims have uncertain ownership or stance`);
  if (!hasSourceContext) parts.push("source context is thin");
  if (partialCount > 0) parts.push(`${partialCount} claims are partial or qualified`);
  if (parts.length === 0) return "Main uncertainty is whether later context changes the current read.";
  return `Main uncertainty: ${parts.join("; ")}.`;
}

function metaKeyQuestion(
  input: SynthesisMetaReadInput,
  cleanClaimCount: number,
  markerTotal: number,
): string {
  if (cleanClaimCount === 0) return "Which statement should be treated as the first clean owned claim?";
  if (input.counters.false > 0) return "Which contradicted claim has the clearest source trail?";
  if (markerTotal > 0) return "Which rhetoric marker changes the reader's interpretation most?";
  return "Which source-backed claim best represents the conversation's center of gravity?";
}

function clampSentence(value: string, fallback: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean || fallback;
}
