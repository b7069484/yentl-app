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
    expect(source).toContain('runCheck("invalid-save-json-guard"');
    expect(source).toContain('runCheck("invalid-rename-json-guard"');
    expect(source).toContain('runCheck("unconfigured-list-response"');
  });

  it("supports optional authenticated CRUD proof when an auth header is provided", () => {
    expect(source).toContain("YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER");
    expect(source).toContain('runCheck("authenticated-save-load-rename-list-tv-delete"');
    expect(source).toContain("Renamed cloud sync proof");
    expect(source).toContain("load_after_save_status");
    expect(source).toContain("list_after_rename_status");
    expect(source).toContain("tv_restore_path");
    expect(source).toContain("post_delete_load_status");
  });

  it("supports authenticated two-profile browser restore proof", () => {
    expect(source).toContain('runCheck("authenticated-two-profile-browser-restore"');
    expect(source).toContain("proveAuthenticatedTwoProfileBrowserRestore");
    expect(source).toContain("proveTwoBrowserProfilesRestore");
    expect(source).toContain("profile-a");
    expect(source).toContain("profile-b");
    expect(source).toContain("Network.setExtraHTTPHeaders");
    expect(source).toContain("Cloud sync two-profile proof");
    expect(source).toContain("/session?restore=");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/cloud-sync-local-proof.json");
    expect(source).toContain("docs/superpowers/validation/cloud-sync-deploy-proof.json");
    expect(source).toContain("cloud_configured");
    expect(source).toContain("cloud_mode");
    expect(source).toContain("authenticated_proof_skipped");
  });
});
