import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/validation/create-launch-canary-templates.mjs", "utf8");

describe("launch canary template generator", () => {
  it("is exposed as a package script and writes only template artifacts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

    expect(pkg.scripts["release:canary-templates"]).toBe(
      "node scripts/validation/create-launch-canary-templates.mjs",
    );
    expect(source).toContain("sensitive-attribution-reviews.template.json");
    expect(source).toContain("mobile-device-canaries.template.json");
    expect(source).toContain("large-real-media-canaries.template.json");
    expect(source).toContain("launch-canary-template-summary.json");
  });

  it("keeps launch gates honest by pointing templates at separate real manifests", () => {
    expect(source).toContain("agent-work/validation/sensitive-attribution-reviews.json");
    expect(source).toContain("agent-work/validation/mobile-device-canaries.json");
    expect(source).toContain("agent-work/validation/large-real-media-canaries.json");
    expect(source).toContain("approved_for_public_claims");
    expect(source).toContain("pending_editorial_review");
    expect(source).toContain("status: \"pending\"");
  });

  it("dry-runs the template summary without creating passing evidence", () => {
    const output = execFileSync("node", ["scripts/validation/create-launch-canary-templates.mjs", "--dry-run"], {
      encoding: "utf8",
    });
    const summary = JSON.parse(output) as {
      dry_run: boolean;
      templates: Array<{ id: string; path: string; copy_to_manifest_path: string; proof_command: string }>;
    };

    expect(summary.dry_run).toBe(true);
    expect(summary.templates.map((template) => template.id)).toEqual([
      "sensitive-attribution-review",
      "mobile-device-canaries",
      "large-real-media-canaries",
    ]);
    expect(summary.templates[0].path).toBe("agent-work/validation/sensitive-attribution-reviews.template.json");
    expect(summary.templates[0].copy_to_manifest_path).toBe(
      "agent-work/validation/sensitive-attribution-reviews.json",
    );
    expect(summary.templates[2].proof_command).toBe("npm run ingestion:proof:large-real-media");
  });
});
