import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRequireSourceAnalysisConsent = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockAssertSafeUrl = vi.fn();

vi.mock("@/lib/server/consent", () => ({
  requireSourceAnalysisConsent: mockRequireSourceAnalysisConsent,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
  RATE_LIMITS: { sourceIngest: { key: "sourceIngest" } },
}));

vi.mock("@/lib/server/ssrf-guard", () => ({
  assertSafeUrl: mockAssertSafeUrl,
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
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...headers,
    },
  });
}

describe("POST /api/article-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSourceAnalysisConsent.mockReturnValue(null);
    mockEnforceRateLimit.mockResolvedValue(null);
    mockAssertSafeUrl.mockResolvedValue(undefined);
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(html)));

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
  });

  it("caps oversized readable imports for analysis quality", async () => {
    const longText = Array.from({ length: 2600 }, (_, index) => `word${index}`).join(" ");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(`<article><p>${longText}</p></article>`)));

    const { POST } = await import("@/app/api/article-ingest/route");
    const res = await POST(makeRequest("https://example.com/long-story") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source_word_count).toBe(2600);
    expect(json.word_count).toBe(2200);
    expect(json.truncated).toBe(true);
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
