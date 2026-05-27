# Noam Marker Iconography Production Checklist

Status: Static direction prepared for review. No shipped assets changed.

## Pre-Generation Gate

- [x] Confirm Noam directive row is `ready` in the workbook and CSV mirror.
- [x] Read marker asset production notes.
- [x] Read current marker asset mapping and component constraints.
- [x] Prepare pilot prompts for the requested 12 marker ids.
- [x] State clearly that marker images are educational visuals only, not source evidence.
- [ ] Israel approves static direction.

## First Candidate Batch

Recommended first generation ids:

1. `loaded_language`
2. `ad_hominem`
3. `confirmation_bias`

Reason: these cover rhetoric, fallacy, and bias while testing three distinct visual problems: charged language, person-targeted attack, and selective evidence.

Before generation:

- [ ] Confirm prompts still forbid text, labels, fake UI, mascots, emoji, clipart, and sketchbook doodles.
- [ ] Generate into `agent-work/noam-iconography/candidates/` only.
- [ ] Do not write to `public/visual-evidence/markers/`.
- [ ] Do not write to `public/visual-evidence/higgsfield-masters/`.
- [ ] Do not edit app components, tests, taxonomy, or prompt manifest.

## Review Checks

For each candidate:

- [ ] Looks like premium editorial illustration, not a bare line icon.
- [ ] Uses white or near-white background.
- [ ] Main scene sits inside the circle.
- [ ] Exactly one intentional detail breaks the circle edge.
- [ ] Contains no text, letters, labels, captions, fake UI, or logos.
- [ ] Metaphor is specific to the marker.
- [ ] Reads at 24px.
- [ ] Reads at 64px.
- [ ] Feels coherent beside the other pilot markers.
- [ ] Can later support a restrained loop without changing the concept.

## Vectorization Gate

- [ ] Convert approved raster masters to clean SVG only after Israel accepts the direction.
- [ ] Normalize optical stroke weight across the approved set.
- [ ] Remove raster texture during vectorization.
- [ ] Keep the accent ratio restrained.
- [ ] Confirm SVGs have no embedded text nodes.
- [ ] Confirm SVGs have no external image references.

## Integration Gate

- [ ] Update shipped marker assets only after approval.
- [ ] Run `tests/marker-assets.test.ts`.
- [ ] Check marker display at small, medium, and large component sizes.
- [ ] Verify no generated imagery is presented as source evidence.
- [ ] Hand static masters to Ariel only after Israel approves the static direction.

## Open Decisions For Israel

- Whether the circle-breakout badge rule feels right for the product.
- Whether the type accents should stay keyed to current app categories: bias ocher, fallacy rose, rhetoric teal.
- Whether the first three generation candidates should be exactly `loaded_language`, `ad_hominem`, and `confirmation_bias`.
- Whether abstract redirection metaphors should stay more symbolic or become more literal in the generated pass.
