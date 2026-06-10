import { describe, expect, it } from "vitest";
import {
  isMediaLaunchFile,
  isTextLaunchFile,
  sourceForLaunchFile,
} from "@/lib/launch-files";

describe("PWA launch file mapping", () => {
  it("maps caption files into the text document ingest path", () => {
    const file = new File(["WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nClaim"], "captions.vtt", {
      type: "",
    });

    expect(isTextLaunchFile(file)).toBe(true);
    expect(sourceForLaunchFile(file)).toEqual({
      kind: "text_doc",
      filename: "captions.vtt",
      mime: "text/vtt",
      byte_count: file.size,
      intent: "document",
    });
  });

  it("maps video files into the audio/video ingest path", () => {
    const file = new File(["video"], "clip.mp4", { type: "video/mp4" });

    expect(isMediaLaunchFile(file)).toBe(true);
    expect(sourceForLaunchFile(file)).toEqual({
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename: "clip.mp4",
      mime: "video/mp4",
    });
  });

  it("rejects unsupported file types instead of inventing an ingest path", () => {
    const file = new File(["image"], "image.png", { type: "image/png" });

    expect(sourceForLaunchFile(file)).toBeNull();
  });

  it("does not treat unknown files with blank MIME as plain text", () => {
    const file = new File(["binary-ish"], "archive.bin", { type: "" });

    expect(sourceForLaunchFile(file)).toBeNull();
  });
});
