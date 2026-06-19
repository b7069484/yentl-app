import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function dataUrl(html: string) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

describe("real webpage target verifier", () => {
  it("verifies injected panel, page text, source context, and media expectations with fixture targets", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "yentl-real-webpage-targets-test-"));
    const outputPath = join(tempDir, "real-webpage-targets.json");
    const targets = [
      {
        id: "fixture-video-page",
        url: dataUrl(`
          <!doctype html>
          <html>
            <head>
              <title>Fixture video page</title>
              <meta name="description" content="Fixture page for a real media capture target.">
            </head>
            <body>
              <article>
                <h1>Fixture video page</h1>
                <video src="https://example.com/video.mp4"></video>
                <p>The city library budget increased by 12 percent after the public hearing.</p>
                <p>Residents asked Yentl to keep the source page visible while analysis ran.</p>
                <p>This paragraph gives the validation harness enough readable body copy.</p>
              </article>
            </body>
          </html>
        `),
        requiresMedia: true,
        minPageTextLength: 150,
        expectedText: ["library budget", "source page visible"],
      },
    ];

    try {
      const output = execFileSync(process.execPath, ["scripts/validation/verify-real-webpage-targets.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          YENTL_REAL_WEBPAGE_TARGETS_JSON: JSON.stringify(targets),
          YENTL_REAL_WEBPAGE_APP_ORIGIN: "http://localhost:3000",
          YENTL_REAL_WEBPAGE_REPORT_PATH: outputPath,
        },
      });
      const report = JSON.parse(output.slice(output.indexOf("{")));
      const written = JSON.parse(readFileSync(outputPath, "utf8"));

      expect(report.ok).toBe(true);
      expect(written.ok).toBe(true);
      expect(report.target_count).toBe(1);
      expect(report.results[0]).toMatchObject({
        id: "fixture-video-page",
        ok: true,
        panelInjected: true,
        videoCount: 1,
      });
      expect(report.results[0].pageTextLength).toBeGreaterThanOrEqual(150);
      expect(report.results[0].sourceContextKeys).toContain("page_title");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
      void outputPath;
    }
  });

  it("reports failures instead of silently passing weak page text coverage", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "yentl-real-webpage-failure-test-"));
    const outputPath = join(tempDir, "real-webpage-targets.json");
    const targets = [
      {
        id: "fixture-too-short",
        url: dataUrl("<main><p>Too short.</p></main>"),
        requiresMedia: false,
        minPageTextLength: 120,
        expectedText: ["missing phrase"],
      },
    ];

    let stdout = "";
    let stderr = "";
    try {
      execFileSync(process.execPath, ["scripts/validation/verify-real-webpage-targets.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          YENTL_REAL_WEBPAGE_TARGETS_JSON: JSON.stringify(targets),
          YENTL_REAL_WEBPAGE_REPORT_PATH: outputPath,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      stdout = String((error as { stdout?: string }).stdout ?? "");
      stderr = String((error as { stderr?: string }).stderr ?? "");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    expect(`${stdout}${stderr}`).toContain('"ok": false');
    expect(`${stdout}${stderr}`).toContain("page text length");
    expect(`${stdout}${stderr}`).toContain("missing phrase");
  });

  it("ships stable default external targets for video, article, and spec-like text", () => {
    const source = readFileSync("scripts/validation/verify-real-webpage-targets.mjs", "utf8");

    expect(source).toContain("browser-tab-real-video-page");
    expect(source).toContain("browser-page-real-text");
    expect(source).toContain("browser-page-real-spec-text");
    expect(source).toContain("commons.wikimedia.org");
    expect(source).toContain("en.wikinews.org");
    expect(source).toContain("www.w3.org/TR/WCAG22");
  });
});
