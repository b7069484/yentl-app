import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("launch smoke harness", () => {
  it("documents the deployment base URL and optional auth/rate/blob checks", () => {
    const script = read("scripts/launch-smoke.ts");
    expect(script).toContain("YENTL_SMOKE_BASE_URL");
    expect(script).toContain("YENTL_SMOKE_AUTH_HEADER");
    expect(script).toContain("YENTL_SMOKE_RATE_LIMIT");
    expect(script).toContain("YENTL_SMOKE_BLOB_TOKEN");
    expect(script).toContain("YENTL_SMOKE_EXPECT_AUTH");
    expect(script).toContain("/contact");
    expect(script).toContain("/session");
    expect(script).toContain("/api/corpus-sample?id=solo_005");
    expect(script).toContain("/project/validation");
    expect(script).toContain("/api/project-flow-comments");
    expect(script).toContain("/api/source-preview");
    expect(script).toContain("/api/upload-audio");
  });

  it("is exposed through package.json", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["smoke:launch"]).toBe("tsx scripts/launch-smoke.ts");
  });
});
