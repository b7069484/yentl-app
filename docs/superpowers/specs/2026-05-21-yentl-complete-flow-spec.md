# Yentl complete flow spec

Date: 2026-05-21
Route: `/project/flows`

## Scope

This spec defines the internal product-flow atlas that will guide the launch UI for Yentl across web, Chrome extension, mobile web, iOS, and Android. The atlas is a product design and implementation contract. It must show exact intended end-user screens or clearly mark where an intended screen does not yet exist.

## Data model

Each flow node should include:

- `id`
- `title`
- `branch`
- `screenshot`
- `sourcePath`
- `screenshotStatus`: `current`, `reference`, `stale`, or `missing`
- `screenshotNote`
- `missingStates`
- `children`
- `userJob`
- `screenJob`
- `desktopTarget`
- `mobileTarget`
- `reviewAnchor`

Meaning of screenshot status:

- `current`: this screenshot is a current rendered implementation that can be reviewed as-is.
- `reference`: this screenshot is useful evidence or a directional reference, but not final.
- `stale`: this screenshot is old or shows a failure mode kept intentionally for critique.
- `missing`: the intended target state has not been captured or built yet.

## Dashboard behavior

The A-to-Z tab must:

- Render a left-to-right branching canvas.
- Draw relationship edges between nodes.
- Show screenshot-status badges on thumbnails.
- Show selected-node details, screenshot status, and missing state checklist.
- Open screenshots in a full-review modal.
- Default long screenshots to full-length review.
- Offer a `Fit screen` toggle.
- Let the user place point comments on screenshots.
- Let the user edit and remove comments.
- Save the review round to `.project/review-comments/yentl-flow-review-latest.json`.
- Append saved rounds to `.project/review-comments/yentl-flow-review-rounds.jsonl`.

## Screen granularity rule

No branch may jump over a user-visible state.

For any action:

- What does the user see before clicking?
- What happens while the action is processing?
- What does success look like?
- What does failure look like?
- What fallback route is offered?
- What modal, dropdown, or sheet opens?
- What changes on mobile?

If the answer is not represented by a screenshot node or missing-state note, the flow is incomplete.

## Required branches

### Public and account

Nodes:

- Promo/product page full length.
- Promo section anchors: hero, proof/example, five ways in, how it works, features, trust/privacy, pricing, FAQ.
- Try live demo CTA.
- Sign up.
- Sign in.
- Forgot password.
- Auth error.
- Post-auth redirect.
- Guest/demo explanation.

Required UI principle:

The promo page explains and sells the product. It must not be treated as "start session" only.

### Source choice

Nodes:

- Source picker.
- Source selected.
- Source unavailable.
- Source switch while in a session.
- Chrome-only browser extension path.
- Mobile share-sheet alternatives.

Required UI principle:

Sources are grouped by user job. Technical labels can exist as details, not as the primary decision language.

### YouTube

Nodes:

- YouTube URL entry.
- URL entry target shell.
- Valid URL preview.
- Invalid URL.
- Resolving metadata.
- Fetching captions.
- Transcript building.
- Extracting claims.
- Verifying/source search.
- Video ready.
- Watch/live analysis.
- Caption/no-access fallback.
- Playback blocked.
- Wrong video/edit URL.

Required UI principle:

The URL input is not a bare hallway. It belongs inside a preview of the final Watch workspace. The video well, transcript rail, claim/source cards, and Yentl Opinion areas should already be visible as meaningful placeholders.

### Browser extension

Nodes:

- Extension install/options.
- Extension popup.
- Same-page panel injected.
- Page text detected.
- Audio capture starting.
- Audio meter active.
- No audio detected.
- Transcript tab.
- Claims tab.
- Markers tab.
- Highlight detail.
- Devil's Advocate under claim.
- Export/report menu.
- Open full workspace snapshot.
- Future live workspace sync.

Required UI principle:

The page remains visible. Yentl lives beside the source, not in a disconnected monitoring tab.

### Live microphone

Nodes:

- Consent checkpoint.
- Browser permission.
- Listening idle.
- Audio meter active.
- Silence/no audio.
- Live transcript.
- Claim hit.
- Marker hit.
- Pause/resume.
- End session.
- Speaker correction.

Required UI principle:

The visualizer and transcript are the proof that the system is working. The screen should feel live, light, and controllable.

### Uploads and direct media URLs

Nodes:

- Upload default.
- Drag hover.
- File selected.
- Uploading.
- Transcoding.
- Transcribing.
- Unsupported file.
- Direct URL entry.
- Media detected.
- Remote fetch blocked.
- Unsupported MIME.
- Ready review surface.

Required UI principle:

The user should understand what kind of media Yentl detected and where the analysis will appear before waiting.

### Text, article, PDF, document

Nodes:

- Paste text.
- Text URL import.
- PDF upload.
- OCR/progress.
- Document outline.
- In-document highlight.
- Claim anchor.
- Source/citation drawer.
- Document review.

Required UI principle:

Document review is reading-first. Analysis is layered around the document, not flattened into generic transcript rows.

### Claim-only quick check

Nodes:

- Claim text entry.
- Optional context/source prompt.
- Too vague to check.
- Duplicate or recently checked claim.
- Source search progress.
- Supported result.
- Contradicted result.
- Mixed or caveated result.
- No valid backing found.
- Still checking.
- Genuinely unknown factual condition.
- Devil's Advocate.
- Save/export quick result.

Required UI principle:

Claim-only checking is for one precise factual assertion when the user does not have a media, page, or document source to ingest. It must ask for context when needed, show what evidence was searched, avoid a final user-facing "unverifiable" verdict, and preserve the original claim in any saved/exported result.

### Core review workspace

Nodes:

- Overview.
- Watch/video.
- Audio-only.
- Article.
- Document.
- Transcript.
- Claims list.
- Markers list.
- Claim detail.
- Marker detail.
- Source detail.
- Yentl Opinion.
- Devil's Advocate.
- Speaker correction.
- Reassign phrase.
- Save dialog.
- Export modal.
- End dialog.

Required UI principle:

Top level shows the most important numbers and Yentl's current read. Deeper evidence is progressive: top-level, secondary, tertiary, then full audit trail.

### Visual evidence

Nodes:

- Source card with validated thumbnail.
- Source card no-thumbnail fallback.
- Article/video card.
- Claim detail source gallery.
- Marker chip icon.
- Marker row icon.
- Marker learning card.
- Archetype animation.
- Reduced-motion state.

Required UI principle:

Visual evidence is part of trust. A wrong thumbnail is worse than no thumbnail.

### Export and library

Nodes:

- Save session.
- Save confirmation.
- Export report.
- Markdown export.
- JSON export.
- Report preview.
- Library empty.
- Library populated.
- Search/filter/sort.
- Clear saved sessions.
- Local-browser privacy copy.

Required UI principle:

Exports must disclose AI assistance, source context, evidence status, generated timestamp, and methodology link.

## Mobile and platform rules

Every web screen with user-facing product value needs a mobile variant.

Mobile app equivalents:

- Share sheet import.
- File picker.
- Microphone.
- URL/text entry.
- Saved sessions/library.
- Evidence bottom sheets.
- Claim/marker detail full screens.

Mobile honesty:

- Do not promise arbitrary other-app audio capture if the platform cannot do it.
- Use share sheet, file import, microphone, URLs, and text/document flows.

## Implementation notes

Primary files:

- `components/session/az-flow-dashboard.tsx`
- `components/session/ux-flow-dashboard.tsx`
- `components/session/visual-evidence-dashboard.tsx`
- `app/api/project-flow-comments/route.ts`
- `components/session/watch-view.tsx`
- `components/session/source-card.tsx`
- `components/session/SourceListItem.tsx`
- `components/session/MarkerChip.tsx`
- `components/session/marker-row.tsx`

Primary docs:

- `docs/superpowers/plans/2026-05-21-yentl-complete-flow-screen-state-plan.md`
- `docs/superpowers/handoff/2026-05-21-yentl-next-session-flow-implementation-handoff.md`

## Acceptance tests

Minimum tests:

- A-to-Z tab renders screenshot-status labels.
- YouTube granular states render.
- Missing-state lists render.
- Point comments can be created, edited, removed, and saved.
- Full-length and fit-screen controls render.
- Visual Evidence tab renders 123 marker rows.
- Source thumbnail UI never shows fake evidence thumbnails.

Manual QA:

- Open `/project/flows`.
- Open Promo full-page screenshot; scroll full length.
- Place, edit, remove, save a point comment.
- Confirm saved JSON includes the comment.
- Open YouTube URL Entry, Preview Shell, Link Resolving, Video Ready, and Caption Fallback nodes.
- Confirm any stale/reference/missing screen is visibly labeled.
