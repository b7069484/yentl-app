import type { Source, Stance } from "@/lib/types";

type ToolResult = { toolName: string; result?: unknown };
type Step = { toolResults?: ToolResult[] };
type Citation = { url: string; title?: string; snippet?: string };

/**
 * Walk the AI SDK v6 step list, extract web_search tool results, flatten into a
 * URL → Citation map. URL is the authoritative key — the LLM-emitted url field
 * MUST match exactly (we strip trailing slashes for tolerance, nothing more).
 *
 * Tool-result shape can vary slightly across web_search versions. We probe a
 * couple of common shapes and ignore unknowns rather than crash. If the
 * tool-result shape changes in a future @ai-sdk/anthropic release, this is the
 * function to update.
 */
export function extractCitations(steps: Step[]): Map<string, Citation> {
  const out = new Map<string, Citation>();
  for (const step of steps ?? []) {
    for (const tr of step.toolResults ?? []) {
      if (tr.toolName !== "web_search") continue;
      const result = tr.result as unknown;
      const items: unknown[] = Array.isArray(result)
        ? result
        : Array.isArray((result as { results?: unknown[] })?.results)
          ? (result as { results: unknown[] }).results
          : Array.isArray((result as { citations?: unknown[] })?.citations)
            ? (result as { citations: unknown[] }).citations
            : [];
      for (const raw of items) {
        const item = raw as { url?: string; title?: string; snippet?: string; description?: string };
        if (typeof item.url !== "string") continue;
        const norm = normalizeUrl(item.url);
        if (!norm) continue;
        if (!out.has(norm)) {
          out.set(norm, {
            url: item.url,
            title: item.title,
            snippet: item.snippet ?? item.description,
          });
        }
      }
    }
  }
  return out;
}

function normalizeUrl(u: string): string | null {
  try {
    const url = new URL(u);
    // Strip trailing slash on pathname only; preserve search + hash
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Combine LLM-emitted stance/excerpt with tool-authoritative URL/title.
 * Drops any stance_ref whose URL didn't appear in the tool results (the LLM
 * hallucinated it). Returns Source[] with url/domain/title/stance/excerpt set;
 * caller fills reputation_tier.
 */
export function mergeStanceWithCitations(
  steps: Step[],
  stanceRefs: Array<{ url: string; stance: Stance; excerpt: string }>,
): Array<Omit<Source, "reputation_tier" | "preview">> {
  const citations = extractCitations(steps);
  const out: Array<Omit<Source, "reputation_tier" | "preview">> = [];
  const seen = new Set<string>();
  for (const ref of stanceRefs ?? []) {
    const key = normalizeUrl(ref.url);
    if (!key || !citations.has(key) || seen.has(key)) continue;
    seen.add(key);
    const cit = citations.get(key)!;
    const domain = safeDomain(cit.url);
    out.push({
      url: cit.url,
      domain,
      title: cit.title ?? domain,
      stance: ref.stance,
      excerpt: ref.excerpt,
    });
  }
  return out;
}

function safeDomain(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
