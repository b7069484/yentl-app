# M1 Session Route Context And Tap Targets

Timestamp: 2026-06-09T21:20:00-0400

## Outcome

Status: `verified_done`

Session navigation now preserves the current session/query context when moving between Overview, Watch, Source, Transcript, Claims, Markers, nested overview review links, source-review links, detail-back links, transcript context links, Learn pages, copied detail links, and Room mode. A validation sample, restored/shared title, timestamp, or source context is no longer dropped just because the user changes views, opens a learning route, shares a detail link, or opens the TV-sized room display.

## Product Impact

Before this slice, the session tabs and several deeper links rebuilt routes as plain `/session?view=...`, the Share action copied bare detail URLs, and the toolbar Room action pointed to bare `/tv`. On validation, shared, restored, or timestamped sessions, switching tabs, opening review links, jumping to transcript context, returning from a source-backed claim detail, opening Learn more, copying a detail link, or opening room mode could silently lose `demo`, `sample`, `title`, `t`, or other query state.

After this slice, shared route helpers rewrite only the intended target parameter while preserving the active session context. Review links clear stale source-block filters where appropriate; Learn, related-detail, source-detail, and copied share links carry validation/restored context for hydration; Room carries validation sample context to `/tv?demo=validation&sample=...` while ordinary live sessions still use `/tv`. Core overview/source controls also meet mobile tap-target sizing after browser proof surfaced undersized headline/topic/source links.

## Files Changed

- `lib/client/session-route.ts`
- `components/session/session-shell.tsx`
- `components/session/home-overview.tsx`
- `components/session/activity-feed.tsx`
- `components/session/source-review-view.tsx`
- `components/session/item-detail.tsx`
- `components/session/claim-detail.tsx`
- `components/session/marker-detail.tsx`
- `components/session/claim-learn-more.tsx`
- `components/session/marker-learn-more.tsx`
- `components/session/synthesis-card.tsx`
- `components/session/topic-strip.tsx`
- `tests/session-shell.test.tsx`
- `tests/home-overview.test.tsx`
- `tests/source-review-view.test.tsx`
- `tests/item-detail.test.tsx`
- `tests/learn-more.test.tsx`

## Verification

- `npx vitest run tests/session-shell.test.tsx tests/home-overview.test.tsx tests/activity-feed.test.tsx tests/source-review-view.test.tsx tests/item-detail.test.tsx` passed: 147 tests.
- `npx vitest run tests/synthesis-card.test.tsx tests/topic-strip.test.tsx tests/activity-feed.test.tsx tests/source-review-view.test.tsx tests/home-overview.test.tsx tests/session-shell.test.tsx tests/item-detail.test.tsx` passed: 198 tests.
- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx tests/session-shell.test.tsx tests/home-overview.test.tsx tests/source-review-view.test.tsx` passed: 156 tests.
- `npx vitest run tests/item-detail.test.tsx tests/learn-more.test.tsx` passed: 72 tests.
- `npx tsc --noEmit` passed.
- `npm run lint` passed with 0 errors and 18 existing warnings.
- `npm run test:run` passed: 146 files, 1632 tests.
- `npm run build` passed.
- `npm run build:automation` passed.

## Browser Proof

Desktop media route checked:

- `http://127.0.0.1:3000/session?demo=validation&sample=media_playback_sync&title=Fixture%20clip&view=overview&t=17`

Observed tab hrefs:

- Overview: `/session?demo=validation&sample=media_playback_sync&title=Fixture+clip&view=overview&t=17`
- Watch: `/session?demo=validation&sample=media_playback_sync&title=Fixture+clip&view=watch&t=17`
- Transcript: `/session?demo=validation&sample=media_playback_sync&title=Fixture+clip&view=transcript&t=17`
- Claims: `/session?demo=validation&sample=media_playback_sync&title=Fixture+clip&view=claims&t=17`
- Markers: `/session?demo=validation&sample=media_playback_sync&title=Fixture+clip&view=markers&t=17`

Browser result: zero console errors and no horizontal overflow.

Desktop text-source route checked:

- `http://127.0.0.1:3000/session?demo=validation&sample=source_quote_anchors&title=Source%20fixture&view=overview&t=17&block=3`

Observed nested review hrefs:

- Review source: `/session?demo=validation&sample=source_quote_anchors&title=Source+fixture&view=source&t=17`
- Review transcript: `/session?demo=validation&sample=source_quote_anchors&title=Source+fixture&view=transcript&t=17`
- Review claims: `/session?demo=validation&sample=source_quote_anchors&title=Source+fixture&view=claims&t=17`

Browser result: zero console errors and no horizontal overflow.

Room-mode action proof:

- Route checked: `http://127.0.0.1:3000/session?demo=validation&sample=media_playback_sync&view=watch&t=17`
- Observed Room href after hydration: `/tv?demo=validation&sample=media_playback_sync`
- Browser result: zero console errors and no horizontal overflow.

Mobile/tap-target proof:

- Route checked at 390x844: `http://127.0.0.1:3000/session?demo=validation&sample=source_quote_anchors&title=Source%20fixture&view=overview&t=17&block=3`
- Route checked at 1280x800: `http://127.0.0.1:3000/session?demo=validation&sample=source_quote_anchors&title=Source%20fixture&view=source&t=17&block=1`
- Browser result: zero console errors, no horizontal overflow, and no undersized visible controls except the intentionally hidden 1x1 skip link.

Learn-link proof:

- Unit proof covers claim detail -> claim learn, marker detail -> marker learn, claim learn -> source detail, claim learn -> related claim, marker learn -> occurrence detail, and marker learn -> related pattern with `demo=validation`, `sample`, and `title` preserved.
- Unit proof covers claim and marker Share actions copying detail URLs with `demo=validation`, `sample`, and `title` preserved.
- Direct browser proof for the hydrated learn/detail route could not be collected in this run because the in-app browser tool reset before sending the route request to the dev server. The app-side gates above remained green after the change.
