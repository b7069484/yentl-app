import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/validation/prove-large-real-media-canary.mjs", "utf8");

describe("large real media canary proof script", () => {
  it("is exposed as a package script and writes a stable proof artifact", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

    expect(pkg.scripts["ingestion:proof:large-real-media"]).toBe(
      "node scripts/validation/prove-large-real-media-canary.mjs",
    );
    expect(source).toContain("docs/superpowers/validation/large-real-media-canary-proof.json");
    expect(source).toContain("YENTL_REAL_MEDIA_CANARY_ORIGIN");
    expect(source).toContain("YENTL_REAL_MEDIA_CANARY_MANIFEST");
    expect(source).toContain("agent-work/validation/large-real-media-canaries.json");
  });

  it("requires real audio, MP4, MOV, and WebM media above the Blob threshold", () => {
    expect(source).toContain('REQUIRED_MEDIA_KINDS = ["audio", "video/mp4", "video/quicktime", "video/webm"]');
    expect(source).toContain("YENTL_REAL_MEDIA_CANARY_MIN_BYTES");
    expect(source).toContain("4 * 1024 * 1024");
    expect(source).toContain("required_missing");
    expect(source).toContain("file must be at least");
  });

  it("exercises the real Blob upload and transcribe-batch handoff", () => {
    expect(source).toContain('from "@vercel/blob/client"');
    expect(source).toContain("access: \"private\"");
    expect(source).toContain("/api/upload-audio");
    expect(source).toContain("blob.generate-client-token");
    expect(source).toContain("clientPayload: JSON.stringify({ consent: CONSENT_VALUE })");
    expect(source).toContain("/api/transcribe-batch");
    expect(source).toContain("blob_url: blobResult.url");
    expect(source).toContain("!json?.validation_fixture");
  });

  it("only satisfies release readiness when the canary is production-like", () => {
    expect(source).toContain("production_like");
    expect(source).toContain("proof_scope");
    expect(source).toContain("proofScope === \"deploy\"");
    expect(source).toContain("Large real media canary is not launch-ready");
  });
});
