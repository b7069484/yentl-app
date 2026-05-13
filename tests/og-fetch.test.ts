import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, absolutize, parseMetaFromHtml } from "@/lib/server/og-fetch";

describe("decodeHtmlEntities", () => {
  it("decodes common named entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeHtmlEntities("&quot;hello&quot;")).toBe('"hello"');
    expect(decodeHtmlEntities("a &lt; b &gt; c")).toBe("a < b > c");
    expect(decodeHtmlEntities("It&#39;s")).toBe("It's");
  });

  it("passes through text without entities", () => {
    expect(decodeHtmlEntities("plain text")).toBe("plain text");
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
    expect(result.description).toBe("An & example");
  });

  it("falls back to twitter:image when og:image absent", () => {
    const noOg = `<html><head><meta name="twitter:image" content="https://twcdn.com/x.jpg" /></head></html>`;
    const result = parseMetaFromHtml(noOg, "https://example.com/");
    expect(result.image_url).toBe("https://twcdn.com/x.jpg");
  });

  it("returns all-nulls when no metadata present", () => {
    const empty = `<html><head><title>plain</title></head></html>`;
    const result = parseMetaFromHtml(empty, "https://example.com/");
    expect(result.image_url).toBe(null);
    expect(result.title).toBe(null);
    expect(result.description).toBe(null);
  });
});
