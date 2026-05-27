# Source Visual Evidence Rules

Eli source-image policy implemented on 2026-05-21:

1. Source evidence thumbnails must be source-provided, not generated.
2. A thumbnail can render only when `image_status` is `validated`.
3. The image provenance must be one of:
   - `youtube_oembed`
   - `open_graph`
   - `twitter_card`
   - `schema_org`
4. The rendered thumbnail URL must be absolute `http` or `https`.
5. Local/generated visual evidence paths such as `/visual-evidence/...` never count as source evidence, even if a caller marks them `validated`.
6. Open Graph, Twitter card, and schema.org image candidates are validated server-side through the SSRF guard before they are returned as usable thumbnails.
7. Redirect targets are rechecked before following.
8. If `HEAD` does not prove an image, Yentl makes a tiny guarded `GET` probe with `Range: bytes=0-0`.
9. If an image candidate is blocked, invalid, missing, or not source-provided, the UI renders an honest no-thumbnail fallback with the reason instead of substituting marker art or generated imagery.

Code contracts:

- `lib/client/source-preview.ts` is the client gate used by source cards and claim hero selection.
- `lib/server/og-fetch.ts` extracts source-provided image candidates and validates them before returning `image_status: "validated"`.
- `components/session/source-card.tsx`, `components/session/SourceListItem.tsx`, and `components/session/ClaimCard.tsx` render thumbnails only through `isValidatedSourceImage()`.

Verification:

- `npx vitest run tests/og-fetch.test.ts tests/hero-selection.test.ts` passed: 2 files, 28 tests.
- `npx tsc --noEmit` passed.
- `npx eslint lib/client/source-preview.ts lib/server/og-fetch.ts components/session/ClaimCard.tsx components/session/SourceListItem.tsx components/session/source-card.tsx tests/og-fetch.test.ts tests/hero-selection.test.ts` passed.
- Browser rendered `http://localhost:3000/project/flows`, Visual Evidence System tab.

Screenshots:

- `agent-work/eli-source-visuals/screenshots/source-card-states.png`
- `agent-work/eli-source-visuals/screenshots/source-card-fallback-state.png`

Scope compliance:

- Edited only Eli source-preview/source-card files, relevant tests, and Eli/reporting deliverables.
- Did not edit marker educational assets, corpus scripts, extension scripts, another agent folder, branch state, staging, or commits.
