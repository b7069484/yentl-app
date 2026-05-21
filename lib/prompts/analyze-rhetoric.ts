import { z } from "zod";
import { ALL, type TaxonomyEntry } from "@/lib/taxonomy";

export const MarkerSchema = z.object({
  type: z.enum(["fallacy", "bias", "rhetoric"]),
  name: z.string(),
  display: z.string(),
  excerpt: z.string().min(2),
  start_time: z.number(),
  end_time: z.number(),
  severity: z.enum(["subtle", "clear", "blatant"]),
  explanation: z.string().min(1).max(400),
});

export const AnalyzeRhetoricResponse = z.object({
  markers: z.array(MarkerSchema),
});

export function taxonomyHints(): string {
  return ALL.map((e: TaxonomyEntry) => {
    const def = e.definition ? ` — ${e.definition}` : "";
    return `${e.canonical_id} [${e.type}] "${e.display}"${def}`;
  }).join("\n");
}

export const SYSTEM_PREFIX = `You analyze a transcript window for cognitive biases, logical
fallacies, and rhetorical patterns.

You may ONLY use names from the TAXONOMY below. Match by canonical_id (the
"name" field). Use the entry's "display" for the human label.

For each marker:
- Quote a VERBATIM excerpt from the transcript (max 25 words).
- Estimate start_time and end_time (seconds) from the transcript timestamps.
- Choose severity by detectability (lay listener test):
  - "blatant": an untrained listener would notice something is off
  - "clear": a typical listener notices on reflection
  - "subtle": even a trained analyst might miss on first pass
- Explain in 1-3 sentences what makes it that marker.

Do NOT return any marker whose hash is in RECENT_HASHES — those are already known.

If the window has none of the above, return { "markers": [] }.

SOURCE CONTEXT:
- The prompt may include page title, channel, author, username, canonical URL, or detected names. Use this only to understand who/what the transcript is likely about.
- Do not create markers from source metadata alone. Markers must still quote the transcript.

TAXONOMY:
${taxonomyHints()}`;

export function userPrompt(args: {
  transcript_window: string;
  recent_hashes: string[];
  source_context?: string;
}): string {
  const sourceContext = args.source_context?.trim()
    ? `SOURCE_CONTEXT:\n${args.source_context.trim()}\n\n`
    : "";

  return `${sourceContext}TRANSCRIPT_WINDOW:
${args.transcript_window}

RECENT_HASHES:
${args.recent_hashes.join("\n") || "(none)"}`;
}
