import type { Source, Stance } from "@/lib/types";

type ContentBlock = {
  type: string;
  // Legacy probe (older AI SDK shapes)
  toolName?: string;
  result?: unknown;
  // Web-search source blocks in @ai-sdk/anthropic v6 — one per cited URL.
  sourceType?: string;
  url?: string;
  title?: string;
};
type Step = {
  content?: ContentBlock[];
  // Legacy probe path.
  toolResults?: Array<{ toolName: string; result?: unknown }>;
};

type Citation = { url: string; title?: string };

/**
 * Walk the AI SDK v6 step list and collect authoritative web_search citations.
 *
 * Source-of-truth: each step exposes a `content` array; web_search citations
 * arrive as content blocks with `type: "source"`, `sourceType: "url"`, and a
 * `url` + `title` pair. We harvest them directly — URL/title cannot be
 * hallucinated by the LLM this way.
 *
 * For backwards compatibility we also probe the older
 * `step.toolResults[].result.{results|citations}` shape; it stays a no-op when
 * the new shape is present.
 */
export function extractCitations(steps: Step[]): Map<string, Citation> {
  const out = new Map<string, Citation>();
  for (const step of steps ?? []) {
    // Modern shape: source content blocks
    for (const block of step.content ?? []) {
      if (block.type !== "source") continue;
      if (typeof block.url !== "string") continue;
      const norm = normalizeUrl(block.url);
      if (!norm) continue;
      if (!out.has(norm)) {
        out.set(norm, { url: block.url, title: block.title });
      }
    }
    // Legacy shape: tool-result with embedded results array
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
        const item = raw as { url?: string; title?: string };
        if (typeof item.url !== "string") continue;
        const norm = normalizeUrl(item.url);
        if (!norm) continue;
        if (!out.has(norm)) {
          out.set(norm, { url: item.url, title: item.title });
        }
      }
    }
  }
  return out;
}

/**
 * Truncate JSON-bleed corruption in LLM-emitted URLs. When the model is in
 * Output.object() mode with tools, it occasionally inlines structured-output
 * delimiters into the url string itself — e.g.
 *   "https://example.com/path/','stance':'supports','excerpt':'..."
 * Real URLs never contain `'`, `"`, `,`, whitespace, or `}` outside of
 * percent-encoded form. Truncate at the first such character so a corrupted
 * url still matches its intended target via prefix lookup.
 */
function scrubUrl(u: string): string {
  // Take everything before the first illegal-in-real-URL byte.
  const cut = u.search(/['"\s},]|%27|%22/);
  return cut === -1 ? u : u.slice(0, cut);
}

function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(scrubUrl(raw));
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Build the final source list from authoritative citations + LLM stance.
 *
 * Strategy:
 *   1. Use the citation list (from web_search source blocks) as the canonical
 *      universe of sources. URL + title come from there.
 *   2. For each citation, look up the LLM's matching stance_ref by normalized
 *      URL — first via exact normalized match, then via "stance_ref url starts
 *      with citation url" (catches JSON-bleed-truncated stance refs).
 *   3. If no stance_ref matches, default the source's stance to "mixed" rather
 *      than dropping the citation. The user still sees a verified source link.
 */
export function mergeStanceWithCitations(
  steps: Step[],
  stanceRefs: Array<{ url: string; stance: Stance; excerpt: string }>,
): Array<Omit<Source, "reputation_tier" | "preview">> {
  const citations = extractCitations(steps);
  const refsByKey = new Map<string, { stance: Stance; excerpt: string }>();
  const refKeys: string[] = [];
  for (const ref of stanceRefs ?? []) {
    const key = normalizeUrl(ref.url);
    if (!key) continue;
    if (!refsByKey.has(key)) {
      refsByKey.set(key, { stance: ref.stance, excerpt: ref.excerpt });
      refKeys.push(key);
    }
  }

  const out: Array<Omit<Source, "reputation_tier" | "preview">> = [];
  const seen = new Set<string>();
  for (const [citKey, cit] of citations.entries()) {
    if (seen.has(citKey)) continue;
    seen.add(citKey);

    let matched = refsByKey.get(citKey);
    if (!matched) {
      // Tolerant fallback for harmless URL variants such as query/hash
      // differences. Do not broad-prefix match sibling paths, because that can
      // attach a stance for /article-10 to the citation /article-1.
      const looseKey = refKeys.find((rk) => safeLooseUrlMatch(rk, citKey));
      if (looseKey) matched = refsByKey.get(looseKey);
    }

    out.push({
      url: cit.url,
      domain: safeDomain(cit.url),
      title: cit.title ?? safeDomain(cit.url),
      stance: matched?.stance ?? "mixed",
      excerpt: matched?.excerpt ?? "",
    });
  }
  return out;
}

function safeLooseUrlMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  if (!longer.startsWith(shorter)) return false;
  const next = longer[shorter.length];
  return next === "?" || next === "#";
}

function safeDomain(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
