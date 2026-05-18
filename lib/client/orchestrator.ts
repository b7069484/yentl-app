"use client";
import { ulid } from "ulid";
import { useSession } from "./session-store";
import { hashClaim, RecentSet } from "@/lib/dedup";
import type { ClaimCard, TranscriptSegment } from "@/lib/types";

// Per-tab claim-dedup ring. Sized at 30 — comfortably above the ~5
// claims/minute rate we'd expect from sustained speech.
const recentClaimHashes = new RecentSet(30);

// Called once per Deepgram is_final utterance. Fans out: extract → for each
// claim → fire provisional + confirmed verifications in parallel and patch
// the store as results return.
export async function onFinalUtterance(segment: TranscriptSegment) {
  const { transcript } = useSession.getState();

  // Last ~30s of finalized transcript as context for the extractor.
  const cutoff = segment.start - 30;
  const ctx = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => s.text)
    .join(" ");

  const res = await fetch("/api/extract-claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      utterance: segment.text,
      utterance_start: segment.start,
      utterance_end: segment.end,
      context: ctx,
      recent_hashes: recentClaimHashes.toArray(),
    }),
  });
  if (!res.ok) return;
  const { claims } = (await res.json()) as {
    claims: Array<{
      claim_text: string;
      utterance_start: number;
      utterance_end: number;
    }>;
  };

  for (const c of claims) {
    const h = hashClaim(c.claim_text);
    if (recentClaimHashes.has(h)) continue;
    recentClaimHashes.add(h);

    const card: ClaimCard = {
      id: ulid(),
      claim_text: c.claim_text,
      utterance_start: c.utterance_start,
      utterance_end: c.utterance_end,
      primary_label: "UNVERIFIABLE",
      score: 0,
      annotations: [],
      explanation: "",
      status: "checking",
      sources: [],
    };
    useSession.getState().addClaim(card);

    // Stage 1 fires immediately for a fast (~1s) verdict; Stage 2 runs in
    // parallel and overwrites when it returns (~5–10s) with citations.
    void verifyProvisional(card.id, c.claim_text);
    void verifyConfirmed(card.id, c.claim_text);
  }
}

async function verifyProvisional(id: string, claim_text: string) {
  const res = await fetch("/api/verify-provisional", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim_text }),
  });
  if (!res.ok) return;
  const data = await res.json();
  const current = useSession.getState().claims.find((c) => c.id === id);
  // If the confirmed pass beat us, don't downgrade the card.
  if (!current || current.status === "confirmed") return;
  useSession.getState().updateClaim(id, { ...data, status: "provisional" });
}

async function verifyConfirmed(id: string, claim_text: string) {
  const res = await fetch("/api/verify-confirmed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim_text }),
  });
  if (!res.ok) return;
  const data = await res.json();
  useSession.getState().updateClaim(id, { ...data, status: "confirmed" });
}
