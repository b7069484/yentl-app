import { describe, expect, it } from "vitest";
import { extractFirstHttpUrl, readUrlFromClipboard } from "@/lib/client/clipboard-url";

describe("clipboard URL helpers", () => {
  it("extracts and normalizes the first http URL from copied text", () => {
    expect(extractFirstHttpUrl("Read this: https://example.com/story?x=1.")).toBe(
      "https://example.com/story?x=1",
    );
  });

  it("ignores non-http URL schemes", () => {
    expect(extractFirstHttpUrl("file:///private/report.pdf")).toBeNull();
  });

  it("returns a clipboard URL when readText contains one", async () => {
    await expect(
      readUrlFromClipboard({
        readText: async () => "Here: https://news.example/article",
      }),
    ).resolves.toEqual({ ok: true, url: "https://news.example/article" });
  });

  it("reports empty and missing URL clipboard states", async () => {
    await expect(readUrlFromClipboard({ readText: async () => "" })).resolves.toMatchObject({
      ok: false,
      code: "empty",
    });
    await expect(readUrlFromClipboard({ readText: async () => "just words" })).resolves.toMatchObject({
      ok: false,
      code: "no_url",
    });
  });

  it("reports unsupported or denied clipboard access", async () => {
    await expect(readUrlFromClipboard(undefined)).resolves.toMatchObject({
      ok: false,
      code: "unsupported",
    });
    await expect(readUrlFromClipboard({ readText: async () => { throw new Error("denied"); } })).resolves.toMatchObject({
      ok: false,
      code: "denied",
    });
  });
});
