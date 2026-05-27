import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dnsMocks = vi.hoisted(() => ({
  lookup: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: dnsMocks.lookup,
  },
  lookup: dnsMocks.lookup,
}));

import { decodeHtmlEntities, absolutize, parseMetaFromHtml, fetchPreview } from "@/lib/server/og-fetch";

describe("decodeHtmlEntities", () => {
  it("decodes common named entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeHtmlEntities("&quot;hello&quot;")).toBe('"hello"');
    expect(decodeHtmlEntities("a &lt; b &gt; c")).toBe("a < b > c");
    expect(decodeHtmlEntities("It&#39;s")).toBe("It's");
  });

  it("decodes zero-padded decimal entities (real-world OG quirk)", () => {
    expect(decodeHtmlEntities("moon&#039;s")).toBe("moon's");
    expect(decodeHtmlEntities("moon&#0039;s")).toBe("moon's");
  });

  it("decodes hex entities including uppercase X", () => {
    expect(decodeHtmlEntities("a&#x2F;b")).toBe("a/b");
    expect(decodeHtmlEntities("a&#X2F;b")).toBe("a/b");
    expect(decodeHtmlEntities("a&#x27;b")).toBe("a'b");
  });

  it("decodes multi-byte codepoints (e.g., em-dash)", () => {
    expect(decodeHtmlEntities("dash&#8212;here")).toBe("dash—here");
    expect(decodeHtmlEntities("dash&#x2014;here")).toBe("dash—here");
  });

  it("passes through text without entities", () => {
    expect(decodeHtmlEntities("plain text")).toBe("plain text");
  });

  it("leaves bogus entities intact", () => {
    expect(decodeHtmlEntities("&unknownentity;")).toBe("&unknownentity;");
  });
});

describe("absolutize", () => {
  it("returns absolute URLs unchanged", () => {
    expect(absolutize("https://example.com/img.png", "https://other.com/page")).toBe(
      "https://example.com/img.png",
    );
  });

  it("resolves protocol-relative URLs against the base scheme", () => {
    expect(absolutize("//cdn.example.com/x.png", "https://example.com/page")).toBe(
      "https://cdn.example.com/x.png",
    );
  });

  it("resolves root-relative paths against the base origin", () => {
    expect(absolutize("/static/img.png", "https://example.com/articles/123")).toBe(
      "https://example.com/static/img.png",
    );
  });

  it("returns null when input is null or empty", () => {
    expect(absolutize(null, "https://example.com/")).toBe(null);
    expect(absolutize("", "https://example.com/")).toBe(null);
  });
});

describe("parseMetaFromHtml", () => {
  const html = `
<html><head>
<meta property="og:title" content="Example Title" />
<meta property="og:image" content="https://cdn.example.com/img.png" />
<meta property="og:description" content="An &amp; example" />
<meta name="twitter:image" content="https://twcdn.com/x.jpg" />
</head><body></body></html>`;

  it("extracts og:title, og:image, og:description", () => {
    const result = parseMetaFromHtml(html, "https://example.com/page");
    expect(result.title).toBe("Example Title");
    expect(result.image_url).toBe("https://cdn.example.com/img.png");
    expect(result.image_source).toBe("open_graph");
    expect(result.description).toBe("An & example");
  });

  it("falls back to twitter:image when og:image absent", () => {
    const noOg = `<html><head><meta name="twitter:image" content="https://twcdn.com/x.jpg" /></head></html>`;
    const result = parseMetaFromHtml(noOg, "https://example.com/");
    expect(result.image_url).toBe("https://twcdn.com/x.jpg");
    expect(result.image_source).toBe("twitter_card");
  });

  it("falls back to schema.org image when card image tags are absent", () => {
    const schema = `<html><head><script type="application/ld+json">{"image":{"url":"/schema.jpg"}}</script></head></html>`;
    const result = parseMetaFromHtml(schema, "https://example.com/article");
    expect(result.image_url).toBe("https://example.com/schema.jpg");
    expect(result.image_source).toBe("schema_org");
  });

  it("extracts nested schema.org ImageObject values", () => {
    const schema = `<html><head><script type="application/ld+json">{
      "@graph": [
        { "@type": "NewsArticle", "image": { "@type": "ImageObject", "contentUrl": "/nested.jpg" } }
      ]
    }</script></head></html>`;
    const result = parseMetaFromHtml(schema, "https://example.com/article");
    expect(result.image_url).toBe("https://example.com/nested.jpg");
    expect(result.image_source).toBe("schema_org");
  });

  it("returns all-nulls when no metadata present", () => {
    const empty = `<html><head><title>plain</title></head></html>`;
    const result = parseMetaFromHtml(empty, "https://example.com/");
    expect(result.image_url).toBe(null);
    expect(result.image_source).toBe("none");
    expect(result.title).toBe(null);
    expect(result.description).toBe(null);
  });
});

describe("fetchPreview SSRF protections", () => {
  beforeEach(() => {
    dnsMocks.lookup.mockReset();
    dnsMocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks redirects to private addresses before following them", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/latest/meta-data" },
      }),
    );

    const preview = await fetchPreview("https://example.com/redirect-private");

    expect(preview).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks private OG image URLs before image validation fetches", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        `<html><head><meta property="og:image" content="http://127.0.0.1/secret.png"></head></html>`,
        { status: 200 },
      ),
    );

    const preview = await fetchPreview("https://example.com/private-og-image");

    expect(preview?.image_status).toBe("blocked");
    expect(preview?.image_url).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("marks an Open Graph image validated only after a guarded image probe", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          `<html><head>
            <meta property="og:title" content="Publisher story">
            <meta property="og:image" content="/thumb.jpg">
          </head></html>`,
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }),
      );

    const preview = await fetchPreview("https://example.com/validated-og-image");

    expect(preview?.image_url).toBe("https://example.com/thumb.jpg");
    expect(preview?.image_status).toBe("validated");
    expect(preview?.image_source).toBe("open_graph");
    expect(preview?.image_content_type).toBe("image/jpeg");
    expect(preview?.unavailable_reason).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "HEAD", redirect: "manual" });
  });

  it("falls back to a tiny guarded GET probe when HEAD does not prove an image", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          `<html><head><meta name="twitter:image" content="https://cdn.example/fallback.png"></head></html>`,
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 405,
          headers: { "content-type": "text/plain" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("x", {
          status: 206,
          headers: { "content-type": "image/png" },
        }),
      );

    const preview = await fetchPreview("https://example.com/get-probe-image");

    expect(preview?.image_status).toBe("validated");
    expect(preview?.image_source).toBe("twitter_card");
    expect(preview?.image_content_type).toBe("image/png");
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "GET", redirect: "manual" });
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Range")).toBe("bytes=0-0");
  });

  it("drops a source image candidate when its redirect target fails the SSRF guard", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          `<html><head><meta property="og:image" content="https://cdn.example/redirect.png"></head></html>`,
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/private.png" },
        }),
      );

    const preview = await fetchPreview("https://example.com/blocked-image-redirect");

    expect(preview?.image_url).toBeNull();
    expect(preview?.image_alt).toBeNull();
    expect(preview?.image_status).toBe("blocked");
    expect(preview?.image_source).toBe("open_graph");
    expect(preview?.unavailable_reason).toBe("Source image was blocked by the source safety check.");
  });
});
