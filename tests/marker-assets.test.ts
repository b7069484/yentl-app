import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL } from "@/lib/taxonomy";
import { getMarkerAsset, MARKER_ASSET_STATS, MARKER_ASSETS } from "@/lib/visual-evidence/marker-assets";

describe("marker visual evidence assets", () => {
  it("maps every taxonomy entry to an implemented visual asset", () => {
    expect(MARKER_ASSETS.length).toBe(123);
    expect(MARKER_ASSET_STATS.total).toBe(123);
    expect(MARKER_ASSET_STATS.implemented).toBe(123);

    for (const entry of ALL) {
      const asset = getMarkerAsset(entry.canonical_id);
      expect(asset?.static_svg_path).toBe(`/visual-evidence/markers/${entry.canonical_id}.svg`);
      expect(asset?.prompt).toContain(entry.display);
    }
  });

  it("has a generated SVG file for every taxonomy marker", () => {
    for (const asset of MARKER_ASSETS) {
      const localPath = path.join(process.cwd(), "public", asset.static_svg_path);
      expect(existsSync(localPath), `${asset.canonical_id} SVG missing`).toBe(true);
    }
  });

  it("plans archetype and high-frequency marker motion assets", () => {
    expect(MARKER_ASSET_STATS.heroLoops).toBe(16);
    expect(MARKER_ASSET_STATS.markerLoopsPlanned).toBeGreaterThan(10);
    expect(getMarkerAsset("loaded_language")?.marker_loop_path).toContain("loaded_language");
  });
});
