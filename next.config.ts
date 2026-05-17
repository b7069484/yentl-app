import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Bundle the yt-dlp binary into the YouTube ingest function.
   *
   * On Vercel: the `vercel-build` script downloads the standalone yt-dlp_linux
   * binary (a PyInstaller-built executable that bundles Python) to ./bin/yt-dlp
   * BEFORE next build runs. The `./bin/**` glob then includes it in the
   * function bundle. Vercel's Node runtime has no Python interpreter, so the
   * youtube-dl-exec npm package (a python3-shebanged script) won't work there.
   *
   * Local dev: youtube-dl-exec stays as a backup for macOS / Linux where
   * Python is present. The yt-dlp-binary resolver checks ./bin/yt-dlp first.
   *
   * See: https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
   */
  outputFileTracingIncludes: {
    "/api/youtube-ingest": [
      // Standalone Linux binary downloaded by vercel-build — primary for Vercel.
      "./bin/**",
      // Local dev fallback paths (Python-script youtube-dl-exec).
      "./node_modules/.pnpm/youtube-dl-exec@*/node_modules/youtube-dl-exec/bin/**",
      "./node_modules/youtube-dl-exec/bin/**",
    ],
  },
};

export default nextConfig;
