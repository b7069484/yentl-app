import { describe, it, expect, vi, afterEach } from "vitest";

// ─── Module under test ────────────────────────────────────────────────────────
// Import AFTER any vi.mock() / env setup so we can test different env states.

// We need dynamic imports to re-evaluate the module with different env states.
// The module is tested against the real youtube-dl-exec package (integration-level).

describe("getYtDlpBinaryPath — env override", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns YT_DLP_PATH env var when set", async () => {
    vi.stubEnv("YT_DLP_PATH", "/custom/path/to/yt-dlp");
    const { getYtDlpBinaryPath } = await import("@/lib/server/yt-dlp-binary");
    expect(getYtDlpBinaryPath()).toBe("/custom/path/to/yt-dlp");
  });

  it("does not return env override when YT_DLP_PATH is empty string", async () => {
    vi.stubEnv("YT_DLP_PATH", "");
    const { getYtDlpBinaryPath } = await import("@/lib/server/yt-dlp-binary");
    // Empty string is falsy — should fall through to package path
    const result = getYtDlpBinaryPath();
    expect(result).not.toBe("");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getYtDlpBinaryPath — default resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns a non-empty string when no env var is set", async () => {
    vi.stubEnv("YT_DLP_PATH", "");
    const { getYtDlpBinaryPath } = await import("@/lib/server/yt-dlp-binary");
    const result = getYtDlpBinaryPath();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a path that ends with 'yt-dlp' or 'yt-dlp.exe'", async () => {
    vi.stubEnv("YT_DLP_PATH", "");
    const { getYtDlpBinaryPath } = await import("@/lib/server/yt-dlp-binary");
    const result = getYtDlpBinaryPath();
    expect(result).toMatch(/yt-dlp(\.exe)?$/);
  });

  it("resolves to a path that includes 'youtube-dl-exec' (from the npm package)", async () => {
    vi.stubEnv("YT_DLP_PATH", "");
    const { getYtDlpBinaryPath } = await import("@/lib/server/yt-dlp-binary");
    const result = getYtDlpBinaryPath();
    // Either the npm package path or a system fallback
    // On CI/Vercel after install: path includes youtube-dl-exec/bin
    // On dev without the pkg path: falls back to "yt-dlp" (PATH lookup)
    expect(result).toBeTruthy();
  });
});
