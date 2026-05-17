/**
 * Resolves the path to the yt-dlp binary.
 *
 * Resolution order:
 *  1. YT_DLP_PATH env var  — explicit override (Vercel env var for custom builds)
 *  2. node_modules/youtube-dl-exec/bin/yt-dlp  — symlinked path (npm flat / pnpm
 *     hoisted). This is the canonical location under a standard install.
 *  3. node_modules/.pnpm/youtube-dl-exec@<ver>/node_modules/youtube-dl-exec/bin/yt-dlp
 *     — pnpm real path, probed by scanning node_modules/.pnpm/ for the versioned
 *     directory. Needed when the symlink is missing or hoisting is disabled.
 *  4. /opt/homebrew/bin/yt-dlp  — Homebrew on Apple Silicon.
 *  5. /usr/local/bin/yt-dlp    — Homebrew on Intel / Linux via /usr/local.
 *  6. PATH fallback — bare "yt-dlp" string; works on systems where yt-dlp is
 *     installed globally. Fails on Vercel if the binary wasn't bundled.
 *
 * Implementation notes:
 *  - Uses fs.existsSync() instead of createRequire() to avoid Turbopack's
 *    module-resolution sandbox, which breaks the old approach in Next.js dev mode.
 *  - All I/O happens at call time (not at module load) so env-var overrides in
 *    tests are respected.
 *  - No caching — existsSync is O(μs) and the simplicity is worth it.
 *
 * Vercel note:
 *   On Vercel the postinstall runs automatically via pnpm (pnpm.onlyBuiltDependencies
 *   includes youtube-dl-exec). The binary is bundled into the function via
 *   outputFileTracingIncludes in next.config.ts. No YT_DLP_PATH is needed unless
 *   you want to override the default location.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Returns the absolute path to the yt-dlp binary to spawn.
 *
 * Call once per request — the result is cheap to compute and is not cached
 * at module level so that env var overrides work in tests.
 */
export function getYtDlpBinaryPath(): string {
  // 1. Explicit env override
  if (process.env.YT_DLP_PATH) {
    return process.env.YT_DLP_PATH;
  }

  const cwd = process.cwd();

  // 2. Repo-bundled standalone binary at ./bin/yt-dlp — downloaded by the
  //    vercel-build script from yt-dlp's GitHub releases (yt-dlp_linux is a
  //    PyInstaller-built executable that bundles Python, so it runs on Vercel
  //    where the youtube-dl-exec Python script does not).
  const bundled = join(cwd, "bin/yt-dlp");
  if (existsSync(bundled)) {
    return bundled;
  }

  // 3. Symlinked / hoisted youtube-dl-exec path (npm flat or pnpm hoisted)
  const symlinked = join(cwd, "node_modules/youtube-dl-exec/bin/yt-dlp");
  if (existsSync(symlinked)) {
    return symlinked;
  }

  // 3. pnpm real path — scan node_modules/.pnpm/ for youtube-dl-exec@<ver>
  const pnpmDir = join(cwd, "node_modules/.pnpm");
  try {
    const entries = readdirSync(pnpmDir);
    for (const entry of entries) {
      if (entry.startsWith("youtube-dl-exec@")) {
        const candidate = join(
          pnpmDir,
          entry,
          "node_modules/youtube-dl-exec/bin/yt-dlp",
        );
        if (existsSync(candidate)) {
          return candidate;
        }
      }
    }
  } catch {
    // node_modules/.pnpm doesn't exist (npm install) — skip
  }

  // 4. Homebrew on Apple Silicon
  if (existsSync("/opt/homebrew/bin/yt-dlp")) {
    return "/opt/homebrew/bin/yt-dlp";
  }

  // 5. Homebrew on Intel macOS / Linux via /usr/local
  if (existsSync("/usr/local/bin/yt-dlp")) {
    return "/usr/local/bin/yt-dlp";
  }

  // 6. PATH fallback (dev macOS, or any system with yt-dlp on PATH)
  return "yt-dlp";
}
