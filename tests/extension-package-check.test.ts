import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("extension package check", () => {
  it("passes the deterministic launch-manifest verifier", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/validation/check-extension-package.mjs"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );
    const jsonStart = output.indexOf("{");
    const report = JSON.parse(output.slice(jsonStart));

    expect(report.ok).toBe(true);
    expect(report.manifest_version).toBe(3);
    expect(report.store_readiness.mv3).toBe(true);
    expect(report.store_readiness.production_host_permission).toBe(true);
    expect(report.store_readiness.icons_declared).toBe(true);
    expect(report.store_readiness.listing_metadata_present).toBe(true);
    expect(report.store_readiness.permission_rationales_complete).toBe(true);
    expect(report.store_listing.privacy_policy_url).toBe("https://yentl.it/privacy");
    expect(report.store_listing.support_url).toBe("https://yentl.it/contact");
    expect(report.store_listing.screenshots).toContain(
      "docs/superpowers/validation/screenshots/chrome-store-extension-panel-1280x800.png",
    );
    expect(report.checked_files).toContain("extension/manifest.json");
    expect(report.checked_files).toContain("extension/popup.js");
    expect(report.checked_files).toContain("extension/icons/icon-128.png");
    expect(report.checked_files).toContain("docs/superpowers/chrome-web-store-listing.json");
  });
});
