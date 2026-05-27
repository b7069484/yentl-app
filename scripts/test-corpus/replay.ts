import { promises as fs } from "node:fs";
import path from "node:path";
import { SCORES_DIR, TRANSCRIPTS_DIR, readVideos, type VideoRow } from "./_shared.js";

type VerifyMode = "none" | "provisional" | "confirmed" | "both";

type Args = {
  baseUrl: string;
  onlyId: string | null;
  category: string | null;
  limit: number;
  maxUtterances: number;
  verify: VerifyMode;
  rhetoric: boolean;
};

type DeepgramWord = {
  speaker?: number;
  start?: number;
  end?: number;
  punctuated_word?: string;
  word?: string;
};

type DeepgramUtterance = {
  start?: number;
  end?: number;
  transcript?: string;
  speaker?: number;
  words?: DeepgramWord[];
};

type DeepgramTranscript = {
  results?: {
    utterances?: DeepgramUtterance[];
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: DeepgramWord[];
      }>;
    }>;
  };
};

type ReplayUtterance = {
  text: string;
  start: number;
  end: number;
  speaker_id: number | null;
};

type ExtractedClaim = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  topic: string;
  topic_secondary: string | null;
};

type ReplayedClaim = ExtractedClaim & {
  id: string;
  speaker_id: number | null;
  status: "extracted" | "provisional" | "confirmed" | "failed";
  provisional?: unknown;
  confirmed?: unknown;
  error?: string;
};

type ReplayedMarker = {
  id: string;
  type: string;
  name: string;
  display: string;
  excerpt: string;
  start_time: number;
  end_time: number;
  severity: string;
  explanation: string;
};

type ReplayResult = {
  id: string;
  title: string;
  category: string;
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  verify: VerifyMode;
  utterancesAvailable: number;
  utterancesReplayed: number;
  claims: ReplayedClaim[];
  markers: ReplayedMarker[];
  errors: Array<{ stage: string; message: string }>;
};

function parseArgs(argv: string[]): Args {
  const value = (name: string) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const verify = (value("--verify") ?? "provisional") as VerifyMode;
  if (!["none", "provisional", "confirmed", "both"].includes(verify)) {
    throw new Error("--verify must be one of none, provisional, confirmed, both");
  }
  return {
    baseUrl: value("--base-url") ?? "http://localhost:3000",
    onlyId: value("--id") ?? null,
    category: value("--category") ?? null,
    limit: Number(value("--limit") ?? "0"),
    maxUtterances: Number(value("--max-utterances") ?? "20"),
    verify,
    rhetoric: argv.includes("--no-rhetoric") ? false : true,
  };
}

function hashText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function recentArray(set: Set<string>, max: number): string[] {
  return [...set].slice(Math.max(0, set.size - max));
}

async function readTranscript(id: string): Promise<DeepgramTranscript | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(TRANSCRIPTS_DIR, `${id}.json`), "utf8")) as DeepgramTranscript;
  } catch {
    return null;
  }
}

function utterancesFromTranscript(transcript: DeepgramTranscript | null): ReplayUtterance[] {
  const utterances = transcript?.results?.utterances ?? [];
  if (utterances.length > 0) {
    return utterances
      .filter((utterance) => utterance.transcript && typeof utterance.start === "number" && typeof utterance.end === "number")
      .map((utterance) => ({
        text: utterance.transcript ?? "",
        start: utterance.start ?? 0,
        end: utterance.end ?? utterance.start ?? 0,
        speaker_id: typeof utterance.speaker === "number" ? utterance.speaker : null,
      }));
  }

  const alt = transcript?.results?.channels?.[0]?.alternatives?.[0];
  const words = alt?.words ?? [];
  if (words.length === 0 && alt?.transcript) {
    return [{ text: alt.transcript, start: 0, end: 0, speaker_id: null }];
  }

  const chunks: ReplayUtterance[] = [];
  let current: DeepgramWord[] = [];
  for (const word of words) {
    current.push(word);
    if (current.length >= 28 || /[.!?]$/.test(word.punctuated_word ?? word.word ?? "")) {
      chunks.push(wordsToUtterance(current));
      current = [];
    }
  }
  if (current.length > 0) chunks.push(wordsToUtterance(current));
  return chunks;
}

function wordsToUtterance(words: DeepgramWord[]): ReplayUtterance {
  const speakerCounts = new Map<number, number>();
  for (const word of words) {
    if (typeof word.speaker !== "number") continue;
    speakerCounts.set(word.speaker, (speakerCounts.get(word.speaker) ?? 0) + 1);
  }
  const dominant = [...speakerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    text: words.map((word) => word.punctuated_word ?? word.word ?? "").join(" ").trim(),
    start: words[0]?.start ?? 0,
    end: words.at(-1)?.end ?? words[0]?.start ?? 0,
    speaker_id: dominant,
  };
}

function contextFor(utterances: ReplayUtterance[], index: number): string {
  const latest = utterances[index];
  const cutoff = latest.start - 30;
  return utterances
    .slice(0, index + 1)
    .filter((utterance) => utterance.end >= cutoff)
    .map((utterance) => (
      utterance.speaker_id === null ? utterance.text : `[Speaker ${utterance.speaker_id}] ${utterance.text}`
    ))
    .join(" ");
}

function rhetoricWindow(utterances: ReplayUtterance[], index: number): string {
  const latest = utterances[index];
  const cutoff = latest.end - 60;
  return utterances
    .slice(0, index + 1)
    .filter((utterance) => utterance.end >= cutoff)
    .map((utterance) => `[${Math.floor(utterance.start)}s] ${utterance.text}`)
    .join("\n");
}

async function postJson<T>(baseUrl: string, route: string, body: unknown, timeoutMs: number): Promise<T> {
  const res = await fetch(new URL(route, baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${route} HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

async function verifyClaim(
  claim: ReplayedClaim,
  args: Args,
): Promise<ReplayedClaim> {
  if (args.verify === "none") return claim;
  const next: ReplayedClaim = { ...claim };

  if (args.verify === "provisional" || args.verify === "both") {
    try {
      next.provisional = await postJson(args.baseUrl, "/api/verify-provisional", { claim_text: claim.claim_text }, 60_000);
      next.status = "provisional";
    } catch (err) {
      next.status = "failed";
      next.error = (err as Error).message;
      return next;
    }
  }

  if (args.verify === "confirmed" || args.verify === "both") {
    try {
      next.confirmed = await postJson(args.baseUrl, "/api/verify-confirmed", { claim_text: claim.claim_text }, 120_000);
      next.status = "confirmed";
    } catch (err) {
      next.status = "failed";
      next.error = (err as Error).message;
    }
  }

  return next;
}

async function replayVideo(row: VideoRow, args: Args): Promise<ReplayResult> {
  const startedAt = new Date().toISOString();
  const transcript = await readTranscript(row.id);
  const utterances = utterancesFromTranscript(transcript);
  const selected = args.maxUtterances > 0 ? utterances.slice(0, args.maxUtterances) : utterances;
  const recentClaims = new Set<string>();
  const recentMarkers = new Set<string>();
  const claims: ReplayedClaim[] = [];
  const markers: ReplayedMarker[] = [];
  const errors: ReplayResult["errors"] = [];

  for (let index = 0; index < selected.length; index++) {
    const utterance = selected[index];
    try {
      const extracted = await postJson<{ claims: ExtractedClaim[] }>(
        args.baseUrl,
        "/api/extract-claims",
        {
          utterance: utterance.text,
          utterance_start: utterance.start,
          utterance_end: utterance.end,
          context: contextFor(selected, index),
          recent_hashes: recentArray(recentClaims, 30),
        },
        60_000,
      );

      for (const extractedClaim of extracted.claims ?? []) {
        const key = hashText(extractedClaim.claim_text);
        if (recentClaims.has(key)) continue;
        recentClaims.add(key);
        const replayed = await verifyClaim({
          ...extractedClaim,
          id: `${row.id}-claim-${claims.length + 1}`,
          speaker_id: utterance.speaker_id,
          status: "extracted",
        }, args);
        claims.push(replayed);
      }
    } catch (err) {
      errors.push({ stage: `extract:${index}`, message: (err as Error).message });
    }

    if (args.rhetoric && (index + 1) % 5 === 0) {
      try {
        const analyzed = await postJson<{ markers: Omit<ReplayedMarker, "id">[] }>(
          args.baseUrl,
          "/api/analyze-rhetoric",
          {
            transcript_window: rhetoricWindow(selected, index),
            recent_hashes: recentArray(recentMarkers, 40),
          },
          90_000,
        );
        for (const marker of analyzed.markers ?? []) {
          const key = hashText(`${marker.type}:${marker.excerpt}`);
          if (recentMarkers.has(key)) continue;
          recentMarkers.add(key);
          markers.push({ ...marker, id: `${row.id}-marker-${markers.length + 1}` });
        }
      } catch (err) {
        errors.push({ stage: `rhetoric:${index}`, message: (err as Error).message });
      }
    }
  }

  return {
    id: row.id,
    title: row.title_resolved,
    category: row.category,
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    verify: args.verify,
    utterancesAvailable: utterances.length,
    utterancesReplayed: selected.length,
    claims,
    markers,
    errors,
  };
}

function selectRows(rows: VideoRow[], args: Args): VideoRow[] {
  let selected = rows.filter((row) => row.verified === "TRUE");
  if (args.onlyId) selected = selected.filter((row) => row.id === args.onlyId);
  if (args.category) selected = selected.filter((row) => row.category === args.category);
  if (args.limit > 0) selected = selected.slice(0, args.limit);
  return selected;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(SCORES_DIR, { recursive: true });
  const rows = selectRows(await readVideos(), args);
  if (rows.length === 0) {
    throw new Error("No matching corpus rows");
  }

  console.log(`Replaying ${rows.length} video(s) against ${args.baseUrl}`);
  console.log(`maxUtterances=${args.maxUtterances} verify=${args.verify} rhetoric=${args.rhetoric}`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.id}... `);
    const result = await replayVideo(row, args);
    const outPath = path.join(SCORES_DIR, `${row.id}.replay.json`);
    await fs.writeFile(outPath, JSON.stringify(result, null, 2));
    console.log(`${result.claims.length} claims, ${result.markers.length} markers, ${result.errors.length} errors`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
