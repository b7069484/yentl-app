// Reasoning model routed through Vercel AI Gateway.
// The AI SDK auto-routes any plain "provider/model" string through the gateway.
// Auth comes from VERCEL_OIDC_TOKEN (written to .env.local by `vercel env pull`).
// Verify slug: `curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '.data[].id' | grep claude-opus`.
export const opus = "anthropic/claude-opus-4.7" as const;
