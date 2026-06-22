import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const script = readFileSync("scripts/install-yt-dlp.sh", "utf8");

describe("yt-dlp Vercel install script", () => {
  it("is wired into vercel-build before next build", () => {
    expect(packageJson.scripts["vercel-build"]).toBe(
      "bash scripts/install-yt-dlp.sh && next build",
    );
  });

  it("pins the default yt-dlp release instead of downloading latest", () => {
    expect(script).toContain('YT_DLP_VERSION="${YT_DLP_VERSION:-2026.06.09}"');
    expect(script).toContain("/releases/download/${YT_DLP_VERSION}/yt-dlp_linux");
    expect(script).not.toContain("/releases/latest/download/");
  });

  it("fails loudly on bad downloads and verifies the downloaded binary version", () => {
    expect(script).toContain("set -euo pipefail");
    expect(script).toContain("curl --fail --show-error --silent --location");
    expect(script).toContain('"${TMP_TARGET}" --version');
    expect(script).toContain('[[ "${downloaded_version}" != "${YT_DLP_VERSION}" ]]');
  });

  it("installs atomically only after the downloaded binary passes validation", () => {
    const versionCheckIndex = script.indexOf('downloaded_version="$("${TMP_TARGET}" --version)"');
    const moveIndex = script.indexOf('mv "${TMP_TARGET}" "${TARGET}"');

    expect(versionCheckIndex).toBeGreaterThan(-1);
    expect(moveIndex).toBeGreaterThan(versionCheckIndex);
  });
});
