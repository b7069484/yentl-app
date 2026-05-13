import dns from "node:dns/promises";
import net from "node:net";

export function isHttpScheme(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fail-closed. Returns true (= block) for:
 * - Malformed inputs
 * - IPv4: 0/8, 10/8, 100.64/10 (CGNAT), 127/8, 169.254/16 (link-local + AWS metadata),
 *         172.16/12, 192.0.0/24, 192.0.2/24, 192.168/16, 198.18/15 (perf-test),
 *         198.51.100/24, 203.0.113/24, 224/4 (multicast), 240/4 (reserved)
 * - IPv6: ::, ::1, fc00::/7, fe80::/10, ff00::/8 (multicast), IPv4-mapped private
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const v = net.isIP(ip);
  if (v === 4) return isPrivateIpv4(ip);
  if (v === 6) return isPrivateIpv6(ip);
  return true;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;       // CGNAT
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;                  // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0) return true;                    // RFC 6890
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;     // perf test
  if (a === 198 && b === 51) return true;                   // documentation
  if (a === 203 && b === 0) return true;                    // documentation
  if (a >= 224) return true;                                 // multicast + reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;  // ULA
  if (lower.startsWith("fe80")) return true;                            // link-local
  if (lower.startsWith("ff")) return true;                              // multicast
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — recurse on the embedded IPv4
  const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) return isPrivateIpv4(v4mapped[1]);
  return false;
}

/**
 * Resolve the URL's hostname and verify none of the resolved addresses are private.
 * Returns null if safe; otherwise a short reason string for logging.
 */
export async function ssrfReject(url: string): Promise<string | null> {
  if (!isHttpScheme(url)) return "non-http scheme";
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return "malformed url";
  }
  // If hostname is already a literal IP, check it directly
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) return "literal private ip";
    return null;
  }
  // DNS resolve and check every address
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    for (const a of addrs) {
      if (isPrivateIp(a.address)) return `resolved to private ip (${a.address})`;
    }
    return null;
  } catch {
    return "dns lookup failed";
  }
}
