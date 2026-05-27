import type { SourcePreview } from "@/lib/types";
import { assertSafeUrl } from "@/lib/server/ssrf-guard";

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

export type ImageCandidateSource = NonNullable<SourcePreview["image_source"]>;

export type ParsedMeta = Omit<
  SourcePreview,
  | "fetched_at"
  | "image_status"
  | "image_final_url"
  | "image_content_type"
  | "image_dimensions"
  | "validated_at"
  | "unavailable_reason"
> & {
  image_source: ImageCandidateSource;
};

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

function schemaImageCandidate(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = schemaImageCandidate(item, depth + 1);
      if (candidate) return candidate;
    }
    return null;
  }
  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  for (const key of ["image", "thumbnailUrl", "primaryImageOfPage", "@graph"]) {
    const candidate = schemaImageCandidate(record[key], depth + 1);
    if (candidate) return candidate;
  }
  for (const key of ["url", "contentUrl"]) {
    const raw = record[key];
    if (typeof raw === "string") return raw;
  }
  return null;
}

function schemaImage(html: string, sourceUrl: string): string | null {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const rawJson = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(decodeHtmlEntities(rawJson));
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const candidate = schemaImageCandidate(item);
        const resolved = absolutize(candidate, sourceUrl);
        if (resolved) return resolved;
      }
    } catch {
      // Ignore malformed schema blocks; OG/Twitter tags remain the primary path.
    }
  }
  return null;
}

export function parseMetaFromHtml(html: string, sourceUrl: string): ParsedMeta {
  const ogImage = absolutize(meta(html, "og:image"), sourceUrl);
  const twitterImage = absolutize(meta(html, "twitter:image"), sourceUrl);
  const structuredImage = schemaImage(html, sourceUrl);
  const image_url = ogImage ?? twitterImage ?? structuredImage;
  const image_source: ImageCandidateSource = ogImage
    ? "open_graph"
    : twitterImage
      ? "twitter_card"
      : structuredImage
        ? "schema_org"
        : "none";

  return {
    image_url,
    image_alt: meta(html, "og:image:alt") ?? meta(html, "twitter:image:alt"),
    title: meta(html, "og:title") ?? meta(html, "twitter:title"),
    description: meta(html, "og:description") ?? meta(html, "twitter:description"),
    image_source,
  };
}

const previewCache = new Map<string, SourcePreview>();
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
const CACHE_MAX = 500;
const HEAD_BYTE_CAP = 64 * 1024;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 5;

type GuardedFetchResult = {
  response: Response;
  finalUrl: string;
};

function isRedirect(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

async function fetchWithSsrfGuard(
  inputUrl: string,
  init: RequestInit,
): Promise<GuardedFetchResult> {
  let currentUrl = inputUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertSafeUrl(currentUrl);
    const response = await fetch(currentUrl, {
      ...init,
      redirect: "manual",
    });

    if (!isRedirect(response.status)) {
      return { response, finalUrl: currentUrl };
    }

    const location = response.headers.get("location");
    if (!location) {
      return { response, finalUrl: currentUrl };
    }

    const nextUrl = absolutize(location, currentUrl);
    if (!nextUrl) {
      throw new Error("redirect target is not a valid URL");
    }

    await assertSafeUrl(nextUrl);
    currentUrl = nextUrl;
  }

  throw new Error("too many redirects");
}

async function fetchImageProbe(
  inputUrl: string,
  init: RequestInit,
): Promise<GuardedFetchResult> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8");
  }
  return fetchWithSsrfGuard(inputUrl, {
    ...init,
    headers,
  });
}

async function validateSourceImage(imageUrl: string): Promise<{
  status: "validated" | "invalid";
  finalUrl: string | null;
  contentType: string | null;
  reason: string | null;
}> {
  const head = await fetchImageProbe(imageUrl, {
    method: "HEAD",
    signal: AbortSignal.timeout(3_000),
  });
  const headContentType = head.response.headers.get("content-type") ?? "";
  if (head.response.ok && headContentType.startsWith("image/")) {
    return {
      status: "validated",
      finalUrl: head.finalUrl,
      contentType: headContentType,
      reason: null,
    };
  }

  const get = await fetchImageProbe(imageUrl, {
    method: "GET",
    headers: { "Range": "bytes=0-0" },
    signal: AbortSignal.timeout(3_000),
  });
  const getContentType = get.response.headers.get("content-type") ?? "";
  void get.response.body?.cancel();
  if (get.response.ok && getContentType.startsWith("image/")) {
    return {
      status: "validated",
      finalUrl: get.finalUrl,
      contentType: getContentType,
      reason: null,
    };
  }

  const contentType = getContentType || headContentType || null;
  return {
    status: "invalid",
    finalUrl: null,
    contentType,
    reason: contentType
      ? `Source image responded as ${contentType}, not an image.`
      : "Source image did not respond with an image content type.",
  };
}

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
    const { response: res, finalUrl } = await fetchWithSsrfGuard(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YentlBot/1.0; +https://yentl.it)",
        "Accept": "text/html,application/xhtml+xml;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

    const parsed = parseMetaFromHtml(html, finalUrl);
    const fetchedAt = Date.now();

    // Image-load check: if source image URL doesn't serve real image bytes, do
    // not substitute a fake image. The UI will render a no-thumbnail source card.
    let imageStatus: SourcePreview["image_status"] = parsed.image_url ? "invalid" : "missing";
    let imageFinalUrl: string | null = null;
    let imageContentType: string | null = null;
    let unavailableReason: string | null = parsed.image_url
      ? "The publisher image could not be validated."
      : "No source-provided thumbnail was found.";
    if (parsed.image_url) {
      try {
        const validation = await validateSourceImage(parsed.image_url);
        if (validation.status === "validated") {
          imageStatus = "validated";
          imageFinalUrl = validation.finalUrl;
          imageContentType = validation.contentType;
          unavailableReason = null;
        } else {
          parsed.image_url = null;
          parsed.image_alt = null;
          imageContentType = validation.contentType;
          unavailableReason = validation.reason;
        }
      } catch {
        parsed.image_url = null;
        parsed.image_alt = null;
        imageStatus = "blocked";
        unavailableReason = "Source image was blocked by the source safety check.";
      }
    }

    const preview: SourcePreview = {
      ...parsed,
      fetched_at: fetchedAt,
      image_status: imageStatus,
      image_final_url: imageFinalUrl,
      image_content_type: imageContentType,
      image_dimensions: null,
      validated_at: imageStatus === "validated" ? fetchedAt : null,
      unavailable_reason: unavailableReason,
    };
    cacheSet(url, preview);
    return preview;
  } catch {
    return null;
  }
}
