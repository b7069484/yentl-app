# YouTube Validation Analysis Quality

Date: 2026-06-09

## Scope

Built the next YouTube validation slice beyond caption import: deterministic local analysis for the Hans Rosling validation video plus a Watch-view meta-read fallback so imported sources do not sit without a top-line read when model synthesis is unavailable or late.

## Product Behavior Proven

- `/session?source=youtube` can load the validation YouTube source and arm captions.
- `Analyze caption track` imports the full local Rosling transcript into Watch.
- Watch renders source identity for `Hans Rosling: Global population growth, box by box` with `TED · fTznEIZRkLg`.
- Watch renders 241 transcript lines.
- Watch renders 4 detected claims and 1 rhetoric marker.
- Evidence queue includes:
  - `The world population reached about three billion people in 1960.`
  - `Between 1960 and 2010, about four billion people were added to the world population.`
  - `Rosling says world population can stabilize near nine billion if child survival improves.`
  - `Framing Effect` marker for `I'm a very serious "possibilist."`
- Watch renders a `Yentl's read` card even while richer synthesis is still refreshing:
  - `Hans Rosling: Global population growth, box by box has 4 checkable claims across 241 transcript lines. 4 claims are past first-pass checking: 2 mostly supported, 2 needs context; 4 claims have source evidence; 1 rhetoric marker surfaced. Treat this as the live meta-read until Yentl's fuller synthesis refreshes.`
- Non-fixture rhetoric analysis now uses the gateway-supported Anthropic cache-control hint (`ephemeral`) instead of the rejected `persistent` value observed in the dev log.
- Mobile proof at 390 x 844 showed no horizontal overflow:
  - `scrollWidth=390`
  - `clientWidth=390`
  - `noHorizontalOverflow=true`
- Browser console errors: none.

## Files Changed

- `lib/server/youtube-validation-analysis-fixtures.ts`
- `lib/server/youtube-validation-fixtures.ts`
- `app/api/extract-claims/route.ts`
- `app/api/analyze-rhetoric/route.ts`
- `app/api/verify-provisional/route.ts`
- `app/api/verify-confirmed/route.ts`
- `app/api/synthesize/route.ts`
- `components/session/watch-view.tsx`
- `components/session/tv-dashboard.tsx`
- `tests/analyze-rhetoric-cache.test.ts`
- `tests/api/model-route-security.test.ts`
- `tests/watch-view.test.tsx`
- `tests/youtube-validation-fixtures.test.ts`

## Gates

- `npm test -- tests/analyze-rhetoric-cache.test.ts tests/watch-view.test.tsx tests/youtube-validation-fixtures.test.ts tests/api/model-route-security.test.ts tests/youtube-ingest-pane.test.tsx tests/api/youtube-ingest.test.ts`
  - 6 files passed
  - 85 tests passed
- `npx tsc --noEmit`
  - passed
- `npm run lint`
  - passed with existing warnings only
- `npm run build`
  - passed
- `npm run test:run`
  - 146 files passed
  - 1589 tests passed

## Notes

- The deterministic analysis fixture is disabled in production.
- The fixture only answers when the local validation source is clearly present.
- The Watch fallback read does not override a real synthesis; it gives the user a live meta-read from the actual claims and markers until richer synthesis lands.
