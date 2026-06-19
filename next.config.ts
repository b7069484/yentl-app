import type { NextConfig } from "next";
import { securityHeaders } from "./lib/server/security-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd(),
  },
  /**
   * Security response headers on every route (yentl-hardening-pass clause 9).
   * Static headers live here rather than in `proxy.ts` so they cannot alter
   * request handling and apply uniformly. See lib/server/security-headers.ts
   * (note the deliberate microphone exception for Deepgram live capture).
   */
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
    "/api/document-ingest": ["./node_modules/pdf-parse/dist/worker/pdf.worker.mjs"],
  },
};

export default nextConfig;
