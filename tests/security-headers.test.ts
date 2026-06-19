import { describe, it, expect } from "vitest";
import {
  securityHeaders,
  PERMISSIONS_POLICY,
  CONTENT_SECURITY_POLICY,
} from "@/lib/server/security-headers";

/**
 * Guards yentl-hardening-pass GOAL clause 9. The spec named this
 * `tests/middleware.test.ts`; the headers ship via `next.config.ts` `headers()`
 * (not a root middleware/`proxy.ts`), so the test is named for what it covers.
 * It asserts the exported header set that `next.config.ts` applies to `/:path*`.
 */
function headerValue(key: string): string | undefined {
  return securityHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
}

describe("security response headers", () => {
  it("sets HSTS with two-year max-age, subdomains, and preload", () => {
    expect(headerValue("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("blocks MIME sniffing", () => {
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets a privacy-preserving Referrer-Policy", () => {
    expect(headerValue("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("ships a Permissions-Policy that disables camera/geolocation/payment", () => {
    const pp = headerValue("Permissions-Policy");
    expect(pp).toBe(PERMISSIONS_POLICY);
    expect(pp).toContain("camera=()");
    expect(pp).toContain("geolocation=()");
    expect(pp).toContain("payment=()");
  });

  it("PRESERVES microphone for same-origin Deepgram live capture (regression guard)", () => {
    const pp = headerValue("Permissions-Policy") ?? "";
    // The mic must be allowed for self — never `microphone=()` (would break live transcription).
    expect(pp).toContain("microphone=(self)");
    expect(pp).not.toContain("microphone=()");
  });

  it("ships CSP in Report-Only mode (observe, do not enforce)", () => {
    expect(headerValue("Content-Security-Policy-Report-Only")).toBe(CONTENT_SECURITY_POLICY);
    // Must NOT also ship an enforcing CSP yet.
    expect(headerValue("Content-Security-Policy")).toBeUndefined();
  });

  it("CSP defaults to self and allowlists Deepgram + AI Gateway", () => {
    const csp = headerValue("Content-Security-Policy-Report-Only") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://*.deepgram.com");
    expect(csp).toContain("wss://*.deepgram.com");
    expect(csp).toContain("https://ai-gateway.vercel.sh");
    expect(csp).toContain("https://api.anthropic.com");
  });

  it("exposes exactly the five required hardening headers", () => {
    const keys = securityHeaders.map((h) => h.key);
    expect(keys).toEqual([
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy-Report-Only",
    ]);
  });
});
