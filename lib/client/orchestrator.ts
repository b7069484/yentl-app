"use client";
import { ulid } from "ulid";
import { useSession } from "./session-store";
import { hashClaim, RecentSet } from "@/lib/dedup";
import type { ClaimCard, TranscriptSegment } from "@/lib/types";

const recentClaimHashes = new RecentSet(30);

type ExtractedClaim = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
};

export async function onFinalUtterance(segment: TranscriptSegment) {
  const { transcript } = useSession.getState();

  const cutoff = segment.start - 30;
  const ctx = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => s.text)
    .join(" ");

  let res: Response;
  try {
    res = await fetch("/api/extract-claims", {
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
  } catch (e) {
    console.error("extract-claims fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { claims } = (await res.json()) as { claims: ExtractedClaim[] };
  if (!Array.isArray(claims) || claims.length === 0) return;

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

    // Fire both verification passes in parallel. Provisional usually returns
    // first; confirmed wins on race conditions because it has citations.
    void verifyProvisional(card.id, c.claim_text);
    void verifyConfirmed(card.id, c.claim_text);
  }
}

async function verifyProvisional(id: string, claim_text: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-provisional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_text }),
    });
  } catch (e) {
    console.error("verify-provisional fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const data = await res.json();
  const current = useSession.getState().claims.find((c) => c.id === id);
  if (!current || current.status === "confirmed") return;
  useSession.getState().updateClaim(id, { ...data, status: "provisional" });
}

async function verifyConfirmed(id: string, claim_text: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-confirmed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_text }),
    });
  } catch (e) {
    console.error("verify-confirmed fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const data = await res.json();
  useSession.getState().updateClaim(id, { ...data, status: "confirmed" });
}

