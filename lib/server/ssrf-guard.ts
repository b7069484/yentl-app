import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
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

export type SafeUrlResolution = {
  url: URL;
  address: string;
  family: number;
};

export type SafeFetchOptions = {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

export type SafeFetchResponse = {
  status: number;
  ok: boolean;
  headers: Headers;
  finalUrl: string;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

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
 * SECURITY NOTE: assertSafeUrl() is a submit-time gate. Routes that fetch
 * server-side should prefer fetchWithSsrfGuard(), which resolves, validates,
 * pins the public IP for the request, and re-validates every redirect. Routes
 * that pass a URL to a downstream fetcher still have a TOCTOU window unless
 * that downstream fetcher or an intermediate proxy applies the same guard.
 */
export async function assertSafeUrl(url: string): Promise<void> {
  await resolveSafeUrl(url);
}

export async function resolveSafeUrl(url: string): Promise<SafeUrlResolution> {
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
    return { url: parsed, address: bareHost, family: net.isIP(bareHost) };
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

  return { url: parsed, address: addrs[0].address, family: addrs[0].family };
}

export async function fetchWithSsrfGuard(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResponse> {
  const maxRedirects = options.maxRedirects ?? 4;
  return fetchWithSsrfGuardInner(url, options, maxRedirects, 0);
}

async function fetchWithSsrfGuardInner(
  url: string,
  options: SafeFetchOptions,
  maxRedirects: number,
  redirectCount: number,
): Promise<SafeFetchResponse> {
  if (redirectCount > maxRedirects) {
    throw makeError("SSRF_BLOCKED", "Too many redirects while fetching this URL.");
  }

  const resolved = await resolveSafeUrl(url);
  const response = await requestPinnedUrl(resolved, options);

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return response;
    const nextUrl = new URL(location, resolved.url).toString();
    return fetchWithSsrfGuardInner(nextUrl, options, maxRedirects, redirectCount + 1);
  }

  return response;
}

function requestPinnedUrl(
  resolved: SafeUrlResolution,
  options: SafeFetchOptions,
): Promise<SafeFetchResponse> {
  const url = resolved.url;
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const transport = url.protocol === "https:" ? https : http;
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  const path = `${url.pathname || "/"}${url.search}`;
  const headers = {
    ...(options.headers ?? {}),
    Host: url.host,
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const finishResolve = (response: SafeFetchResponse) => {
      if (settled) return;
      settled = true;
      resolve(response);
    };

    const req = transport.request(
      {
        protocol: url.protocol,
        host: resolved.address,
        port,
        method,
        path,
        headers,
        servername: net.isIP(url.hostname) ? undefined : url.hostname,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const status = res.statusCode ?? 0;
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) {
            responseHeaders.set(key, value.join(", "));
          } else if (value !== undefined) {
            responseHeaders.set(key, String(value));
          }
        }

        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy();
            finishReject(new Error("Response body exceeded the configured size limit."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          finishResolve({
            status,
            ok: status >= 200 && status < 300,
            headers: responseHeaders,
            finalUrl: url.toString(),
            text: async () => body.toString("utf8"),
            arrayBuffer: async () =>
              body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
          });
        });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      finishReject(new Error("Request timed out while fetching this URL."));
    });
    req.on("error", finishReject);
    req.end();
  });
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
