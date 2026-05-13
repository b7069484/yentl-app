"use client";
import { ulid } from "ulid";
import { useSession } from "./session-store";
import { hashClaim, RecentSet } from "@/lib/dedup";
import { getEntry } from "@/lib/taxonomy";
import type {
  ClaimCard,
  RhetoricMarker,
  Source,
  SourcePreview,
  SpeakerId,
  TranscriptSegment,
} from "@/lib/types";

const recentClaimHashes = new RecentSet(30);
const recentMarkerHashes = new RecentSet(40);
let utteranceCounter = 0;
let lastRhetoricRunAt = 0;

type ExtractedClaim = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  topic: string;
};

export function attributeMarker(
  m: { start_time: number; end_time: number },
  transcript: TranscriptSegment[],
): SpeakerId | null {
  const overlapping = transcript.filter(
    (s) => s.end >= m.start_time && s.start <= m.end_time && s.speaker_id !== null,
  );
  if (overlapping.length === 0) return null;
  const ids = new Set(overlapping.map((s) => s.speaker_id as number));
  return ids.size === 1 ? (overlapping[0].speaker_id as number) : null;
}

export async function onFinalUtterance(segment: TranscriptSegment) {
  maybeRunRhetoric();

  const { transcript } = useSession.getState();

  const cutoff = segment.start - 30;
  // Committee amendment (Linguist): thread speaker labels into CONTEXT so the
  // model can distinguish first-person assertion from reported speech.
  const ctx = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => s.speaker_id !== null ? `[Speaker ${s.speaker_id}] ${s.text}` : s.text)
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
      speaker_id: segment.speaker_id,
      topic: c.topic ?? "Other",
      primary_label: "UNVERIFIABLE",   // overridden once verify-provisional or verify-confirmed lands
      score: 0,
      annotations: [],
      explanation: "",
      status: "checking",
      sources: [],
    };
    useSession.getState().addClaim(card);

    void verifyProvisional(card.id, c.claim_text);
    void verifyConfirmed(card.id, c.claim_text);
  }
}

export function maybeRunRhetoric() {
  utteranceCounter += 1;
  const now = Date.now();
  const timeSince = now - lastRhetoricRunAt;
  if (utteranceCounter % 5 === 0 || timeSince > 30_000) {
    lastRhetoricRunAt = now;
    void runRhetoric();
  }
}

async function runRhetoric() {
  const { transcript } = useSession.getState();
  if (transcript.length === 0) return;

  const last = transcript[transcript.length - 1];
  const cutoff = last.end - 60;
  const win = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => `[${Math.floor(s.start)}s] ${s.text}`)
    .join("\n");

  let res: Response;
  try {
    res = await fetch("/api/analyze-rhetoric", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript_window: win,
        recent_hashes: recentMarkerHashes.toArray(),
      }),
    });
  } catch (e) {
    console.error("analyze-rhetoric fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { markers } = (await res.json()) as {
    markers: Array<Omit<RhetoricMarker, "id" | "speaker_id">>;
  };
  if (!Array.isArray(markers) || markers.length === 0) return;

  const currentTranscript = useSession.getState().transcript;

  for (const m of markers) {
    // Validate against taxonomy — drop unknowns, auto-correct mismatched type/display
    const entry = getEntry(m.name);
    if (!entry) continue;
    const correctedType = entry.type;
    const correctedDisplay = entry.display;

    // Dedup key: (type, excerpt) — see spec §6.4
    const h = hashClaim(`${correctedType}::${m.excerpt}`);
    if (recentMarkerHashes.has(h)) continue;
    recentMarkerHashes.add(h);

    const speakerId = attributeMarker(
      { start_time: m.start_time, end_time: m.end_time },
      currentTranscript,
    );

    useSession.getState().addMarker({
      ...m,
      type: correctedType,
      display: correctedDisplay,
      speaker_id: speakerId,
      id: ulid(),
    });
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
  const data = (await res.json()) as Omit<ClaimCard, "id" | "claim_text" | "utterance_start" | "utterance_end" | "speaker_id" | "topic" | "status">;
  useSession.getState().updateClaim(id, { ...data, status: "confirmed" });

  // Fire OG-preview fetches in the background; they'll patch each Source.preview when they land.
  if (Array.isArray(data.sources) && data.sources.length > 0) {
    void fetchAndApplyPreviews(id, data.sources);
  }
}

async function fetchAndApplyPreviews(claimId: string, sources: Source[]) {
  const urls = sources.map((s) => s.url);
  let res: Response;
  try {
    res = await fetch("/api/source-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
  } catch (e) {
    console.error("source-preview fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { previews } = (await res.json()) as {
    previews: Record<string, SourcePreview | null>;
  };
  const current = useSession.getState().claims.find((c) => c.id === claimId);
  if (!current) return;
  const patched = current.sources.map((s) => {
    const p = previews[s.url];
    return p ? { ...s, preview: p } : s;
  });
  useSession.getState().updateClaim(claimId, { sources: patched });
}
