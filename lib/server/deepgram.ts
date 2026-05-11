import { DeepgramClient } from "@deepgram/sdk";

const TOKEN_TTL_SECONDS = 600; // 10 minutes

let _client: DeepgramClient | null = null;

function getClient(): DeepgramClient {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPGRAM_API_KEY is not set. Add it to .env.local before calling mintToken().",
    );
  }
  if (!_client) {
    _client = new DeepgramClient({ apiKey });
  }
  return _client;
}

export interface DeepgramToken {
  /** Short-lived JWT to be used by the browser when opening a Deepgram WebSocket. */
  key: string;
  /** ISO-8601 timestamp at which the token expires. */
  expires_at: string;
}

/**
 * Mint a short-lived (~10 min) Deepgram JWT scoped to streaming usage.
 *
 * Uses the v5 SDK's `auth.v1.tokens.grant` endpoint, which returns a temporary
 * JWT with `usage:write` permission only — safe to hand to the browser. The
 * long-lived `DEEPGRAM_API_KEY` never leaves the server.
 */
export async function mintToken(): Promise<DeepgramToken> {
  const client = getClient();

  const response = await client.auth.v1.tokens.grant({
    ttl_seconds: TOKEN_TTL_SECONDS,
  });

  if (!response?.access_token) {
    throw new Error("Deepgram returned no access_token");
  }

  // Prefer the SDK-reported lifetime; fall back to the TTL we requested.
  const ttl =
    typeof response.expires_in === "number" && response.expires_in > 0
      ? response.expires_in
      : TOKEN_TTL_SECONDS;

  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  return {
    key: response.access_token,
    expires_at: expiresAt,
  };
}
