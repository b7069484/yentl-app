import { generateText } from "ai";

/**
 * Shared resilience policy for every Yentl AI call. All AI calls stay behind
 * the Vercel AI Gateway (OIDC auth via VERCEL_OIDC_TOKEN). This wrapper adds:
 *
 *   1. Explicit maxRetries (the AI SDK already retries 5xx with exponential
 *      backoff; we set a high-enough cap to survive transient Gateway hiccups
 *      without amplifying credit burn on a 4xx hot loop).
 *   2. AbortSignal-based timeout (default 30s). A stuck Gateway response
 *      should not pin a serverless function until its 5-minute hard wall.
 *   3. A single call-site for all routes so future hardening (cost-anomaly
 *      circuit breaker, cross-provider failover model strings, etc.) lives
 *      in one place.
 *
 * Cross-provider failover: when the AI Gateway is configured with multiple
 * providers (Gateway dashboard → Routing → Failover providers), the SDK
 * transparently routes around a single-provider outage. No code change here
 * is required — just dashboard config. This wrapper is forward-compatible.
 *
 * The "credit-exhaustion 500" failure mode the trimodal run hit is NOT a
 * code problem — it is a billing problem. It is handled operationally via
 * Gateway credit alerts + auto-top-up (see README "Gateway operations").
 */

export const DEFAULT_AI_TIMEOUT_MS = 30_000;
export const DEFAULT_AI_MAX_RETRIES = 3;

export interface AiCallOptions {
  /** Per-call timeout. Defaults to DEFAULT_AI_TIMEOUT_MS. */
  timeoutMs?: number;
  /** Per-call retry count. Defaults to DEFAULT_AI_MAX_RETRIES. */
  maxRetries?: number;
  /** Optional external AbortSignal that ORs with the timeout signal. */
  signal?: AbortSignal;
}

/**
 * Resilient generateText. Use this in every AI route instead of importing
 * generateText directly from "ai".
 *
 * Typed as a call-compatible alias of generateText so that TypeScript can
 * infer the full return type — including .output — from call-site arguments,
 * exactly as if the caller had called generateText directly.
 */
export const aiGenerateText: (
  args: Parameters<typeof generateText>[0] & { maxRetries?: number; abortSignal?: AbortSignal },
  options?: AiCallOptions,
) => ReturnType<typeof generateText> = async (
  args,
  options = {},
) => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_AI_MAX_RETRIES;

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  // If caller supplied their own signal, chain it.
  if (options.signal) {
    if (options.signal.aborted) timeoutController.abort();
    else options.signal.addEventListener("abort", () => timeoutController.abort(), { once: true });
  }

  try {
    return await generateText({
      ...args,
      maxRetries,
      abortSignal: timeoutController.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};
