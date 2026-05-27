# Yentl complete flow and screen-state plan

Date: 2026-05-21
Workspace: `/Users/israelbitton/Live FactCheck`
Primary review surface: `/project/flows`

## Purpose

This plan resets the flow work around the user's latest feedback: the A-to-Z flow must be a complete product map, not a jumpy storyboard. It must show every meaningful screen, state, function, overlay, popup, modal, dropdown, menu, and branch a user can reach.

The flow map is not allowed to pretend an outdated screenshot is final. Every node must either use the correct current/target screenshot or clearly say the screenshot is stale, reference-only, or missing.

## Reports reviewed

- `docs/superpowers/handoff/2026-05-20-worldclass-ux-committee-audit-pickup.md`
- `docs/superpowers/handoff/2026-05-21-yentl-extension-corpus-functional-samples.md`
- `docs/superpowers/handoff/2026-05-21-yentl-extension-panel-workspace-export-handoff.md`
- `docs/superpowers/validation/2026-05-20-source-validation-proof.md`
- `docs/superpowers/visual-evidence/marker-asset-production.md`
- `.project/review-comments/yentl-flow-review-latest.json`
- Screenshot inventory under `.project/screenshots/`, `docs/superpowers/validation/screenshots/`, and `public/visual-evidence/flow-screenshots/`

## Locked product direction

Yentl is a consumer-grade, everyday-user fact-checking experience. It must feel robust and trustworthy, but not like a specialist analyst dashboard.

Primary launch order:

1. Web/browser app and Chrome extension.
2. Mobile web parity for core review and library flows.
3. iOS and Android apps with platform-honest capture: share sheet, file import, microphone, URLs/text. Mobile should not imply it can capture arbitrary other-app audio unless the platform actually allows it.

Core content/media branches:

- Promo/public education.
- Sign up, sign in, guest/live demo, account recovery.
- Source choice by user job, not by implementation category.
- YouTube link/captioned video.
- Browser extension same-page article/video/page analysis.
- Direct media URL.
- Uploaded audio/video.
- Live microphone/room audio.
- PDF, pasted text, article text, transcript, document.
- Claim-only quick check.
- Library, saved sessions, export/report/share.

## Design principle: no bare hallway screens

Every screen is a room in the experience. A screen that only needs one user input still needs a dominant visual, clear context, and a preview of the reward.

Applied rule:

- A YouTube link input screen should already look like the future Watch workspace.
- The URL field should sit inside the destination-shaped surface: video well, transcript/evidence rail placeholders, source card placeholders, and claim/marker counters.
- Upload, mic, text, PDF, media URL, and browser extension entry states need the same treatment. The user should see where the content will go and why the action is worth taking.

## Fact-checking semantics

Final user-facing results should not end as "unverifiable." A claim can have:

- Supported / true.
- Contradicted / false.
- Mixed or caveated.
- No valid backing found.
- Still checking.
- Unknown as a factual condition only when the real-world fact is genuinely not known.

"Unverifiable" can exist as an internal pipeline condition, not as a final user verdict. The UI must explain what was searched, what evidence quality was found, and why Yentl cannot responsibly back or contradict the claim.

Devil's Advocate remains required as a rigor layer: it challenges the fact-checker, either correcting a weak conclusion or strengthening a conclusion that withstands pushback.

## Visual evidence layer is launch-critical

Source and claim visuals:

- Source cards must show validated thumbnails when available.
- Thumbnails must come from exact source-provided images only: YouTube/oEmbed, Open Graph, Twitter card, schema image, or validated publisher images.
- If Yentl cannot validate the exact image, show a designed no-thumbnail card with the reason.
- No generated source art can be used as evidence.

Marker visuals:

- 123 taxonomy entries require one bespoke icon each.
- Style: duotone stroke, vector-style, pure white background, no embedded text, readable at 24px and 64px.
- 16 archetypes plus high-frequency markers need looping motion first.
- Motion must respect `prefers-reduced-motion`.

## Flow-map requirements

The `/project/flows` A-to-Z map must become an interaction graph:

- Nodes are screens or states.
- Edges mean "the user can get here from there."
- Each node has screenshot status: current capture, reference only, stale/failure capture, or target missing.
- Each node lists missing sub-states.
- Clicking a node opens the screenshot at full length by default.
- Users can place, edit, remove, and save point comments.
- The review round is preserved in `.project/review-comments/`.

## Screen-state inventory definition

The inventory is not complete until every item below has desktop and mobile states where relevant.

Public and account:

- Promo full page, section anchors, examples, trust/methodology, pricing, FAQ.
- CTA paths: try live demo, sign up, sign in.
- Sign up, sign in, error, recovery, guest/demo, post-auth redirect.

Source choice:

- Default source picker.
- Hover/focus/selected source states.
- Browser/tab unavailable on non-Chrome.
- Mobile share-sheet alternatives.
- Source switch during active session.

YouTube:

- URL entry inside destination-shaped preview.
- Valid URL preview.
- Invalid URL.
- Metadata resolving.
- Caption fetch.
- Transcript build.
- Claim extraction.
- Verification/source search.
- Ready state.
- Watch/live analysis.
- Caption/no-access fallback.
- Playback blocked/wrong video/edit URL.

Browser extension:

- Extension popup closed/open.
- Options origin setup.
- Same-page panel injected.
- Page text capture.
- Audio permission/capture.
- Audio meter/no audio.
- Transcript tab, Claims tab, Markers tab.
- Highlight detail popover/sheet.
- Full workspace snapshot and future live sync.
- Report/Markdown/JSON exports.
- Installed-extension proof on validation page, real article, real video page, YouTube page.

Live mic:

- Consent checkpoint.
- Browser permission prompt.
- Listening with responsive audio visualizer.
- Silence/no audio.
- Live transcript.
- Claim/marker hit effects.
- Pause/resume/end.
- Speaker correction.

Uploads and media URLs:

- Drag/drop/upload hover.
- File selected.
- Upload progress.
- Media metadata.
- Transcoding/transcription.
- Unsupported format/error.
- URL entry, detected type, blocked remote fetch, unsupported MIME.

Document/text/PDF:

- Paste text.
- Text URL/article import.
- PDF upload.
- OCR/progress.
- Document outline.
- In-document claim anchors.
- Source/citation extraction.
- Claim/source drawer.

Claim-only quick check:

- Claim text entry.
- Optional context/source prompt.
- Too-vague/needs-context recovery.
- Duplicate/recent-claim notice.
- Source search progress.
- Supported, contradicted, mixed/caveated, no-valid-backing, still-checking, and genuinely unknown result states.
- Devil's Advocate challenge.
- Save/export quick result.
- Mobile quick-check sheet.

Core review:

- Overview command center.
- Watch/video review.
- Audio-only review.
- Document review.
- Article review.
- Transcript with search, highlights, speaker correction, and follow/playhead behavior.
- Claims list filters/sort.
- Markers list filters/sort.
- Claim detail with validated source thumbnails, no-thumbnail fallback, Devil's Advocate.
- Marker detail with icon, rationale, quote context, examples, related markers.
- Yentl Opinion live summary and good-faith/bad-faith meta-read.

Export/library:

- Save dialog.
- Export modal.
- Report preview.
- Markdown/JSON download states.
- Sessions empty.
- Sessions with saved records.
- Search/filter/sort.
- Clear all saved sessions.
- Privacy/local-storage copy.

## Immediate implementation plan

P0: Make the dashboard truthful.

- Mark every existing screenshot as current, reference-only, stale, or missing.
- Add missing states per node.
- Keep outdated screenshots only when they are labeled as failure/reference captures.
- Add full-length screenshot review mode.
- Preserve point comments and saved review rounds.

P1: Replace the worst stale/fake states with correct target captures.

- YouTube URL entry target.
- Promo current full route and mobile.
- Auth screens.
- Browser extension installed proof.
- Audio-only essential review.
- Mic live visualizer.
- Claim detail with source thumbnails and Devil's Advocate.
- Marker learning with real icon assets.

P2: Expand the flow graph to full interaction coverage.

- Dropdowns/menus/modals for every toolbar action.
- Every error/recovery path.
- Every mobile route/sheet.
- Every extension panel state.
- Every export/save/library state.

## Acceptance criteria

The next session can call this flow-planning pass ready only when:

- `/project/flows` visibly identifies stale/reference/missing screenshots.
- The plan/spec/handoff docs exist and point to exact files.
- The screen inventory lists all known missing states.
- No flow jump remains unexplained for the YouTube path.
- The user can leave point comments on full-length screenshots.
- Tests and build pass.
