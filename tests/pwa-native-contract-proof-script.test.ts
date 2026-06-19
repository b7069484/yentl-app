import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PWA/native contract proof script", () => {
  const source = readFileSync("scripts/validation/prove-pwa-native-contract.ts", "utf8");

  it("locks the v1 native-shell decision to PWA-first proof", () => {
    expect(source).toContain("not_shipped_v1_pwa_first");
    expect(source).toContain("manifest-install-contract");
    expect(source).toContain("mobile-native-shell-copy");
    expect(source).toContain("Native iOS and Android store shells are not shipped in v1");
  });

  it("proves share-target and file-handler contracts", () => {
    expect(source).toContain("share-target-contract");
    expect(source).toContain("file-handler-contract");
    expect(source).toContain("YENTL_FILE_HANDLERS");
    expect(source).toContain("TEXT_LAUNCH_EXTENSIONS");
    expect(source).toContain("MEDIA_LAUNCH_EXTENSIONS");
    expect(source).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(source).toContain("required_video_types");
    expect(source).toContain("video/mp4");
    expect(source).toContain("video/quicktime");
    expect(source).toContain("video/webm");
  });

  it("proves representative launched-file routing", () => {
    expect(source).toContain("launch-file-routing");
    expect(source).toContain("transcript.txt");
    expect(source).toContain("brief.pdf");
    expect(source).toContain("clip.mp4");
    expect(source).toContain("phone-recording.mov");
    expect(source).toContain("screen-recording.webm");
    expect(source).toContain("room.wav");
    expect(source).toContain("archive.zip");
    expect(source).toContain("sourceForLaunchFile");
  });

  it("writes a JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/pwa-native-contract-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});
