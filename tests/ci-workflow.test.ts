import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("CI workflow launch gates", () => {
  it("runs production build and local release smoke after unit tests", () => {
    const workflow = read(".github/workflows/ci.yml");

    expect(workflow).toContain("run: npx vitest run");
    expect(workflow).toContain("name: Production build");
    expect(workflow).toContain("run: npm run build:automation");
    expect(workflow).toContain("name: Local release smoke");
    expect(workflow).toContain("run: bash scripts/run-local-launch-smoke.sh");
  });

  it("keeps local release smoke scoped to the production server and explicit local-only internal skip", () => {
    const script = read("scripts/run-local-launch-smoke.sh");

    expect(script).toContain("npm run start -- --hostname");
    expect(script).toContain("${BASE_URL}/session");
    expect(script).toContain("YENTL_SMOKE_SKIP_INTERNAL=1");
    expect(script).toContain("npm run smoke:launch");
    expect(script).toContain("trap cleanup EXIT");
  });
});
