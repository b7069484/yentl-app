import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("extension latency sampler", () => {
  it("summarizes existing extension proof artifacts without launching Chrome", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "yentl-extension-latency-test-"));
    const outputPath = join(tempDir, "latency.json");

    try {
      const output = execFileSync(process.execPath, ["scripts/validation/sample-extension-latency.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          YENTL_EXTENSION_LATENCY_FROM_EXISTING: "1",
          YENTL_EXTENSION_LATENCY_OUTPUT: outputPath,
        },
      });
      const report = JSON.parse(output.slice(output.indexOf("{")));
      const written = JSON.parse(readFileSync(outputPath, "utf8"));

      expect(report.ok).toBe(true);
      expect(report.source).toBe("existing-proof-artifacts");
      expect(report.sample_count).toBeGreaterThanOrEqual(1);
      expect(report.latency_ms.total_ms.count).toBeGreaterThanOrEqual(1);
      expect(written.sample_count).toBe(report.sample_count);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("has a live repeat-run mode that defaults to headless temp-profile proof", () => {
    const source = readFileSync("scripts/validation/sample-extension-latency.mjs", "utf8");

    expect(source).toContain("YENTL_EXTENSION_LATENCY_RUNS");
    expect(source).toContain("YENTL_EXTENSION_PROOF_HEADLESS");
    expect(source).toContain("prove-installed-extension-local.mjs");
    expect(source).toContain("extension-latency-samples.json");
    expect(source).toContain("live-proof-runs");
  });
});
