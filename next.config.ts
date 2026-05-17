import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Bundle the yt-dlp binary (downloaded by youtube-dl-exec postinstall) into
   * the YouTube ingest function so it's available on Vercel's Node.js runtime.
   *
   * The glob is matched against paths relative to the project root.
   * The key `/api/youtube-ingest` matches the route path for
   * app/api/youtube-ingest/route.ts.
   *
   * See: https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
   */
  outputFileTracingIncludes: {
    "/api/youtube-ingest": [
      "./node_modules/youtube-dl-exec/bin/**",
    ],
  },
};

export default nextConfig;
