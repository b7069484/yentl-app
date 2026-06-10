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
    expect(report.checked_files).toContain("extension/manifest.json");
    expect(report.checked_files).toContain("extension/popup.js");
  });
});
