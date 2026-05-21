import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
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
      // Standalone Linux binary downloaded by vercel-build — only file needed
      // on Vercel. Targeting the specific file avoids glob-matching the
      // symlinked node_modules/.pnpm directories which Vercel rejects.
      "./bin/yt-dlp",
    ],
  },
};

export default nextConfig;
