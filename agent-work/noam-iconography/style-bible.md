# Noam Marker Iconography Style Bible

Date: 2026-05-21
Lane: Marker iconography image direction
Status: Static direction for Israel review, not product integration

## Purpose

This direction replaces bare procedural placeholders with a premium educational marker system for Yentl's bias, fallacy, and rhetoric labels. These images are not source evidence. They are educational marker visuals only, used to help a viewer recognize the kind of reasoning move being flagged.

## Core Direction

- Format: circular badge system on a white or near-white field.
- Illustration level: full editorial spot illustration, not generic line doodles.
- Composition: the main metaphor lives inside a round badge; one intentional element may break the circle edge.
- Color: duotone per marker, with deep ink plus one restrained accent.
- Finish: vector-clean shapes, rounded joins, controlled negative space, and subtle filled masses.
- Scale: readable at 24px and 64px while retaining enough richness for larger review surfaces.
- Prohibitions: no text, letters, labels, fake UI, captions, brand marks, mascots, emoji, clipart, warning triangles as the default idea, or sketchbook scribbles.

## Family Rules

1. Use the same optical stroke weight across the set. At final SVG size, target a 2px rounded stroke with heavier filled silhouettes only where the idea needs visual weight.
2. Preserve a calm editorial tone. Even fear, attack, or manipulation markers should feel analytical, not alarmist.
3. Keep each metaphor specific. The badge should describe the reasoning pattern, not just announce that something is bad.
4. Use one controlled breakout per icon. Examples: a speech shard crossing the badge rim, a diverted path exiting the circle, or a flood of claim tiles spilling over one edge.
5. Avoid literal text artifacts. If a marker references language, show marks, bubbles, droplets, or shapes instead of words.
6. Leave generous negative space. The icon must survive being compressed into marker chips and transcript rows.

## Palette

Shared base:

- Paper: `#FFFFFF` or `#FBFCF8`
- Deep ink: `#18222D`
- Soft rule: `#D7DEE7`
- Quiet shadow: `#E9EDF2`

Type accents:

- Bias: muted ocher `#B8841F`
- Fallacy: cranberry rose `#B84C5A`
- Rhetoric: deep teal `#17847D`

Use the accent as a focused signal, usually 15-30 percent of the visible mass. The ink carries structure; the accent carries the marker's emotional or conceptual pressure.

## Shape Language

- Badge circle: quiet rule, slightly inset from the square artboard.
- Primary forms: simple filled silhouettes with rounded corners.
- Detail forms: sparse strokes, dots, panels, arrows, rays, or broken paths.
- Breakout forms: one part of the metaphor crosses the circle rim by 6-12 percent of the badge diameter.
- Texture: none in the source SVG. If raster masters are generated, allow only very subtle paper softness that can be removed during vectorization.

## Pilot Metaphors

| Marker | Metaphor |
|---|---|
| Loaded Language | A neutral speech bubble carrying a charged ink drop that weighs down one side and breaks the circle rim. |
| Ad Hominem | An attack mark hits a speaker silhouette while the untouched claim shape sits aside. |
| Confirmation Bias | A lens enlarges matching tiles while a contrary tile remains outside the badge. |
| Straw Man | A thin decoy figure casts a larger distorted shadow that draws the attack. |
| Cherry Picking | A tweezer selects one bright data bead from a wider branch of ignored points. |
| False Dilemma | A path is forced through two heavy gates while a quieter third path escapes the edge. |
| Appeal to Authority | An oversized seal or lectern eclipses a smaller evidence shape. |
| Appeal to Fear | A siren-like flare throws an exaggerated shadow across the badge. |
| Gish Gallop | Many small claim tiles rush through the circle faster than one can be examined. |
| Weasel Words | Soft quote shapes dissolve into fog, hiding the source behind them. |
| Dog Whistles | A small whistle emits coded rings that only some hidden dots respond to. |
| Red Herring | A vivid red diversion shape cuts across a straight question path and pulls it away. |

## Generation Guidance

Use the prompt manifest in `pilot-icon-prompts.json` as the source for any first image-generation pass. Generate only a limited pilot batch for review before broader production. The recommended first three are:

1. `loaded_language`
2. `ad_hominem`
3. `confirmation_bias`

Those three test the system across rhetoric, fallacy, and bias; they also test language, person-targeting, and selective-evidence metaphors without requiring animation.

## Review Gate

Before anything enters `public/visual-evidence/markers/`, `public/visual-evidence/higgsfield-masters/`, app components, tests, or taxonomy data, Israel should approve:

- The overall editorial tone.
- The circle plus breakout rule.
- The type palette.
- Whether the metaphors are specific and non-childish.
- Whether the first generated candidates remain legible at 24px and 64px.

No shipped marker assets were changed as part of this direction.
