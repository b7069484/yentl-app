import { ALL, type TaxonomyEntry } from "@/lib/taxonomy";
import { ARCHETYPES, type Archetype } from "@/lib/taxonomy/archetypes";

export type MarkerAssetApprovalStatus =
  | "prompt_drafted"
  | "generated"
  | "approved"
  | "vectorized"
  | "implemented";

export type MarkerMotionStatus =
  | "not_planned"
  | "archetype_loop_planned"
  | "marker_loop_planned"
  | "animated";

export type MarkerAssetMeta = {
  canonical_id: string;
  display: string;
  type: TaxonomyEntry["type"];
  archetype: Archetype;
  static_svg_path: string;
  png_master_path: string;
  archetype_loop_path: string;
  marker_loop_path: string | null;
  style_version: string;
  approval_status: MarkerAssetApprovalStatus;
  motion_status: MarkerMotionStatus;
  prompt: string;
  prompt_notes: string;
};

export const MARKER_ICON_STYLE_VERSION = "duotone-stroke-white-v1";

export const HIGH_FREQUENCY_MARKERS = new Set([
  "loaded_language",
  "ad_hominem",
  "straw_man",
  "confirmation_bias",
  "cherry_picking",
  "false_dilemma",
  "appeal_to_authority",
  "appeal_to_fear",
  "hasty_generalization",
  "weasel_words",
  "dog_whistles",
  "red_herring",
  "gish_gallop",
  "proof_by_assertion",
  "moving_the_goalposts",
  "slippery_slope",
]);

export function markerAssetPrompt(entry: TaxonomyEntry): string {
  const cues = entry.how_to_spot?.slice(0, 3).join(" ") ?? entry.definition ?? entry.display;
  return [
    `Create one bespoke icon for "${entry.display}" (${entry.type}, ${entry.archetype}).`,
    "Style: clean duotone stroke vector icon, pure white background, no text, no letters, no labels.",
    "Use a 1:1 square composition, readable at 24px and 64px, with a consistent 2px rounded stroke.",
    "Use deep ink as the primary stroke and one restrained accent color keyed to the marker type.",
    "The metaphor must be specific to the concept, not a generic warning symbol.",
    `Concept cues: ${cues}`,
  ].join(" ");
}

function markerAsset(entry: TaxonomyEntry): MarkerAssetMeta {
  const markerLoop = HIGH_FREQUENCY_MARKERS.has(entry.canonical_id)
    ? `/visual-evidence/loops/markers/${entry.canonical_id}.mp4`
    : null;

  return {
    canonical_id: entry.canonical_id,
    display: entry.display,
    type: entry.type,
    archetype: entry.archetype ?? "unknown",
    static_svg_path: `/visual-evidence/markers/${entry.canonical_id}.svg`,
    png_master_path: `/visual-evidence/higgsfield-masters/${entry.canonical_id}.png`,
    archetype_loop_path: `/visual-evidence/loops/archetypes/${entry.archetype ?? "unknown"}.mp4`,
    marker_loop_path: markerLoop,
    style_version: MARKER_ICON_STYLE_VERSION,
    approval_status: "implemented",
    motion_status: markerLoop ? "marker_loop_planned" : "archetype_loop_planned",
    prompt: markerAssetPrompt(entry),
    prompt_notes: "Higgsfield master should be used only as production art input; app icon ships as reviewed SVG.",
  };
}

export const MARKER_ASSETS: MarkerAssetMeta[] = ALL.map(markerAsset);
export const MARKER_ASSET_MAP = new Map(MARKER_ASSETS.map((asset) => [asset.canonical_id, asset]));

export function getMarkerAsset(canonicalId: string): MarkerAssetMeta | undefined {
  return MARKER_ASSET_MAP.get(canonicalId);
}

export const MARKER_ASSET_STATS = {
  total: MARKER_ASSETS.length,
  implemented: MARKER_ASSETS.filter((asset) => asset.approval_status === "implemented").length,
  heroLoops: ARCHETYPES.length,
  markerLoopsPlanned: MARKER_ASSETS.filter((asset) => asset.marker_loop_path !== null).length,
  byType: {
    bias: MARKER_ASSETS.filter((asset) => asset.type === "bias").length,
    fallacy: MARKER_ASSETS.filter((asset) => asset.type === "fallacy").length,
    rhetoric: MARKER_ASSETS.filter((asset) => asset.type === "rhetoric").length,
  },
};
