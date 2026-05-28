/**
 * Deepgram WebSocket URL selector — picks US (default) or EU endpoint based on
 * `NEXT_PUBLIC_DEEPGRAM_REGION`.
 *
 * Why this exists:
 *   - GDPR cross-border-transfer rules (Article 44-49) require lawful basis
 *     for moving EU personal data to a US processor. Sending EU users to
 *     Deepgram's EU endpoint (api.eu.deepgram.com) keeps the audio data on
 *     EU infrastructure and avoids that transfer entirely.
 *   - Zero-cost compliance lever per yentl-this-week-actions clause 2.
 *
 * Usage:
 *   - Set `NEXT_PUBLIC_DEEPGRAM_REGION=eu` for EU-region traffic in production.
 *   - Leave unset (or `us`) for default US routing.
 *   - Unknown values fall back to US with a console warning so config typos
 *     fail loud, not silent.
 */

const US_WS_URL = "wss://api.deepgram.com/v1/listen";
const EU_WS_URL = "wss://api.eu.deepgram.com/v1/listen";

export type DeepgramRegion = "us" | "eu";

export function getDeepgramWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_DEEPGRAM_REGION;
  if (raw === undefined || raw === "") return US_WS_URL;
  const region = raw.toLowerCase();
  if (region === "eu") return EU_WS_URL;
  if (region === "us") return US_WS_URL;
  console.warn(
    `[deepgram] Unknown NEXT_PUBLIC_DEEPGRAM_REGION="${raw}" — falling back to US endpoint.`,
  );
  return US_WS_URL;
}
