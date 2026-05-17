import type { SourcePreview } from "@/lib/types";

const NAMED_ENTITY_DECODE: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * Decode the entities that show up in real-world OG meta tags:
 *   - Common named entities (&amp; &lt; &gt; &quot; &apos; &nbsp;)
 *   - Decimal numeric entities of any zero-padding (&#39; &#039; &#0039; …)
 *   - Hex numeric entities (&#x27; &#X27; &#x2F;)
 * Anything that fails to decode passes through unchanged.
 */
export function decodeHtmlEntities(s: string): string {
  return s.replace(/&(?:(amp|lt|gt|quot|apos|nbsp)|#(\d+)|#[xX]([0-9a-fA-F]+));/g, (m, named, dec, hex) => {
    if (named) return NAMED_ENTITY_DECODE[`&${named};`] ?? m;
    const cp = dec ? parseInt(dec, 10) : parseInt(hex, 16);
    if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return m;
    try {
      return String.fromCodePoint(cp);
    } catch {
      return m;
    }
  });
}

export function absolutize(raw: string | null, base: string): string | null {
  if (!raw) return null;
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

export type ParsedMeta = Omit<SourcePreview, "fetched_at">;

function meta(html: string, prop: string): string | null {
  // Tolerate either property= or name=, attribute order, and single OR double quotes.
  const re = new RegExp(
    `<meta\\s+(?:[^>]*?(?:property|name)\\s*=\\s*["']${prop}["'][^>]*?content\\s*=\\s*["']([^"']+)["']|[^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?(?:property|name)\\s*=\\s*["']${prop}["'])`,
    "i",
  );
  const m = html.match(re);
  if (!m) return null;
  const raw = m[1] ?? m[2];
  return raw ? decodeHtmlEntities(raw) : null;
}

export function parseMetaFromHtml(html: string, sourceUrl: string): ParsedMeta {
  return {
    image_url: absolutize(meta(html, "og:image") ?? meta(html, "twitter:image"), sourceUrl),
    image_alt: meta(html, "og:image:alt") ?? meta(html, "twitter:image:alt"),
    title: meta(html, "og:title") ?? meta(html, "twitter:title"),
    description: meta(html, "og:description") ?? meta(html, "twitter:description"),
  };
}

const previewCache = new Map<string, SourcePreview>();
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
const CACHE_MAX = 500;
const HEAD_BYTE_CAP = 64 * 1024;
const FETCH_TIMEOUT_MS = 5_000;

function cacheSet(url: string, preview: SourcePreview) {
  if (previewCache.size >= CACHE_MAX) {
    // Evict the oldest insertion (Map preserves insertion order)
    const firstKey = previewCache.keys().next().value;
    if (firstKey !== undefined) previewCache.delete(firstKey);
  }
  previewCache.set(url, preview);
}

export async function fetchPreview(url: string): Promise<SourcePreview | null> {
  const cached = previewCache.get(url);
  if (cached && Date.now() - cached.fetched_at < CACHE_TTL_MS) return cached;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YentlBot/1.0; +https://yentl.it)",
        "Accept": "text/html,application/xhtml+xml;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = "";
    let total = 0;
    const decoder = new TextDecoder();
    while (total < HEAD_BYTE_CAP) {
      const { value, done } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      total += value.length;
      if (html.includes("</head>")) break;
    }
    void reader.cancel();

    const parsed = parseMetaFromHtml(html, url);

    // Image-load check: if og:image URL doesn't serve real image bytes, drop it
    if (parsed.image_url) {
      try {
        const head = await fetch(parsed.image_url, {
          method: "HEAD",
          signal: AbortSignal.timeout(3_000),
          redirect: "follow",
        });
        const ct = head.headers.get("content-type") ?? "";
        if (!head.ok || !ct.startsWith("image/")) {
          parsed.image_url = null;
          parsed.image_alt = null;
        }
      } catch {
        parsed.image_url = null;
        parsed.image_alt = null;
      }
    }

    if (!parsed.image_url && !parsed.title && !parsed.description) return null;

    const preview: SourcePreview = { ...parsed, fetched_at: Date.now() };
    cacheSet(url, preview);
    return preview;
  } catch {
    return null;
  }
}
