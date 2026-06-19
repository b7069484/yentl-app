"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileQuestion, Loader2, Search } from "lucide-react";
import { ulid } from "ulid";
import { useRouter, useSearchParams } from "next/navigation";
import { claimContextForVerification } from "@/lib/client/analysis-context";
import { useSession } from "@/lib/client/session-store";
import { apiErrorMessage } from "@/lib/client/api-errors";
import { sessionPathHref } from "@/lib/client/session-route";
import type { ClaimCard } from "@/lib/types";

type VerifyPatch = Partial<
  Pick<ClaimCard, "primary_label" | "score" | "annotations" | "explanation" | "sources">
>;

type CheckingStage = "idle" | "initial" | "source";

const MAX_CLAIM_CHARS = 2_000;
const MAX_CONTEXT_CHARS = 6_000;
const VALIDATION_CLAIM_TEXT = "City spending rose by twelve percent this year without raising taxes.";
const VALIDATION_CONTEXT_TEXT =
  "Yentl document validation brief: the source trail says the exact budget summary, baseline year, and tax record still need to be named.";
const AMBIGUOUS_REFERENCE_RE =
  /\b(he|she|they|them|him|her|his|hers|their|theirs|it|this|that|these|those|someone|somebody)\b/i;
const RELATIVE_TIME_RE =
  /\b(today|yesterday|tomorrow|recently|last night|last week|last month|last year|this morning|this week|this month|this year)\b/i;

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeClaimText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function contextRequiredMessage(claim: string, context: string) {
  if (context.trim()) return null;
  if (AMBIGUOUS_REFERENCE_RE.test(claim)) {
    return "Add context before checking: who or what does this refer to?";
  }
  if (RELATIVE_TIME_RE.test(claim)) {
    return "Add context before checking: give the date, place, source, or event this time reference depends on.";
  }
  return null;
}

function quickCheckInitialText(claim: string, context: string) {
  return [
    `Claim:\n${claim}`,
    context ? `Context:\n${context}` : "",
  ].filter(Boolean).join("\n\n");
}

export function ClaimQuickCheckPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setSource = useSession((s) => s.setSource);
  const startSession = useSession((s) => s.startSession);
  const startedAt = useSession((s) => s.startedAt);
  const claims = useSession((s) => s.claims);
  const addClaim = useSession((s) => s.addClaim);
  const updateClaim = useSession((s) => s.updateClaim);

  const [claimText, setClaimText] = useState("");
  const [contextText, setContextText] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [checkingStage, setCheckingStage] = useState<CheckingStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const trimmedClaim = claimText.trim();
  const trimmedContext = contextText.trim();
  const duplicateClaim = useMemo(() => {
    const normalized = normalizeClaimText(trimmedClaim);
    if (!normalized) return null;
    return claims.find((claim) => normalizeClaimText(claim.claim_text) === normalized) ?? null;
  }, [claims, trimmedClaim]);
  const claimTooLong = claimText.length > MAX_CLAIM_CHARS;
  const contextTooLong = contextText.length > MAX_CONTEXT_CHARS;
  const canCheck = trimmedClaim.length > 0 && !duplicateClaim && !claimTooLong && !contextTooLong && !isChecking;
  const claimCharacterCount = useMemo(() => claimText.length, [claimText]);
  const checkingLabel =
    checkingStage === "source" ? "Searching sources" : "Checking claim";
  const mobileSheetStatus = useMemo(() => {
    if (duplicateClaim) return "Existing result ready";
    if (isChecking) {
      return checkingStage === "source" ? "Searching source evidence" : "Building first read";
    }
    if (claimTooLong || contextTooLong || error) return "Needs attention";
    if (!trimmedClaim) return "Add a factual claim";
    if (canCheck) return "Ready to check";
    return "Almost ready";
  }, [
    canCheck,
    checkingStage,
    claimTooLong,
    contextTooLong,
    duplicateClaim,
    error,
    isChecking,
    trimmedClaim,
  ]);

  const handleBack = useCallback(() => {
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const handleLoadValidationClaim = useCallback(() => {
    setError(null);
    setClaimText(VALIDATION_CLAIM_TEXT);
    setContextText(VALIDATION_CONTEXT_TEXT);
  }, []);

  const openDuplicateResult = useCallback(() => {
    if (!duplicateClaim) return;
    router.push(sessionPathHref(searchParams, `/session/detail/claim/${duplicateClaim.id}`));
  }, [duplicateClaim, router, searchParams]);

  const handleCheck = useCallback(async () => {
    if (duplicateClaim) {
      openDuplicateResult();
      return;
    }
    if (!canCheck) return;
    if (wordCount(trimmedClaim) < 3) {
      setError("Write a complete factual claim, not just a topic or keyword.");
      return;
    }
    const contextMessage = contextRequiredMessage(trimmedClaim, trimmedContext);
    if (contextMessage) {
      setError(contextMessage);
      return;
    }

    setIsChecking(true);
    setCheckingStage("initial");
    setError(null);

    const id = ulid();
    const claim: ClaimCard = {
      id,
      claim_text: trimmedClaim,
      utterance_start: 0,
      utterance_end: 0,
      speaker_id: null,
      topic: "Quick check",
      topic_secondary: null,
      primary_label: "UNVERIFIABLE",
      score: 0,
      annotations: [],
      explanation: "",
      status: "checking",
      sources: [],
      stance: "asserted",
      ownership: {
        owner_speaker_id: null,
        attribution_status: "not_available",
        attribution_reasons: ["manual_user_action"],
        stance: "asserted",
        confidence: 1,
        source_turn_ids: [],
        source_segment_ids: [],
      },
      ...(trimmedContext ? { source_context: trimmedContext } : {}),
    };

    if (!startedAt) {
      const initialText = quickCheckInitialText(trimmedClaim, trimmedContext);
      setSource({
        kind: "text_doc",
        filename: "Claim quick check",
        mime: "text/plain",
        byte_count: initialText.length,
        intent: "claim_only",
        initial_text: initialText,
      });
      startSession(`Claim check: ${trimmedClaim.slice(0, 80)}`);
    }
    addClaim(claim);

    const body = JSON.stringify({
      claim_text: trimmedClaim,
      ...(trimmedContext ? { source_context: trimmedContext } : {}),
      claim_context: claimContextForVerification(claim),
    });

    try {
      const provisional = await fetch("/api/verify-provisional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!provisional.ok) {
        throw new Error(await apiErrorMessage(
          provisional,
          "Yentl could not check that claim. Tighten the wording and try again.",
        ));
      }

      const provisionalPatch = (await provisional.json()) as VerifyPatch;
      updateClaim(id, { ...provisionalPatch, status: "provisional" });
      setCheckingStage("source");

      const confirmed = await fetch("/api/verify-confirmed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (confirmed.ok) {
        const confirmedPatch = (await confirmed.json()) as VerifyPatch;
        updateClaim(id, { ...confirmedPatch, status: "confirmed" });
      } else {
        updateClaim(id, {
          status: "provisional",
          explanation: await apiErrorMessage(
            confirmed,
            "Confirmed verification is temporarily unavailable. Showing the provisional read.",
          ),
        });
      }

      router.push(sessionPathHref(searchParams, `/session/detail/claim/${id}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Yentl could not check that claim.";
      setError(message);
      updateClaim(id, {
        status: "provisional",
        primary_label: "UNVERIFIABLE",
        score: 0,
        annotations: ["Verification interrupted"],
        explanation: message,
        sources: [],
      });
      router.push(sessionPathHref(searchParams, `/session/detail/claim/${id}`));
    } finally {
      setIsChecking(false);
      setCheckingStage("idle");
    }
  }, [
    addClaim,
    canCheck,
    duplicateClaim,
    openDuplicateResult,
    router,
    searchParams,
    setSource,
    startSession,
    startedAt,
    trimmedClaim,
    trimmedContext,
    updateClaim,
  ]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-32 pt-6 sm:px-6 sm:pb-12 md:px-8">
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-cream-2 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-soft px-3 py-1 text-[11px] font-semibold text-teal">
            <FileQuestion className="h-3.5 w-3.5" aria-hidden />
            Quick claim check
          </div>

          <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-ink sm:text-[34px]">
            Check one specific claim
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
            Use this when you already know the claim you want checked. Add context only to
            clarify who, where, or what the claim is about.
          </p>

          <label className="mt-6 block">
            <span className="text-[13px] font-semibold text-ink">Claim</span>
            <textarea
              value={claimText}
              onChange={(e) => {
                setError(null);
                setClaimText(e.target.value);
              }}
              maxLength={MAX_CLAIM_CHARS + 200}
              placeholder="Example: The city approved a $42 million school repair bond in 2024."
              className="mt-2 min-h-[128px] w-full resize-y rounded-lg border border-line bg-cream p-3 text-[14px] leading-relaxed text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-teal/40"
              disabled={isChecking}
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[13px] font-semibold text-ink">
              Optional context or source note
            </span>
            <textarea
              value={contextText}
              onChange={(e) => {
                setError(null);
                setContextText(e.target.value);
              }}
              maxLength={MAX_CONTEXT_CHARS + 200}
              placeholder="Who said it? Where did you hear it? Is there a source page or document name Yentl should use only for disambiguation?"
              className="mt-2 min-h-[104px] w-full resize-y rounded-lg border border-line bg-cream p-3 text-[13px] leading-relaxed text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-teal/40"
              disabled={isChecking}
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-ink-4">
            <span>{claimCharacterCount.toLocaleString()} / {MAX_CLAIM_CHARS.toLocaleString()} characters</span>
            <span>Context is for disambiguation, not automatic evidence.</span>
          </div>

          {validationDemoEnabled() && !isChecking && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLoadValidationClaim}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-teal/25 bg-teal-soft px-3 text-[12.5px] font-semibold text-teal transition-colors hover:bg-teal/10"
              >
                <FileQuestion className="h-4 w-4" aria-hidden />
                Load validation claim
              </button>
            </div>
          )}

          {(claimTooLong || contextTooLong || error) && (
            <div role="alert" className="mt-4 rounded-lg border border-red-soft bg-red-soft/40 px-3 py-2 text-[13px] text-red">
              {claimTooLong
                ? "The claim is too long. Keep it under 2,000 characters."
                : contextTooLong
                  ? "The context is too long. Keep it under 6,000 characters."
                  : error}
            </div>
          )}

          {duplicateClaim && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-teal/20 bg-teal-soft px-3 py-3 text-[13px] leading-relaxed text-teal"
            >
              <div className="font-semibold text-ink-2">Already checked in this session.</div>
              <div className="mt-1 text-ink-3">
                Open the existing result instead of creating a duplicate card.
              </div>
              <button
                type="button"
                onClick={openDuplicateResult}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-teal/30 bg-paper px-3 text-[12px] font-medium text-teal transition-colors hover:bg-cream"
              >
                Open existing result
              </button>
            </div>
          )}

          {isChecking && (
            <div
              role="status"
              aria-live="polite"
              data-testid="quick-check-progress"
              className="mt-4 rounded-lg border border-line bg-cream px-3 py-3 text-[13px] leading-relaxed text-ink-3"
            >
              <div className="font-semibold text-ink-2">
                {checkingStage === "source" ? "Searching source evidence" : "Building first read"}
              </div>
              <div className="mt-2 grid gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full bg-teal"
                  />
                  <span>Initial read {checkingStage === "initial" ? "in progress" : "ready"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`h-2 w-2 rounded-full ${
                      checkingStage === "source" ? "bg-teal" : "bg-line"
                    }`}
                  />
                  <span>
                    Source search {checkingStage === "source" ? "in progress" : "waiting"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleCheck}
            disabled={!canCheck}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal px-5 py-3 text-[14px] font-medium text-white shadow-md transition-colors hover:bg-teal-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {isChecking ? checkingLabel : "Check claim"}
          </button>
        </section>

        <aside className="grid gap-3">
          <section className="rounded-lg border border-line bg-cream p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Good quick checks
            </div>
            <ul className="grid gap-2 text-[12.5px] leading-relaxed text-ink-3">
              <li>A factual sentence with names, dates, numbers, or places.</li>
              <li>A quote or statistic that can be compared against sources.</li>
              <li>Enough context to distinguish one person, place, or event from another.</li>
            </ul>
          </section>

          <section className="rounded-lg border border-amber-2/20 bg-amber-soft p-4 text-[12.5px] leading-relaxed text-ink-3">
            Quick checks are not a substitute for reviewing a whole source. Use text,
            file, YouTube, media URL, mic, or current-tab capture when the surrounding
            source matters.
          </section>
        </aside>
      </div>

      <div
        data-testid="mobile-quick-check-sheet"
        aria-live="polite"
        className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-line bg-paper/95 p-3 shadow-xl backdrop-blur sm:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-4">
              Quick check
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-ink-2">
              {mobileSheetStatus}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-4">
              {claimCharacterCount.toLocaleString()} / {MAX_CLAIM_CHARS.toLocaleString()} characters
            </div>
          </div>
          <button
            type="button"
            onClick={duplicateClaim ? openDuplicateResult : handleCheck}
            disabled={!duplicateClaim && !canCheck}
            aria-label={
              duplicateClaim
                ? "Open existing quick-check result from mobile sheet"
                : "Check claim from mobile action sheet"
            }
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal px-4 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-teal-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {duplicateClaim ? "Open result" : isChecking ? checkingLabel : "Check"}
          </button>
        </div>
      </div>
    </div>
  );
}

function validationDemoEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.NEXT_PUBLIC_YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}
