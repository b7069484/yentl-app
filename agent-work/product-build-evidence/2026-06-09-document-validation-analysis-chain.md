# Document Validation Analysis Chain

Date: 2026-06-09

## Scope

Extended the new DOCX/PDF validation loaders from extraction-only proof into an end-to-end document analysis path. The local validation brief now produces deterministic claims, rhetoric markers, source-trail-aware verification, synthesis/meta-read, and Devil's Advocate output without requiring live model or web-search calls in development/test.

## Product Behavior Proven

- DOCX/PDF validation analysis now has fixture coverage across:
  - `/api/extract-claims`
  - `/api/analyze-rhetoric`
  - `/api/verify-provisional`
  - `/api/verify-confirmed`
  - `/api/synthesize`
  - `/api/devil-advocate`
- The document fixture extracts two claims:
  - `City spending rose by twelve percent this year without raising taxes.`
  - `The mayor's office released a summary about the spending increase.`
- Verification intentionally keeps both claims unresolved/source-trail-dependent instead of overclaiming:
  - missing baseline year
  - missing budget document
  - incomplete source trail
- Rhetoric detection flags:
  - `without raising taxes` as a tax-framing phrase
  - `the exact document still needs to be named` as a source-trail/vagueness cue
- Synthesis/meta-read frames the whole document correctly:
  - this is a source-quality review, not a settled budget finding
  - the baseline year and named document are missing
  - the conversation preserves uncertainty rather than laundering the claim into fact
- Devil's Advocate stresses the exact weak assumption:
  - the twelve-percent figure, tax frame, and mayor summary may not refer to the same fiscal scope.

## Browser Proof

- Desktop `1280 x 720`, `/session?source=text-doc`:
  - clicked `Load validation DOCX`
  - clicked `Process transcript`
  - landed on `/session?view=overview`
  - rendered `Claims · 2`, `Markers · 2`, source-backed document state, the budget claim, the mayor-summary claim, and the document meta-read
  - no horizontal overflow
  - browser console errors: none
- Mobile `390 x 844`, `/session?source=text-doc`:
  - clicked `Load validation DOCX`
  - clicked `Process transcript`
  - overview rendered `Claims · 2`, `Markers · 2`, source-backed DOCX state, and the missing-baseline meta-read
  - no horizontal overflow
  - browser console errors: none
- Mobile Source Review via the app's `Source` tab:
  - route: `/session?view=source`
  - 5 document blocks rendered
  - 5 anchored lines rendered
  - 2 anchored claims rendered
  - quote highlight rendered
  - budget and mayor-summary claims appeared beside their source blocks
  - no horizontal overflow
  - browser console errors: none

## Files Changed

- `lib/server/document-validation-analysis-fixtures.ts`
- `app/api/extract-claims/route.ts`
- `app/api/analyze-rhetoric/route.ts`
- `app/api/verify-provisional/route.ts`
- `app/api/verify-confirmed/route.ts`
- `app/api/synthesize/route.ts`
- `app/api/devil-advocate/route.ts`
- `tests/api/model-route-security.test.ts`

## Gates

- `npm test -- tests/api/model-route-security.test.ts tests/text-ingest-pane.test.tsx tests/project-validation-page.test.tsx tests/text-ingest.test.ts`
  - 4 files passed
  - 81 tests passed
- `npm test -- tests/api/model-route-security.test.ts tests/text-ingest-pane.test.tsx tests/project-validation-page.test.tsx tests/text-ingest.test.ts tests/source-review-view.test.tsx`
  - 5 files passed
  - 92 tests passed
- `npx tsc --noEmit`
  - passed
- `npm run lint`
  - passed with existing warnings only
- `npm run build`
  - passed
- `npm run test:run`
  - 146 files passed
  - 1599 tests passed

## Notes

- The document fixture is disabled in production.
- The fixture only answers when the validation document filename/text context is present.
- Browser verification must switch to Source Review through the in-app `Source` tab; full page navigation reloads the in-memory session store.
