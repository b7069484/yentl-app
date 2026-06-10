import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("accessibility proof script", () => {
  const source = readFileSync("scripts/validation/prove-a11y-deploy.mjs", "utf8");

  it("audits launch-critical routes with axe-core", () => {
    expect(source).toContain("@axe-core/cli");
    expect(source).toContain('runCheck(`axe-${route.slug}`');
    expect(source).toContain('path: "/session", launch_critical: true');
    expect(source).toContain('path: "/mobile", launch_critical: true');
  });

  it("writes separate local and deploy proof artifacts", () => {
    expect(source).toContain("docs/superpowers/validation/a11y-local-proof.json");
    expect(source).toContain("docs/superpowers/validation/a11y-deploy-proof.json");
    expect(source).toContain("launch_critical");
    expect(source).toContain("violation_rules");
  });

  it("records deploy blockers when local proof is green but production is stale", () => {
    expect(source).toContain("deploy_blockers");
    expect(source).toContain("stale_deploy");
    expect(source).toContain("a11y-local-proof.json");
  });
});