/**
 * Resolves the path to the yt-dlp binary.
 *
 * Resolution order:
 *  1. YT_DLP_PATH env var  — explicit override (Vercel env var for custom builds)
 *  2. youtube-dl-exec bundled binary — downloaded by pnpm postinstall into
 *     node_modules/youtube-dl-exec/bin/yt-dlp. The path is read from the
 *     package's own constants module so it stays in sync with YOUTUBE_DL_DIR.
 *  3. PATH fallback — bare "yt-dlp" string; works on dev macOS where yt-dlp
 *     is installed via homebrew. Fails on Vercel if the binary wasn't bundled.
 *
 * Vercel note:
 *   On Vercel the postinstall runs automatically via pnpm (pnpm.onlyBuiltDependencies
 *   includes youtube-dl-exec). The binary is bundled into the function via
 *   outputFileTracingIncludes in next.config.ts. No YT_DLP_PATH is needed unless
 *   you want to override the default location.
 *
 *   After bundling, chmod +x is applied automatically by Vercel (the binary is
 *   committed as executable). If you ever see EACCES errors, set:
 *     YT_DLP_PATH=/var/task/node_modules/.pnpm/youtube-dl-exec@<ver>/node_modules/youtube-dl-exec/bin/yt-dlp
 *   and add a vercel-build script that does: chmod +x $YT_DLP_PATH
 */
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

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

  // 2. youtube-dl-exec bundled binary
  try {
    const constants = _require(
      "youtube-dl-exec/src/constants",
    ) as { YOUTUBE_DL_PATH: string };
    if (constants.YOUTUBE_DL_PATH) {
      return constants.YOUTUBE_DL_PATH;
    }
  } catch {
    // Package not installed — fall through to PATH
  }

  // 3. PATH fallback (dev macOS, or any system with yt-dlp on PATH)
  return "yt-dlp";
}
