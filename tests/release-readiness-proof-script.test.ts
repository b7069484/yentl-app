import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/validation/prove-release-readiness.mjs", "utf8");

describe("release readiness proof script", () => {
  it("is exposed as a package script and writes a stable proof artifact", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

    expect(pkg.scripts["release:readiness"]).toBe("node scripts/validation/prove-release-readiness.mjs");
    expect(source).toContain("docs/superpowers/validation/release-readiness-proof.json");
    expect(source).toContain("launch_ready");
    expect(source).toContain("local_proofs");
    expect(source).toContain("deploy_proofs");
  });

  it("covers the core local proof battery", () => {
    expect(source).toContain("session-ux-local-proof.json");
    expect(source).toContain("ingestion-local-proof.json");
    expect(source).toContain("ingestion-ui-local-proof.json");
    expect(source).toContain("text-document-fixtures-proof.json");
    expect(source).toContain("synthesis-metaread-proof.json");
    expect(source).toContain("speaker-attribution-proof.json");
    expect(source).toContain("mobile-pwa-local-proof.json");
    expect(source).toContain("pwa-native-contract-proof.json");
    expect(source).toContain("cloud-sync-local-proof.json");
    expect(source).toContain("installed-extension-local-proof.json");
    expect(source).toContain("installed-extension-external-proof.json");
    expect(source).toContain("extension-store-readiness.json");
    expect(source).toContain("a11y-local-proof.json");
    expect(source).toContain("sensitive-attribution-review-proof.json");
    expect(source).toContain("mobile-device-canary-proof.json");
    expect(source).toContain("large-real-media-canary-proof.json");
  });

  it("names the current non-local launch blockers explicitly", () => {
    expect(source).toContain("human-review-sensitive-attribution");
    expect(source).toContain("authenticated-cloud-sync-not-proven");
    expect(source).toContain("production-authenticated-cloud-sync-not-proven");
    expect(source).toContain("physical-ios-android-device-proof-missing");
    expect(source).toContain("large-real-media-production-canaries-missing");
    expect(source).toContain("production-release-smoke-current-tree-missing");
  });

  it("uses the large real media canary artifact instead of treating synthetic media as launch proof", () => {
    expect(source).toContain("EXTERNAL_PROOFS");
    expect(source).toContain("sensitive-attribution-review");
    expect(source).toContain("large-real-media-canary");
    expect(source).toContain("largeRealMedia?.details?.production_like !== true");
    expect(source).toContain("missing_media_kinds");
    expect(source).toContain("npm run ingestion:proof:large-real-media");
  });

  it("uses the physical-device canary artifact instead of treating emulated mobile as launch proof", () => {
    expect(source).toContain("mobile-device-canary");
    expect(source).toContain("mobileDevice?.details?.production_like !== true");
    expect(source).toContain("missing_device_items");
    expect(source).toContain("npm run mobile:proof:devices");
  });

  it("uses the sensitive attribution review artifact before public launch claims", () => {
    expect(source).toContain("sensitiveReview?.details?.public_claims_review_status");
    expect(source).toContain("approved_for_public_claims");
    expect(source).toContain("reviewed_count");
    expect(source).toContain("npm run analysis:proof:sensitive-review");
  });

  it("supports strict mode without making the normal report command fail", () => {
    expect(source).toContain("YENTL_RELEASE_READINESS_STRICT");
    expect(source).toContain("if (STRICT && !report.launch_ready)");
  });
});
