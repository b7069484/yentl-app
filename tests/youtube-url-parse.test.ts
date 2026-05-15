import { describe, it, expect } from "vitest";
import { parseYouTubeUrl } from "@/lib/server/youtube-captions";

describe("parseYouTubeUrl", () => {
  // ── Happy-path URL variants ─────────────────────────────────────────────────

  it("parses youtube.com/watch?v=VIDEO_ID", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be/VIDEO_ID", () => {
    expect(parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses m.youtube.com/watch?v=VIDEO_ID", () => {
    expect(parseYouTubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtube.com/embed/VIDEO_ID", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtube.com/shorts/VIDEO_ID", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtube.com/watch with extra query params (?v=XYZ&t=10)", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtube.com/watch with list param (?v=XYZ&list=PL...)", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be with ?t= timestamp param", () => {
    expect(parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtube.com/embed with query params", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtube.com/shorts with query params", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("accepts 11-char alphanumeric video IDs with underscores and hyphens", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=abc-_123XYZ")).toBe("abc-_123XYZ");
  });

  // ── Invalid / null cases ────────────────────────────────────────────────────

  it("returns null for empty string", () => {
    expect(parseYouTubeUrl("")).toBeNull();
  });

  it("returns null for a Vimeo URL", () => {
    expect(parseYouTubeUrl("https://vimeo.com/123456789")).toBeNull();
  });

  it("returns null for a random HTTP URL", () => {
    expect(parseYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null for malformed URL (no protocol)", () => {
    expect(parseYouTubeUrl("youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null for youtube.com with no v param", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch")).toBeNull();
  });

  it("returns null for youtu.be with no path", () => {
    expect(parseYouTubeUrl("https://youtu.be/")).toBeNull();
  });

  it("returns null for non-URL text", () => {
    expect(parseYouTubeUrl("just some text")).toBeNull();
  });

  it("returns null for youtube.com channel URL", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/@SomeChannel")).toBeNull();
  });
});
