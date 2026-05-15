import dns from "node:dns/promises";
import net from "node:net";

/** Returns true if the URL uses the http or https scheme; false otherwise. */
export function isHttpScheme(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Checks whether an IP address string (IPv4 or IPv6) is in a private/reserved range.
 * Fail-closed: malformed input returns true (= private).
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // unrecognised → fail closed
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  ) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true;                              // 0.0.0.0/8
  if (a === 10) return true;                             // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true;    // CGNAT 100.64/10
  if (a === 127) return true;                            // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;               // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;     // 172.16.0.0/12
  if (a === 192 && b === 0) return true;                 // 192.0.0.0/24, 192.0.2.0/24
  if (a === 192 && b === 168) return true;               // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true;  // perf test range
  if (a === 198 && b === 51) return true;                // documentation
  if (a === 203 && b === 0) return true;                 // documentation
  if (a >= 224) return true;                             // multicast + reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;    // unspecified + loopback
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (lower.startsWith("fe80")) return true;             // link-local fe80::/10
  if (lower.startsWith("ff")) return true;               // multicast ff00::/8
  // IPv4-mapped IPv6 ::ffff:a.b.c.d — check embedded IPv4
  const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) return isPrivateIpv4(v4mapped[1]);
  return false;
}

interface SsrfError extends Error {
  code: "SSRF_BLOCKED" | "INVALID_URL";
}

function makeError(
  code: "SSRF_BLOCKED" | "INVALID_URL",
  message: string,
): SsrfError {
  const err = new Error(message) as SsrfError;
  err.code = code;
  return err;
}

/**
 * Asserts that the given URL is safe to fetch server-side.
 *
 * Throws an Error with `code` property set to:
 * - "INVALID_URL"   — not a valid URL, or scheme is not http/https
 * - "SSRF_BLOCKED"  — hostname resolves to a private/reserved IP address
 *
 * Safe URLs (https://example.com/foo.mp3) return void.
 *
 * SECURITY NOTE: This validates DNS at submission time. The downstream consumer
 * (e.g., Deepgram) will resolve DNS independently when it fetches the URL,
 * creating a TOCTOU window for DNS-rebinding attacks. Full mitigation requires
 * server-side proxying (fetching the bytes ourselves and re-validating the
 * resolved IP) — out of scope for v1.2. Acceptable for now given the limited
 * attack surface (no fetch-back, no auth cookies forwarded).
 */
export async function assertSafeUrl(url: string): Promise<void> {
  // 1. Parse and validate
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw makeError("INVALID_URL", `Not a valid URL: "${url}"`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw makeError(
      "INVALID_URL",
      `Only http and https are allowed (got "${parsed.protocol}")`,
    );
  }

  const { hostname } = parsed;

  // 2. If hostname is a literal IP, check it directly without DNS.
  // URL.hostname wraps IPv6 addresses in brackets (e.g. "[::1]") — strip them
  // before passing to net.isIP / isPrivateIp.
  const bareHost =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;

  if (net.isIP(bareHost)) {
    if (isPrivateIp(bareHost)) {
      throw makeError(
        "SSRF_BLOCKED",
        `URL resolved to a private address: ${bareHost}`,
      );
    }
    return;
  }

  // 3. Resolve via DNS and check every returned address
  let addrs: { address: string; family: number }[];
  try {
    addrs = await dns.lookup(bareHost, { all: true });
  } catch (e) {
    // DNS failure → fail closed to avoid bypasses via NXDOMAIN tricks
    throw makeError(
      "SSRF_BLOCKED",
      `DNS lookup failed for "${bareHost}": ${(e as Error).message}`,
    );
  }

  for (const { address } of addrs) {
    if (isPrivateIp(address)) {
      throw makeError(
        "SSRF_BLOCKED",
        `"${bareHost}" resolves to a private address (${address})`,
      );
    }
  }
}

/**
 * Compat wrapper for callers that prefer a null-on-success / string-on-error
 * contract (e.g. app/api/source-preview/route.ts).
 *
 * Returns null when the URL is safe; returns a short reason string when it is
 * blocked. This preserves the existing source-preview API contract while
 * delegating all logic to the canonical assertSafeUrl() above.
 */
export async function ssrfReject(url: string): Promise<string | null> {
  try {
    await assertSafeUrl(url);
    return null;
  } catch (e: unknown) {
    return (e as Error).message ?? "blocked";
  }
}
