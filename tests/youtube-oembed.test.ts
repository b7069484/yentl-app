import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock global fetch ─────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Import under test (after stubbing fetch) ─────────────────────────────────

import { fetchOEmbed } from "@/lib/server/youtube-oembed";

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchOEmbed — SSRF guard", () => {
  it("returns null for an arbitrary hostname without calling fetch", async () => {
    const result = await fetchOEmbed("https://evil.example.com/oembed?v=dQw4w9WgXcQ");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null for a non-URL string without calling fetch", async () => {
    const result = await fetchOEmbed("not a url");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("proceeds to fetch for www.youtube.com", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Test",
          author_name: "Author",
          thumbnail_url: "https://img.youtube.com/vi/test/0.jpg",
          html: "<iframe></iframe>",
        }),
    });
    const result = await fetchOEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("proceeds to fetch for youtu.be", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Test",
          author_name: "Author",
          thumbnail_url: "https://img.youtube.com/vi/test/0.jpg",
          html: "<iframe></iframe>",
        }),
    });
    const result = await fetchOEmbed("https://youtu.be/dQw4w9WgXcQ");
    expect(result).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
