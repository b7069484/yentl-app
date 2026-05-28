import { NextRequest, NextResponse } from "next/server";
import { requireSourceAnalysisConsent } from "@/lib/server/consent";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import { assertSafeUrl } from "@/lib/server/ssrf-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_EXTRACTED_WORDS = 2200;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 4;

type ArticleIngestResponse =
  | {
      url: string;
      final_url: string;
      title: string;
      description: string | null;
      text: string;
      word_count: number;
      source_word_count: number;
      truncated: boolean;
    }
  | {
      error: { code: string; message: string };
    };

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } } satisfies ArticleIngestResponse, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse<ArticleIngestResponse>> {
  const limited = await enforceRateLimit(req, RATE_LIMITS.sourceIngest);
  if (limited) return limited as NextResponse<ArticleIngestResponse>;

  const consentError = requireSourceAnalysisConsent(req);
  if (consentError) return consentError as NextResponse<ArticleIngestResponse>;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_URL", "Invalid JSON body", 400);
  }

  const url = (body as { url?: unknown }).url;
  if (typeof url !== "string" || !url.trim()) {
    return jsonError("INVALID_URL", "url is required", 400);
  }

  const initialUrl = url.trim();
  try {
    await assertSafeUrl(initialUrl);
  } catch (error) {
    const err = error as Error & { code?: string };
    return jsonError(err.code === "SSRF_BLOCKED" ? "SSRF_BLOCKED" : "INVALID_URL", err.message, 400);
  }

  let fetched: FetchedPage;
  try {
    fetched = await fetchReadablePage(initialUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fetch this page.";
    return jsonError("FETCH_FAILED", message, 400);
  }

  if (!isReadableContentType(fetched.contentType)) {
    return jsonError(
      "UNSUPPORTED_PAGE",
      `This URL did not return readable text/html or text/plain content (${fetched.contentType || "unknown content type"}). Use Direct media or Chrome tab capture for media pages.`,
      400,
    );
  }

  if (fetched.html.length > MAX_HTML_BYTES) {
    return jsonError("PAGE_TOO_LARGE", "This page is too large to import directly. Use Chrome tab capture or paste the relevant section.", 413);
  }

  const extracted = extractReadableText(fetched.html, fetched.finalUrl, fetched.contentType);
  if (extracted.text.split(/\s+/).filter(Boolean).length < 40) {
    return jsonError(
      "NO_READABLE_TEXT",
      "Yentl could not extract enough readable text from this page. Use Chrome tab capture, paste text, or use a direct media URL if this is a video/audio page.",
      422,
    );
  }

  const sourceWordCount = wordCount(extracted.text);
  const limitedText = limitWords(extracted.text, MAX_EXTRACTED_WORDS);

  return NextResponse.json({
    url: initialUrl,
    final_url: fetched.finalUrl,
    title: extracted.title || new URL(fetched.finalUrl).hostname.replace(/^www\./, ""),
    description: extracted.description,
    text: limitedText,
    word_count: wordCount(limitedText),
    source_word_count: sourceWordCount,
    truncated: sourceWordCount > wordCount(limitedText),
  });
}

type FetchedPage = {
  html: string;
  finalUrl: string;
  contentType: string;
};

async function fetchReadablePage(url: string, redirectCount = 0): Promise<FetchedPage> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error("Too many redirects while fetching this page.");
  }

  await assertSafeUrl(url);

  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
      "User-Agent": "Yentl article importer/1.0",
    },
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("The page redirected without a location.");
    const nextUrl = new URL(location, url).toString();
    return fetchReadablePage(nextUrl, redirectCount + 1);
  }

  if (!response.ok) {
    throw new Error(`The page returned HTTP ${response.status}.`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_HTML_BYTES) {
    throw new Error("This page is too large to import directly.");
  }

  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const html = await response.text();
  return { html, finalUrl: response.url || url, contentType };
}

function isReadableContentType(contentType: string) {
  return !contentType || contentType.startsWith("text/html") || contentType.startsWith("text/plain");
}

function extractReadableText(html: string, finalUrl: string, contentType: string) {
  if (contentType.startsWith("text/plain")) {
    const text = normalizeWhitespace(html);
    return {
      title: new URL(finalUrl).hostname.replace(/^www\./, ""),
      description: null,
      text,
    };
  }

  const title =
    extractMeta(html, "property", "og:title") ??
    extractMeta(html, "name", "twitter:title") ??
    extractTag(html, "title") ??
    new URL(finalUrl).hostname.replace(/^www\./, "");
  const description =
    extractMeta(html, "name", "description") ??
    extractMeta(html, "property", "og:description") ??
    null;

  const wikipedia = extractBetweenStartAndBoundary(
    html,
    /<div\b[^>]*\bid=["']mw-content-text["'][^>]*>/i,
    /<div\b[^>]*\bid=["'](?:catlinks|mw-navigation)["'][^>]*>/i,
  );
  const article = extractFirstTagBlock(html, "article");
  const articleLike = extractFirstAttributeBlock(html, /(article-body|articleBody|post-content|entry-content|main-content|story-body|content-body)/i);
  const main = extractFirstTagBlock(html, "main");
  const body = extractFirstTagBlock(html, "body");
  const candidate = longestReadable([wikipedia, article, articleLike, main, body, html]);

  return {
    title: decodeHtml(title),
    description: description ? decodeHtml(description) : null,
    text: cleanReadableText(htmlToText(candidate)),
  };
}

function longestReadable(candidates: Array<string | null>) {
  return candidates
    .filter((candidate): candidate is string => Boolean(candidate))
    .sort((a, b) => htmlToText(b).length - htmlToText(a).length)[0] ?? "";
}

function extractMeta(html: string, attr: "name" | "property", key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta\\b(?=[^>]*\\b${attr}=["']${escaped}["'])(?=[^>]*\\bcontent=["']([^"']*)["'])[^>]*>`, "i");
  return re.exec(html)?.[1]?.trim() ?? null;
}

function extractTag(html: string, tag: string) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return stripTags(re.exec(html)?.[1] ?? "").trim() || null;
}

function extractFirstTagBlock(html: string, tag: string) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return re.exec(html)?.[1] ?? null;
}

function extractFirstAttributeBlock(html: string, attrPattern: RegExp) {
  const attrSource = attrPattern.source;
  const re = new RegExp(
    `<([a-z0-9-]+)\\b(?=[^>]*(?:id|class)=["'][^"']*(?:${attrSource})[^"']*["'])[^>]*>([\\s\\S]*?)<\\/\\1>`,
    "i",
  );
  return re.exec(html)?.[2] ?? null;
}

function extractBetweenStartAndBoundary(html: string, startRe: RegExp, boundaryRe: RegExp) {
  const start = startRe.exec(html);
  if (!start || start.index < 0) return null;
  const from = start.index;
  const rest = html.slice(from);
  const boundary = boundaryRe.exec(rest);
  return boundary ? rest.slice(0, boundary.index) : rest;
}

function htmlToText(html: string) {
  const withoutNoise = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, " ")
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
    .replace(/<form\b[\s\S]*?<\/form>/gi, " ")
    .replace(/<table\b[\s\S]*?<\/table>/gi, " ")
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, " ")
    .replace(/<sup\b[\s\S]*?<\/sup>/gi, " ");
  const withBreaks = withoutNoise
    .replace(/<\/(p|div|section|article|main|header|footer|li|blockquote|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  return normalizeWhitespace(decodeHtml(stripTags(withBreaks)));
}

function cleanReadableText(text: string) {
  const uiLineRe =
    /^(jump to content|main menu|move to sidebar|hide|navigation|current events|random article|about wikipedia|contact us|donate|appearance|tools|actions|read|edit|view history|general|print\/export|languages|contents)$/i;
  const seen = new Set<string>();

  return text
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !uiLineRe.test(line))
    .filter((line) => {
      const normalized = line.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join("\n\n");
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function limitWords(text: string, maxWords: number) {
  const paragraphs = text.split(/\n{2,}/);
  const kept: string[] = [];
  let remaining = maxWords;

  for (const paragraph of paragraphs) {
    if (remaining <= 0) break;
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    kept.push(words.slice(0, remaining).join(" "));
    remaining -= words.length;
  }

  return kept.join("\n\n").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}
