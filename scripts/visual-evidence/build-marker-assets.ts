import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL, type TaxonomyEntry } from "../../lib/taxonomy";
import { MARKER_ASSETS } from "../../lib/visual-evidence/marker-assets";
import type { MarkerType } from "../../lib/types";
import type { Archetype } from "../../lib/taxonomy/archetypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const publicDir = path.join(root, "public/visual-evidence");
const markerDir = path.join(publicDir, "markers");
const docsDir = path.join(root, "docs/superpowers/visual-evidence");

const TYPE_ACCENT: Record<MarkerType, string> = {
  bias: "#d97706",
  fallacy: "#e11d48",
  rhetoric: "#0f766e",
};

const ARCHETYPE_MOTIF: Record<Archetype, string> = {
  appeal_to: `<path d="M25 44c9-11 18-16 30-16"/><path d="M47 19l11 9-13 6"/><circle cx="23" cy="46" r="5"/>`,
  dismissal: `<path d="M22 22l30 30M52 22L22 52"/><path d="M18 37h38"/>`,
  generalization: `<path d="M19 47c8-14 19-20 36-22"/><path d="M27 47l-8 0 0-8"/><path d="M42 27l12-2-3 12"/>`,
  redirection: `<path d="M20 28h24c7 0 11 4 11 10s-4 10-11 10H27"/><path d="M33 40l-8 8 8 8"/><path d="M43 20l10 8-10 8"/>`,
  fear: `<path d="M37 17l22 40H15z"/><path d="M37 29v13"/><circle cx="37" cy="49" r="1.5"/>`,
  authority: `<path d="M22 52h30"/><path d="M25 47V29l12-8 12 8v18"/><path d="M31 36h12"/>`,
  emotion: `<path d="M37 55s-18-10-18-23c0-7 5-11 11-11 4 0 7 2 7 5 0-3 3-5 7-5 6 0 11 4 11 11 0 13-18 23-18 23z"/>`,
  vagueness: `<path d="M20 37c4-9 11-13 19-13 8 0 15 5 15 13s-7 13-15 13H25"/><path d="M25 50l-7 7"/><path d="M32 37h10"/>`,
  repetition: `<path d="M51 32a15 15 0 1 0 1 14"/><path d="M53 25v11H42"/><path d="M23 50v-11h11"/>`,
  false_binary: `<path d="M20 20l34 34"/><path d="M22 52h12V40H22z"/><path d="M42 20h12v12H42z"/>`,
  false_causation: `<path d="M18 47c9-16 18-15 27-6 5 5 10 6 14-2"/><path d="M47 33l12 6-10 8"/><circle cx="24" cy="27" r="6"/>`,
  in_group: `<circle cx="29" cy="30" r="6"/><circle cx="47" cy="30" r="6"/><path d="M18 54c2-9 8-14 16-14s14 5 16 14"/><path d="M38 54c2-7 7-11 14-11 5 0 9 2 12 7"/>`,
  framing: `<path d="M19 21h36v36H19z"/><path d="M28 30h18v18H28z"/><path d="M19 35h9M46 43h9"/>`,
  burden: `<path d="M20 52h34"/><path d="M37 22v30"/><path d="M25 30h24"/><path d="M25 30l-8 14h16z"/><path d="M49 30l-8 14h16z"/>`,
  identity: `<path d="M37 18c12 0 20 8 20 19s-8 19-20 19-20-8-20-19 8-19 20-19z"/><path d="M29 38l6 6 11-14"/><path d="M25 26c7 4 17 4 24 0"/>`,
  unknown: `<circle cx="37" cy="37" r="20"/><path d="M31 31c1-5 5-8 10-7 5 1 8 5 7 10-1 4-4 6-8 8"/><circle cx="37" cy="50" r="1.5"/>`,
};

function hash(input: string): number {
  let out = 0;
  for (let i = 0; i < input.length; i += 1) out = (out * 31 + input.charCodeAt(i)) >>> 0;
  return out;
}

function svgFor(entry: TaxonomyEntry): string {
  const accent = TYPE_ACCENT[entry.type];
  const h = hash(entry.canonical_id);
  const dotX = 18 + (h % 38);
  const dotY = 18 + ((h >> 5) % 38);
  const ring = 10 + ((h >> 10) % 18);
  const archetype = entry.archetype ?? "unknown";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 74 74" fill="none">
  <rect width="74" height="74" rx="0" fill="#fff"/>
  <circle cx="37" cy="37" r="28" stroke="#111827" stroke-width="2.2" opacity=".12"/>
  <g stroke="#111827" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
    ${ARCHETYPE_MOTIF[archetype]}
  </g>
  <g stroke="${accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="${dotX}" cy="${dotY}" r="3.2"/>
    <path d="M${ring} ${65 - ring}c7 4 15 4 22 0"/>
  </g>
</svg>
`;
}

function ensureDirs() {
  mkdirSync(markerDir, { recursive: true });
  mkdirSync(path.join(publicDir, "higgsfield-masters"), { recursive: true });
  mkdirSync(path.join(publicDir, "loops/archetypes"), { recursive: true });
  mkdirSync(path.join(publicDir, "loops/markers"), { recursive: true });
  mkdirSync(docsDir, { recursive: true });
}

function writePromptManifest() {
  const prompts = MARKER_ASSETS.map((asset) => ({
    canonical_id: asset.canonical_id,
    display: asset.display,
    type: asset.type,
    archetype: asset.archetype,
    style_version: asset.style_version,
    prompt: asset.prompt,
    higgsfield_command: `higgsfield generate create gpt_image_2 --prompt ${JSON.stringify(asset.prompt)} --aspect_ratio 1:1 --resolution 2k --wait`,
    png_master_path: asset.png_master_path,
    static_svg_path: asset.static_svg_path,
    loop_target: asset.marker_loop_path ?? asset.archetype_loop_path,
    approval_status: asset.approval_status,
    motion_status: asset.motion_status,
  }));
  writeFileSync(
    path.join(publicDir, "higgsfield-marker-prompts.json"),
    `${JSON.stringify({ generated_at: new Date().toISOString(), prompts }, null, 2)}\n`,
  );
}

function writeProductionDoc() {
  const doc = `# Yentl marker visual evidence production

Generated by \`scripts/visual-evidence/build-marker-assets.ts\`.

## Locked style

- Duotone stroke vector-style icons.
- Pure white background.
- No text inside the icon.
- Specific metaphor per marker, readable at 24px and 64px.
- Static SVGs ship in \`public/visual-evidence/markers/\`.
- Higgsfield prompt manifest ships at \`public/visual-evidence/higgsfield-marker-prompts.json\`.

## Current inventory

- Taxonomy entries: ${MARKER_ASSETS.length}
- Static SVG app icons: ${MARKER_ASSETS.length}
- Archetype loops planned: 16
- Marker-specific loops planned: ${MARKER_ASSETS.filter((asset) => asset.marker_loop_path).length}

## Higgsfield workflow

Run a limited approved batch first, then review in the dashboard before broad generation:

\`\`\`bash
npx tsx scripts/visual-evidence/higgsfield-marker-icons.ts --ids loaded_language,ad_hominem,confirmation_bias --wait
\`\`\`

Do not use generated imagery as source evidence. Higgsfield is only for marker education/assets.
`;
  writeFileSync(path.join(docsDir, "marker-asset-production.md"), doc);
}

ensureDirs();
for (const entry of ALL) {
  writeFileSync(path.join(markerDir, `${entry.canonical_id}.svg`), svgFor(entry));
}
writePromptManifest();
writeProductionDoc();

console.log(`Wrote ${ALL.length} marker SVGs to ${path.relative(root, markerDir)}`);
console.log(`Wrote Higgsfield prompt manifest to ${path.relative(root, path.join(publicDir, "higgsfield-marker-prompts.json"))}`);
