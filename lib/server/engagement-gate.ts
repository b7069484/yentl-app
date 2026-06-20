import { NextResponse } from "next/server";
import { Output } from "ai";
import {
  ClaimScopeResponse,
  SYSTEM as CLAIM_SCOPE_SYSTEM,
  userPrompt as claimScopePrompt,
} from "@/lib/prompts/claim-scope";
import { aiGenerateText as generateText } from "@/lib/server/ai-call";
import { opus } from "@/lib/server/anthropic";
import { emitSecurityEvent, recordSecurityEvent, routeForRequest } from "@/lib/server/security-events";

type GateDecision = "engage" | "engage_cautiously" | "decline" | "refuse";

type GateResult = {
  decision: GateDecision;
  code?: "CLAIM_SCOPE_DECLINED" | "CLAIM_SCOPE_REFUSED" | "CLAIM_SCOPE_UNAVAILABLE";
  status?: number;
  message?: string;
  reason?: string;
  category?: ClaimScopeResponse["category"];
  classifier?: "deterministic" | "model" | "model_unavailable";
};

const PRIVATE_INFO_PATTERNS = [
  /\b(home address|personal address|private address|phone number|cell number|private email)\b/i,
  /\b(dox|doxx|doxxing|social security number|ssn)\b/i,
  /\bwhere does .+ live\b/i,
];

const NON_FACTUAL_PATTERNS = [
  /^\s*(i think|i feel|i believe|in my opinion)\b/i,
  /\b(is beautiful|is boring|is funny|is awful|is the best|is the worst)\b/i,
];

export function evaluateEngagementGate(claimText: string): GateResult {
  const text = claimText.trim();

  if (PRIVATE_INFO_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      decision: "refuse",
      code: "CLAIM_SCOPE_REFUSED",
      message: "Yentl cannot help identify or expose private personal information.",
      status: 403,
      category: "private_personal_information",
      classifier: "deterministic",
    };
  }

  if (NON_FACTUAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      decision: "decline",
      code: "CLAIM_SCOPE_DECLINED",
      message: "Yentl checks factual claims; this looks like opinion or preference.",
      status: 422,
      category: "opinion_or_preference",
      classifier: "deterministic",
    };
  }

  return { decision: "engage", classifier: "deterministic" };
}

function shouldUseModelClassifier(): boolean {
  const mode = process.env.YENTL_CLAIM_SCOPE_CLASSIFIER?.toLowerCase();
  if (mode === "model") return true;
  if (mode === "deterministic" || mode === "off" || mode === "false") return false;
  return process.env.NODE_ENV === "production";
}

function resultFromModel(output: ClaimScopeResponse): GateResult {
  if (output.decision === "refuse") {
    return {
      decision: "refuse",
      code: "CLAIM_SCOPE_REFUSED",
      status: 403,
      message: "Yentl cannot help check that kind of claim.",
      category: output.category,
      classifier: "model",
    };
  }

  if (output.decision === "decline") {
    return {
      decision: "decline",
      code: "CLAIM_SCOPE_DECLINED",
      status: 422,
      message: "Yentl checks factual claims; this looks outside that scope.",
      category: output.category,
      classifier: "model",
    };
  }

  return {
    decision: output.decision,
    category: output.category,
    message: output.reason,
    classifier: "model",
  };
}

export async function classifyEngagementGate(
  claimText: string,
  sourceContext?: string,
): Promise<GateResult> {
  const deterministic = evaluateEngagementGate(claimText);
  if (deterministic.decision !== "engage" || !shouldUseModelClassifier()) {
    return deterministic;
  }

  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: ClaimScopeResponse }),
      system: CLAIM_SCOPE_SYSTEM,
      prompt: claimScopePrompt({ claimText, sourceContext }),
    });
    return resultFromModel(output);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      decision: "engage_cautiously",
      message:
        "Yentl could not complete the claim-scope safety classifier, so this claim is proceeding after deterministic hard-block checks only.",
      category: "needs_context",
      classifier: "model_unavailable",
      // Deliberate fail-soft mode: deterministic private-info/opinion blocks above still hold.
      reason,
    };
  }
}

export async function enforceEngagementGate(
  claimText: string,
  request?: Request,
  sourceContext?: string,
): Promise<NextResponse | null> {
  const result = await classifyEngagementGate(claimText, sourceContext);
  if (result.decision === "engage") return null;

  const route = request ? routeForRequest(request) : "unknown";

  if (result.decision === "engage_cautiously") {
    const fields = {
      route,
      category: result.category,
      classifier: result.classifier,
      reason: result.reason?.slice(0, 180),
    };
    if (result.classifier === "model_unavailable") {
      await recordSecurityEvent("claim_scope_classifier_unavailable", fields, "error");
    } else {
      emitSecurityEvent("claim_scope_engage_cautiously", fields, "info");
    }
    return null;
  }

  if (result.code === "CLAIM_SCOPE_UNAVAILABLE") {
    emitSecurityEvent("claim_scope_classifier_unavailable", {
      route,
      category: result.category,
      classifier: result.classifier,
      reason: result.reason?.slice(0, 180),
    }, "error");
  } else {
    emitSecurityEvent(
      result.decision === "refuse" ? "claim_scope_refused" : "claim_scope_declined",
      {
        route,
        category: result.category,
        classifier: result.classifier,
      },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: result.code,
        message: result.message,
      },
    },
    { status: result.status ?? (result.decision === "refuse" ? 403 : 422) },
  );
}
