import { describe, it, expect, vi } from "vitest";

// Clerk's clerkMiddleware wraps a handler; in test we stub it to a passthrough
// so we can drive the inner function directly. createRouteMatcher returns a
// predicate — stub to always-false so no route is treated as protected (we're
// only verifying security headers here).
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: unknown) => handler,
  createRouteMatcher: () => () => false,
}));

// Phase 1c Task 1 — Next.js 16 renamed middleware.ts → proxy.ts. Tests live
// here under the legacy name for grep-friendliness with the audit doc ("Sprint 4
// #29 middleware.ts with rate-limit + security headers"), but the implementation
// is at /proxy.ts.
import proxy from "@/proxy";

function makeReq(url = "https://yentl.it/methodology") {
  return new Request(url, { method: "GET" });
}

// Drive both branches: clerkConfigured=false (keyless) and clerkConfigured=true
// (the Clerk-wrapped path). Our mock makes both behave the same — passthrough
// handler with no auth — so a single set of tests covers both since we just
// verify header attachment.

describe("proxy — security headers (Phase 1c Task 1)", () => {
  it("attaches Strict-Transport-Security with 2-year max-age + preload", async () => {
    const res = (await proxy(makeReq() as never, {} as never)) as Response;
    const hsts = res.headers.get("strict-transport-security");
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("attaches X-Content-Type-Options: nosniff", async () => {
    const res = (await proxy(makeReq() as never, {} as never)) as Response;
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("attaches X-Frame-Options: DENY (defense in depth alongside CSP)", async () => {
    const res = (await proxy(makeReq() as never, {} as never)) as Response;
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("attaches Referrer-Policy: strict-origin-when-cross-origin", async () => {
    const res = (await proxy(makeReq() as never, {} as never)) as Response;
    expect(res.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("attaches Permissions-Policy denying camera + geolocation; allowing mic (self)", async () => {
    const res = (await proxy(makeReq() as never, {} as never)) as Response;
    const policy = res.headers.get("permissions-policy") ?? "";
    expect(policy).toMatch(/camera=\(\)/);
    expect(policy).toMatch(/geolocation=\(\)/);
    expect(policy).toMatch(/microphone=\(self\)/);
  });

  it("attaches X-DNS-Prefetch-Control: on", async () => {
    const res = (await proxy(makeReq() as never, {} as never)) as Response;
    expect(res.headers.get("x-dns-prefetch-control")).toBe("on");
  });

  it("attaches headers on API routes too (no path-based stripping)", async () => {
    const res = (await proxy(makeReq("https://yentl.it/api/sessions") as never, {} as never)) as Response;
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security")).toBeTruthy();
  });
});
