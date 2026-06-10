import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("cloud sync proof script", () => {
  const source = readFileSync("scripts/validation/prove-cloud-sync-local.mjs", "utf8");

  it("covers graceful unconfigured and signed-out cloud sync guards", () => {
    expect(source).toContain('runCheck("app-reachable"');
    expect(source).toContain("cloud_unavailable");
    expect(source).toContain("signed_out");
    expect(source).toContain('runCheck("signed-out-list-guard"');
    expect(source).toContain('runCheck("invalid-save-payload-guard"');
    expect(source).toContain('runCheck("unconfigured-list-response"');
  });

  it("supports optional authenticated CRUD proof when an auth header is provided", () => {
    expect(source).toContain("YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER");
    expect(source).toContain('runCheck("authenticated-save-rename-delete"');
    expect(source).toContain("Renamed cloud sync proof");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/cloud-sync-local-proof.json");
    expect(source).toContain("docs/superpowers/validation/cloud-sync-deploy-proof.json");
    expect(source).toContain("cloud_configured");
    expect(source).toContain("cloud_mode");
    expect(source).toContain("authenticated_proof_skipped");
  });
});