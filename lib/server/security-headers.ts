/**
 * Security response headers (yentl-hardening-pass GOAL clause 9).
 *
 * Applied to every response via `headers()` in `next.config.ts` rather than a
 * root middleware/`proxy.ts` block. Rationale: these are STATIC headers with no
 * per-request logic, so the declarative config path is lower-risk — it cannot
 * alter request handling, applies uniformly to all routes and static assets,
 * and keeps the existing per-route rate-limiting (`lib/server/rate-limit.ts`)
 * and the `proxy.ts` auth gate untouched.
 *
 * MICROPHONE EXCEPTION: `Permissions-Policy` disables camera, geolocation, and
 * payment, but DELIBERATELY PRESERVES `microphone=(self)`. Yentl's live capture
 * streams mic audio directly from the browser to Deepgram (`getUserMedia` →
 * `lib/client/deepgram-stream.ts`); disabling the microphone feature would break
 * the product's core live-transcription path. Same-origin (`self`) only — no
 * third-party frame is granted mic access.
 *
 * The CSP ships as `Content-Security-Policy-Report-Only` (observe, don't
 * enforce) so it cannot break the app while the allowlist is validated against
 * real traffic. Promote to an enforcing `Content-Security-Policy` once reports
 * are clean. Allowlist covers: Deepgram (STT WS + batch), the Vercel AI Gateway
 * / Anthropic model endpoints, Clerk (auth), and YouTube (thumbnails + embeds).
 */

/** Connect/script/frame/img sources the app legitimately reaches. */
const DEEPGRAM = "https://*.deepgram.com wss://*.deepgram.com";
const AI_GATEWAY = "https://ai-gateway.vercel.sh https://api.anthropic.com";
const CLERK = "https://*.clerk.accounts.dev https://*.clerk.com";
const YOUTUBE_FRAME = "https://www.youtube.com https://www.youtube-nocookie.com";
const YTIMG = "https://i.ytimg.com https://*.ytimg.com";

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  `connect-src 'self' ${DEEPGRAM} ${AI_GATEWAY} ${CLERK}`,
  // Next.js requires inline/eval in its runtime; tightened on enforce.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${CLERK}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${YTIMG} https://img.clerk.com`,
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  `frame-src 'self' ${YOUTUBE_FRAME} ${CLERK}`,
  "worker-src 'self' blob:",
].join("; ");

/**
 * Permissions-Policy. camera/geolocation/payment disabled; microphone allowed
 * for same-origin only (Deepgram live capture — see module docstring).
 */
export const PERMISSIONS_POLICY =
  "camera=(), geolocation=(), payment=(), microphone=(self)";

export type SecurityHeader = { key: string; value: string };

export const securityHeaders: SecurityHeader[] = [
  // Force HTTPS for two years incl. subdomains; eligible for the preload list.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Block MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send origin (not full path/query) on cross-origin navigation.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Feature gating — microphone preserved for live transcription.
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  // Observe-only CSP; promote to enforcing once reports are clean.
  { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY },
];
