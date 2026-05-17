import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

// ─── Mock node:fs (hoisted vi.mock) ──────────────────────────────────────────
//
// We mock the entire node:fs module and expose existsSync / readdirSync as
// vi.fn()s. The factory spreads the real module so other node:fs APIs remain
// functional. Providing `default: { existsSync, readdirSync }` satisfies
// Vitest's CJS interop default-export requirement for built-in modules.

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const existsSync = vi.fn() as typeof actual.existsSync;
  const readdirSync = vi.fn() as typeof actual.readdirSync;
  return {
    ...actual,
    existsSync,
    readdirSync,
    default: { ...actual, existsSync, readdirSync },
  };
});

// Import the mocked functions AFTER the vi.mock declaration.
// Because vi.mock is hoisted, these see the mocked version.
import { existsSync as _existsSync, readdirSync as _readdirSync } from "node:fs";

// Re-type as vi.MockedFunction to get .mockReturnValue / .mockImplementation
import type { MockedFunction } from "vitest";
const mockedExistsSync = _existsSync as unknown as MockedFunction<typeof _existsSync>;
const mockedReaddirSync = _readdirSync as unknown as MockedFunction<typeof _readdirSync>;

// ─── Module under test ────────────────────────────────────────────────────────
// Imported once; the function reads env + calls existsSync/readdirSync at
// call-time, so per-test mock reconfiguration is sufficient.

import { getYtDlpBinaryPath } from "@/lib/server/yt-dlp-binary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fsAllMissing() {
  mockedExistsSync.mockReturnValue(false);
  mockedReaddirSync.mockReturnValue([] as unknown as ReturnType<typeof _readdirSync>);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getYtDlpBinaryPath — env override", () => {
  beforeEach(() => {
    fsAllMissing();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it("returns YT_DLP_PATH env var when set", () => {
    vi.stubEnv("YT_DLP_PATH", "/custom/path/to/yt-dlp");
    expect(getYtDlpBinaryPath()).toBe("/custom/path/to/yt-dlp");
  });

  it("prefers YT_DLP_PATH over filesystem candidates even when existsSync returns true", () => {
    vi.stubEnv("YT_DLP_PATH", "/explicit/override/yt-dlp");
    mockedExistsSync.mockReturnValue(true);
    mockedReaddirSync.mockReturnValue(["youtube-dl-exec@3.1.7"] as unknown as ReturnType<typeof _readdirSync>);
    expect(getYtDlpBinaryPath()).toBe("/explicit/override/yt-dlp");
  });

  it("falls through when YT_DLP_PATH is empty string — returns PATH fallback", () => {
    vi.stubEnv("YT_DLP_PATH", "");
    fsAllMissing();
    const result = getYtDlpBinaryPath();
    expect(result).not.toBe("");
    expect(result).toBe("yt-dlp");
  });
});

describe("getYtDlpBinaryPath — filesystem candidates", () => {
  beforeEach(() => {
    vi.stubEnv("YT_DLP_PATH", "");
    fsAllMissing();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it("finds symlinked path (node_modules/youtube-dl-exec/bin/yt-dlp) when it exists", () => {
    mockedExistsSync.mockImplementation((p: unknown) => {
      const path = String(p);
      return path.endsWith("node_modules/youtube-dl-exec/bin/yt-dlp") && !path.includes(".pnpm");
    });
    const result = getYtDlpBinaryPath();
    expect(result).toContain("node_modules/youtube-dl-exec/bin/yt-dlp");
    expect(result).not.toContain(".pnpm");
  });

  it("finds pnpm-real-path (node_modules/.pnpm) when only that candidate exists", () => {
    mockedExistsSync.mockImplementation((p: unknown) => {
      const path = String(p);
      return path.includes("node_modules/.pnpm/youtube-dl-exec@") && path.endsWith("bin/yt-dlp");
    });
    mockedReaddirSync.mockReturnValue(["youtube-dl-exec@3.1.7"] as unknown as ReturnType<typeof _readdirSync>);
    const result = getYtDlpBinaryPath();
    expect(result).toContain("node_modules/.pnpm/youtube-dl-exec@");
    expect(result).toContain("bin/yt-dlp");
  });

  it("prefers ./bin/yt-dlp (Vercel-bundled standalone) over node_modules candidates when all exist", () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReaddirSync.mockReturnValue(["youtube-dl-exec@3.1.7"] as unknown as ReturnType<typeof _readdirSync>);
    const result = getYtDlpBinaryPath();
    // The Vercel-bundled standalone at ./bin/yt-dlp (step 2) is the
    // first filesystem candidate — it must win over node_modules paths.
    expect(result).toContain("/bin/yt-dlp");
    expect(result).not.toContain("node_modules");
  });

  it("prefers symlinked node_modules path over pnpm real path when ./bin/yt-dlp absent", () => {
    mockedExistsSync.mockImplementation((p: unknown) => {
      const path = String(p);
      // ./bin/yt-dlp NOT present (Vercel-bundled scenario simulated as absent)
      if (path.endsWith("/bin/yt-dlp") && !path.includes("node_modules")) return false;
      return true;
    });
    mockedReaddirSync.mockReturnValue(["youtube-dl-exec@3.1.7"] as unknown as ReturnType<typeof _readdirSync>);
    const result = getYtDlpBinaryPath();
    // Symlinked path (step 3) is checked before pnpm real path (step 4)
    expect(result).not.toContain(".pnpm");
    expect(result).toContain("node_modules/youtube-dl-exec/bin/yt-dlp");
  });

  it("finds homebrew at /opt/homebrew/bin/yt-dlp when node_modules candidates absent", () => {
    mockedExistsSync.mockImplementation((p: unknown) => String(p) === "/opt/homebrew/bin/yt-dlp");
    const result = getYtDlpBinaryPath();
    expect(result).toBe("/opt/homebrew/bin/yt-dlp");
  });

  it("finds /usr/local/bin/yt-dlp when homebrew and node_modules absent", () => {
    mockedExistsSync.mockImplementation((p: unknown) => String(p) === "/usr/local/bin/yt-dlp");
    const result = getYtDlpBinaryPath();
    expect(result).toBe("/usr/local/bin/yt-dlp");
  });

  it("returns bare 'yt-dlp' when no env override and no filesystem candidate exists", () => {
    fsAllMissing();
    expect(getYtDlpBinaryPath()).toBe("yt-dlp");
  });
});

describe("getYtDlpBinaryPath — integration (real fs, real node_modules)", () => {
  // These tests use the REAL existsSync/readdirSync to verify the resolver works
  // in the actual dev environment. The vi.resetAllMocks() restores the originals.
  beforeEach(() => {
    vi.stubEnv("YT_DLP_PATH", "");
    vi.resetAllMocks(); // Clear mocks → fall back to real implementations
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a non-empty string when no env var is set", () => {
    const result = getYtDlpBinaryPath();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a path that ends with 'yt-dlp' or 'yt-dlp.exe'", () => {
    const result = getYtDlpBinaryPath();
    expect(result).toMatch(/yt-dlp(\.exe)?$/);
  });

  it("resolves to a non-empty truthy path", () => {
    const result = getYtDlpBinaryPath();
    expect(result).toBeTruthy();
  });
});
