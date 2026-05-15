/**
 * Tests for lib/server/ssrf-guard.ts (assertSafeUrl).
 * The existing tests/ssrf-guard.test.ts covers the helper functions in
 * app/api/source-preview/ssrf-guard.ts — this file covers the higher-level
 * assertSafeUrl() function exported from lib/server/ssrf-guard.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock dns.promises.lookup ─────────────────────────────────────────────────

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: vi.fn(),
  },
  lookup: vi.fn(),
}));

import dns from "node:dns/promises";

const mockLookup = dns.lookup as ReturnType<typeof vi.fn>;

// ─── Import under test (after mocks are set up) ───────────────────────────────

import { assertSafeUrl } from "@/lib/server/ssrf-guard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lookupReturns(addresses: string[]) {
  mockLookup.mockResolvedValue(
    addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })),
  );
}

function lookupThrows(msg = "ENOTFOUND example.com") {
  mockLookup.mockRejectedValue(Object.assign(new Error(msg), { code: "ENOTFOUND" }));
}

async function expectSsrfBlocked(url: string) {
  await expect(assertSafeUrl(url)).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
}

async function expectInvalidUrl(url: string) {
  await expect(assertSafeUrl(url)).rejects.toMatchObject({ code: "INVALID_URL" });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("assertSafeUrl — public URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves for a public HTTPS URL (example.com/foo.mp3)", async () => {
    lookupReturns(["93.184.216.34"]);
    await expect(assertSafeUrl("https://example.com/foo.mp3")).resolves.toBeUndefined();
  });

  it("resolves for a public HTTP URL", async () => {
    lookupReturns(["1.2.3.4"]);
    await expect(assertSafeUrl("http://podcast.example.com/episode.mp3")).resolves.toBeUndefined();
  });
});

describe("assertSafeUrl — invalid schemes", () => {
  it("throws INVALID_URL for file:// URLs", async () => {
    await expectInvalidUrl("file:///etc/passwd");
  });

  it("throws INVALID_URL for ftp:// URLs", async () => {
    await expectInvalidUrl("ftp://example.com/audio.mp3");
  });

  it("throws INVALID_URL for completely invalid URL string", async () => {
    await expectInvalidUrl("not a url at all");
  });

  it("throws INVALID_URL for empty string", async () => {
    await expectInvalidUrl("");
  });
});

describe("assertSafeUrl — literal IP addresses (no DNS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws SSRF_BLOCKED for http://localhost/foo (requires DNS)", async () => {
    // localhost resolves via DNS to 127.0.0.1
    lookupReturns(["127.0.0.1"]);
    await expectSsrfBlocked("http://localhost/foo");
  });

  it("throws SSRF_BLOCKED for literal 127.0.0.1", async () => {
    // literal IP → skips DNS
    await expectSsrfBlocked("http://127.0.0.1/foo");
  });

  it("throws SSRF_BLOCKED for literal 10.0.0.1", async () => {
    await expectSsrfBlocked("http://10.0.0.1/foo");
  });

  it("throws SSRF_BLOCKED for literal 172.16.0.1", async () => {
    await expectSsrfBlocked("http://172.16.0.1/foo");
  });

  it("throws SSRF_BLOCKED for literal 192.168.1.1", async () => {
    await expectSsrfBlocked("http://192.168.1.1/foo");
  });

  it("throws SSRF_BLOCKED for literal ::1 (IPv6 loopback)", async () => {
    await expectSsrfBlocked("http://[::1]/foo");
  });

  it("throws SSRF_BLOCKED for literal 0.0.0.0", async () => {
    await expectSsrfBlocked("http://0.0.0.0/foo");
  });

  it("throws SSRF_BLOCKED for 169.254.169.254 (AWS metadata)", async () => {
    await expectSsrfBlocked("http://169.254.169.254/latest/meta-data");
  });
});

describe("assertSafeUrl — DNS resolution to private IPs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws SSRF_BLOCKED when hostname resolves to 10.x.x.x", async () => {
    lookupReturns(["10.0.0.1"]);
    await expectSsrfBlocked("https://internal.corp/audio.mp3");
  });

  it("throws SSRF_BLOCKED when hostname resolves to 192.168.x.x", async () => {
    lookupReturns(["192.168.1.100"]);
    await expectSsrfBlocked("https://router.local/audio.mp3");
  });

  it("throws SSRF_BLOCKED when hostname resolves to 172.16.x.x", async () => {
    lookupReturns(["172.20.0.5"]);
    await expectSsrfBlocked("https://vpn.internal/audio.mp3");
  });

  it("throws SSRF_BLOCKED when hostname resolves to 127.x.x.x", async () => {
    lookupReturns(["127.0.0.1"]);
    await expectSsrfBlocked("https://loopback.local/audio.mp3");
  });

  it("throws SSRF_BLOCKED when any resolved address is private (mixed)", async () => {
    lookupReturns(["1.2.3.4", "10.0.0.1"]);
    await expectSsrfBlocked("https://sneaky.example.com/audio.mp3");
  });

  it("throws SSRF_BLOCKED when DNS lookup fails (fail-closed)", async () => {
    lookupThrows("ENOTFOUND");
    await expectSsrfBlocked("https://nonexistent-host-xyz.example.com/audio.mp3");
  });
});

describe("assertSafeUrl — DNS mocked to public IPs", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves when all DNS addresses are public", async () => {
    lookupReturns(["93.184.216.34", "93.184.216.35"]);
    await expect(assertSafeUrl("https://multi-a.example.com/ep.mp3")).resolves.toBeUndefined();
  });
});
