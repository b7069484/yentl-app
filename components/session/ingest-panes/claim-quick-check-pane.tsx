"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileQuestion, Loader2, Search } from "lucide-react";
import { ulid } from "ulid";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { apiErrorMessage } from "@/lib/client/api-errors";
import type { ClaimCard } from "@/lib/types";

type VerifyPatch = Partial<
  Pick<ClaimCard, "primary_label" | "score" | "annotations" | "explanation" | "sources">
>;

const MAX_CLAIM_CHARS = 2_000;
const MAX_CONTEXT_CHARS = 6_000;

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function ClaimQuickCheckPane() {
  const router = useRouter();
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setSource = useSession((s) => s.setSource);
  const startSession = useSession((s) => s.startSession);
  const startedAt = useSession((s) => s.startedAt);
  const addClaim = useSession((s) => s.addClaim);
  const updateClaim = useSession((s) => s.updateClaim);

  const [claimText, setClaimText] = useState("");
  const [contextText, setContextText] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedClaim = claimText.trim();
  const trimmedContext = contextText.trim();
  const claimTooLong = claimText.length > MAX_CLAIM_CHARS;
  const contextTooLong = contextText.length > MAX_CONTEXT_CHARS;
  const canCheck = trimmedClaim.length > 0 && !claimTooLong && !contextTooLong && !isChecking;
  const claimCharacterCount = useMemo(() => claimText.length, [claimText]);

  const handleBack = useCallback(() => {
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const handleCheck = useCallback(async () => {
    if (!canCheck) return;
    if (wordCount(trimmedClaim) < 3) {
      setError("Write a complete factual claim, not just a topic or keyword.");
      return;
    }

    setIsChecking(true);
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
    };

    if (!startedAt) {
      setSource({
        kind: "text_doc",
        filename: "Claim quick check",
        mime: "text/plain",
        byte_count: trimmedClaim.length + trimmedContext.length,
        intent: "claim_only",
      });
      startSession(`Claim check: ${trimmedClaim.slice(0, 80)}`);
    }
    addClaim(claim);

    const body = JSON.stringify({
      claim_text: trimmedClaim,
      ...(trimmedContext ? { source_context: trimmedContext } : {}),
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

      router.push("/session?view=claims");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Yentl could not check that claim.";
      setError(message);
      updateClaim(id, {
        status: "provisional",
        explanation: message,
      });
    } finally {
      setIsChecking(false);
    }
  }, [
    addClaim,
    canCheck,
    router,
    setSource,
    startSession,
    startedAt,
    trimmedClaim,
    trimmedContext,
    updateClaim,
  ]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 md:px-8">
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors hover:text-ink-2"
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

          {(claimTooLong || contextTooLong || error) && (
            <div role="alert" className="mt-4 rounded-lg border border-red-soft bg-red-soft/40 px-3 py-2 text-[13px] text-red">
              {claimTooLong
                ? "The claim is too long. Keep it under 2,000 characters."
                : contextTooLong
                  ? "The context is too long. Keep it under 6,000 characters."
                  : error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheck}
            disabled={!canCheck}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal px-5 py-3 text-[14px] font-medium text-white shadow-md transition-colors hover:bg-teal-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {isChecking ? "Checking claim" : "Check claim"}
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
    </div>
  );
}
