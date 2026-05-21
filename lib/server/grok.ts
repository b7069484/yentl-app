// Grok model routed through Vercel AI Gateway.
// The gateway model list currently exposes xAI slugs via the existing
// VERCEL_OIDC_TOKEN, so no separate XAI_API_KEY is required in local dev.
export const grok = process.env.YENTL_GROK_MODEL || "xai/grok-4.1-fast-reasoning";
