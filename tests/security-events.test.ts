import { afterEach, describe, expect, it, vi } from "vitest";

const blobMocks = vi.hoisted(() => ({
  put: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: blobMocks.put,
}));

describe("security event sink", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    blobMocks.put.mockReset();
  });

  it("persists security events to private Vercel Blob when the blob sink is enabled", async () => {
    vi.stubEnv("YENTL_SECURITY_EVENT_SINK", "blob");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    blobMocks.put.mockResolvedValue({ url: "https://blob.example/security-event.json" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { recordSecurityEvent } = await import("@/lib/server/security-events");
    await recordSecurityEvent(
      "claim_scope_classifier_unavailable",
      { route: "/api/verify-provisional", reason: "gateway unavailable" },
      "error",
    );

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("claim_scope_classifier_unavailable"));
    expect(blobMocks.put).toHaveBeenCalledWith(
      expect.stringMatching(/^security-events\/\d{4}-\d{2}-\d{2}\//),
      expect.stringContaining("\"claim_scope_classifier_unavailable\""),
      expect.objectContaining({
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
      }),
    );
  });

  it("keeps console-only behavior when no persistent sink is configured", async () => {
    vi.stubEnv("YENTL_SECURITY_EVENT_SINK", "console");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { recordSecurityEvent } = await import("@/lib/server/security-events");
    await recordSecurityEvent("rate_limited", { route: "/api/test" });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("rate_limited"));
    expect(blobMocks.put).not.toHaveBeenCalled();
  });
});
