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
    // pnpm uses a content-addressable layout — `node_modules/youtube-dl-exec`
    // is a symlink to `node_modules/.pnpm/youtube-dl-exec@x.y.z/...`. Next.js
    // (@vercel/nft) resolves symlinks before matching, so the real-path glob
    // is required for pnpm. The symlink-path glob is kept for npm/yarn safety
    // and for the case where Next.js's behavior changes.
    "/api/youtube-ingest": [
      "./node_modules/.pnpm/youtube-dl-exec@*/node_modules/youtube-dl-exec/bin/**",
      "./node_modules/youtube-dl-exec/bin/**",
    ],
  },
};

export default nextConfig;
