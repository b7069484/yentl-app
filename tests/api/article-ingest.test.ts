import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRequireSourceAnalysisConsent = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockAssertSafeUrl = vi.fn();
const mockFetchWithSsrfGuard = vi.fn();

vi.mock("@/lib/server/consent", () => ({
  requireSourceAnalysisConsent: mockRequireSourceAnalysisConsent,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
  RATE_LIMITS: { sourceIngest: { key: "sourceIngest" } },
}));

vi.mock("@/lib/server/ssrf-guard", () => ({
  assertSafeUrl: mockAssertSafeUrl,
  fetchWithSsrfGuard: mockFetchWithSsrfGuard,
}));

function makeRequest(url: string) {
  return new Request("http://localhost/api/article-ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-yentl-source-consent": "source-analysis-v1",
    },
    body: JSON.stringify({ url }),
  });
}

function htmlResponse(html: string, headers?: Record<string, string>) {
  const response = new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...headers,
    },
  });
  return Object.assign(response, { finalUrl: "https://example.com/story" });
}

function ssrfError(message = "redirect resolved to a private address") {
  const err = new Error(message) as Error & { code: string };
  err.code = "SSRF_BLOCKED";
  return err;
}

describe("POST /api/article-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSourceAnalysisConsent.mockReturnValue(null);
    mockEnforceRateLimit.mockResolvedValue(null);
    mockAssertSafeUrl.mockResolvedValue(undefined);
    mockFetchWithSsrfGuard.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("extracts readable article text while dropping page chrome", async () => {
    const articleParagraphs = Array.from({ length: 5 }, (_, index) => {
      return `<p>Fact checking paragraph ${index + 1} explains a concrete claim, the public evidence needed to verify it, the speaker context, and the missing source that should be checked before Yentl elevates the finding.</p>`;
    }).join("");
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Example Fact Check</title>
          <meta name="description" content="Readable article description">
        </head>
        <body>
          <header>Subscribe Sign in Advertisement</header>
          <nav>Jump to content Main menu Donate</nav>
          <main>
            <article>
              ${articleParagraphs}
              <table><tr><td>Navigation table should not be imported.</td></tr></table>
              <sup>citation chrome should not become transcript text</sup>
            </article>
          </main>
          <footer>Footer links and privacy policy</footer>
        </body>
      </html>
    `;
    mockFetchWithSsrfGuard.mockResolvedValue(htmlResponse(html));

    const { POST } = await import("@/app/api/article-ingest/route");
    const res = await POST(makeRequest("https://example.com/story") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("Example Fact Check");
    expect(json.description).toBe("Readable article description");
    expect(json.text).toContain("Fact checking paragraph 1 explains a concrete claim");
    expect(json.text).toContain("\n\nFact checking paragraph 2 explains a concrete claim");
    expect(json.text).not.toContain("Subscribe Sign in");
    expect(json.text).not.toContain("Navigation table");
    expect(json.text).not.toContain("privacy policy");
    expect(mockFetchWithSsrfGuard).toHaveBeenCalledWith(
      "https://example.com/story",
      expect.objectContaining({ maxRedirects: 4, method: "GET" }),
    );
  });

  it("drops embedded cookie, ad, related-story, sharing, and comment chrome from messy articles", async () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Messy Civic Story</title>
          <meta name="description" content="A story surrounded by page chrome">
        </head>
        <body>
          <main>
            <article>
              <div class="cookie-banner">Accept cookies before reading this site.</div>
              <button class="share-button">Share this story on every platform.</button>
              <p>The water authority said its filtration project is six months behind schedule, according to meeting records released Tuesday.</p>
              <div id="ad-unit-top">Sponsored mortgage offers should never become source text.</div>
              <p>Board members said the delay came after a contractor missed two inspection deadlines and a replacement part failed certification.</p>
              <section aria-label="Related articles">
                <h2>Related articles</h2>
                <p>Read this unrelated story about summer camps.</p>
              </section>
              <p>Residents at the hearing asked whether bottled-water costs would be reimbursed while the older system remains in service.</p>
              <aside class="newsletter-signup">Subscribe to our daily newsletter.</aside>
              <p>The agency director said the current advisory is precautionary, not a finding that the tap water violates state standards.</p>
              <div data-testid="comments-panel">
                <p>Reader comments and moderation notes should not be treated as the article.</p>
              </div>
              <p>The final project report is expected before the next budget hearing, where the board will vote on a revised timeline.</p>
            </article>
          </main>
        </body>
      </html>
    `;
    mockFetchWithSsrfGuard.mockResolvedValue(htmlResponse(html));

    const { POST } = await import("@/app/api/article-ingest/route");
    const res = await POST(makeRequest("https://example.com/messy-civic-story") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("Messy Civic Story");
    expect(json.text).toContain("filtration project is six months behind schedule");
    expect(json.text).toContain("bottled-water costs would be reimbursed");
    expect(json.text).toContain("revised timeline");
    expect(json.text).not.toContain("Accept cookies");
    expect(json.text).not.toContain("Share this story");
    expect(json.text).not.toContain("Sponsored mortgage offers");
    expect(json.text).not.toContain("summer camps");
    expect(json.text).not.toContain("Subscribe to our daily newsletter");
    expect(json.text).not.toContain("Reader comments");
  });

  it("caps oversized readable imports for analysis quality", async () => {
    const longText = Array.from({ length: 2600 }, (_, index) => `word${index}`).join(" ");
    mockFetchWithSsrfGuard.mockResolvedValue(htmlResponse(`<article><p>${longText}</p></article>`));

    const { POST } = await import("@/app/api/article-ingest/route");
    const res = await POST(makeRequest("https://example.com/long-story") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source_word_count).toBe(2600);
    expect(json.word_count).toBe(2200);
    expect(json.truncated).toBe(true);
  });

  it("returns SSRF_BLOCKED when the fetch-time guard rejects a redirect target", async () => {
    mockFetchWithSsrfGuard.mockRejectedValue(ssrfError());

    const { POST } = await import("@/app/api/article-ingest/route");
    const res = await POST(makeRequest("https://example.com/redirects-private") as never);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("SSRF_BLOCKED");
    expect(mockAssertSafeUrl).toHaveBeenCalledWith("https://example.com/redirects-private");
    expect(mockFetchWithSsrfGuard).toHaveBeenCalled();
  });

  it("serves the gated local validation article without weakening normal SSRF checks", async () => {
    const { POST } = await import("@/app/api/article-ingest/route");
    const res = await POST(
      makeRequest("http://localhost:3000/validation/yentl-synthetic-article.html") as never,
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockAssertSafeUrl).not.toHaveBeenCalled();
    expect(json.validation_fixture).toBe(true);
    expect(json.validation_fixture_id).toBe("yentl_synthetic_article_html");
    expect(json.title).toBe("Yentl Validation Article");
    expect(json.description).toBe("A local article fixture for Yentl URL ingest validation.");
    expect(json.text).toContain("The city library operating budget increased by 12 percent");
    expect(json.text).toContain("At Ridgeview Middle School");
    expect(json.text).not.toContain("Subscribe Sign in");
    expect(json.text).not.toContain("Footer links");
  });
});
