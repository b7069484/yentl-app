import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import manifest from "@/app/manifest";

function pngSize(publicPath: string): { width: number; height: number } {
  const file = readFileSync(path.join(process.cwd(), "public", publicPath));
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
  };
}

describe("app manifest", () => {
  it("registers Yentl as a mobile/web share target", () => {
    const data = manifest();

    expect(data.start_url).toBe("/mobile");
    expect(data.display).toBe("standalone");
    expect(data.display_override).toContain("standalone");
    expect(data.orientation).toBe("any");
    expect(data.launch_handler).toMatchObject({
      client_mode: ["focus-existing", "navigate-new"],
    });
    expect(data.share_target).toMatchObject({
      action: "/session",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    });
    expect(data.file_handlers).toEqual([
      expect.objectContaining({
        action: "/session",
        accept: expect.objectContaining({
          "application/pdf": [".pdf"],
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
          "application/x-subrip": [".srt"],
          "text/vtt": [".vtt"],
          "audio/mpeg": [".mp3"],
          "audio/webm": [".webm"],
          "video/mp4": [".mp4"],
          "video/quicktime": [".mov"],
          "video/webm": [".webm"],
        }),
      }),
    ]);
    expect(data.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        }),
      ]),
    );
    expect(data.shortcuts?.map((shortcut) => shortcut.url)).toEqual([
      "/session",
      "/sessions",
      "/tv",
      "/demo",
    ]);
    expect(data.screenshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          form_factor: "narrow",
          src: "/visual-evidence/pipeline-smoke/2026-05-27/pw-07-source-picker-mobile.png",
        }),
        expect.objectContaining({
          form_factor: "wide",
          src: "/visual-evidence/pipeline-smoke/2026-05-27/01-session-source-picker-desktop.png",
        }),
      ]),
    );
  });

  it("ships PNG install icons at declared sizes", () => {
    expect(pngSize("icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(pngSize("icon-512.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("icon-maskable-512.png")).toEqual({ width: 512, height: 512 });
  });
});
