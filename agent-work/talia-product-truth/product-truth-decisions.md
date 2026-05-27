# Talia product truth decisions

Date: 2026-05-21
Workspace: `/Users/israelbitton/Live FactCheck`

## Decisions locked in this pass

1. **v1 account story:** Yentl v1 is guest-first. Account sign-in and cross-device sync are not part of the v1 save story unless a deployment explicitly enables them and updates product copy.
2. **Saved sessions:** "Saved sessions" means browser-local IndexedDB saves on the same browser/device. It does not mean server account history or cross-device sync.
3. **Auth fallback:** `/signin` and `/signup` must not render blank when Clerk is not configured. They now show a visible local-first fallback with routes back to checking or privacy/local saves.
4. **Product line:** Use "Yentl checks what is being said."
5. **Source picker:** Use "What are you checking?" as the heading, "Analyze the video on this page" for browser-tab intake, and "Use tab capture" for the featured action.
6. **Visible verdict labels:** Use `Checking`, `Supported`, `Mixed`, `False`, `No reliable backing`, and `Opinion` in the edited user-facing verdict surfaces.
7. **Internal enum boundary:** The internal `UNVERIFIABLE` enum remains for compatibility in prompts, state, API fixtures, and tests. User-facing copy should map it to `No reliable backing`.
8. **Internal/dev language:** Normal end-user paths should not show `functional sample`, `validation lab`, `engagement gate`, `/docs/engagement-gate`, or `drop lib/taxonomy`. Internal `/project/*` pages may still use validation language because they are review/development surfaces.
9. **Contact route truth:** Broken `/contact` links were removed from edited policy pages. Because no real contact route or verified email is present in scope, the pages now state that public contact details are not enabled in this build and must be published before public launch.

## Files changed

- `/Users/israelbitton/Live FactCheck/app/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/about/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/methodology/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/privacy/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/terms/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/subprocessors/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/signin/[[...rest]]/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/signup/[[...rest]]/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/sessions/page.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/source-picker.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/claim-detail.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/marker-learn-more.tsx`
- `/Users/israelbitton/Live FactCheck/lib/client/verdict-theme.ts`
- `/Users/israelbitton/Live FactCheck/tests/source-picker.test.tsx`
- `/Users/israelbitton/Live FactCheck/tests/sessions-library-page.test.tsx`
- `/Users/israelbitton/Live FactCheck/tests/item-detail.test.tsx`
- `/Users/israelbitton/Live FactCheck/tests/auth-fallback.test.tsx`

## Verification

- `npm test -- tests/source-picker.test.tsx tests/sessions-library-page.test.tsx tests/item-detail.test.tsx tests/auth-fallback.test.tsx` — 4 files, 45 tests passed.
- `npm test -- tests/chips.test.tsx tests/filter-selectors.test.ts tests/filtered-list.test.tsx` — 3 files, 96 tests passed.
- `npm run lint -- app/page.tsx app/about/page.tsx app/methodology/page.tsx app/privacy/page.tsx app/terms/page.tsx app/subprocessors/page.tsx 'app/signin/[[...rest]]/page.tsx' 'app/signup/[[...rest]]/page.tsx' app/sessions/page.tsx components/session/source-picker.tsx components/session/claim-detail.tsx components/session/marker-learn-more.tsx lib/client/verdict-theme.ts tests/auth-fallback.test.tsx tests/source-picker.test.tsx tests/sessions-library-page.test.tsx tests/item-detail.test.tsx` — passed.
- Browser smoke on existing `http://localhost:3000`: `/`, `/session`, `/sessions`, `/signin`, `/signup`, `/about`, `/methodology`, `/privacy`, `/terms`, `/subprocessors` all rendered expected copy with no visible app error.
- Screenshots saved:
  - `/Users/israelbitton/Live FactCheck/agent-work/talia-product-truth/screenshots/home.png`
  - `/Users/israelbitton/Live FactCheck/agent-work/talia-product-truth/screenshots/session-source-picker.png`
  - `/Users/israelbitton/Live FactCheck/agent-work/talia-product-truth/screenshots/signin-fallback.png`

## Scope compliance

Stayed inside the allowed primary files, direct tests for edited routes/components, and Talia/reporting deliverables. I did not edit extension code, corpus scripts, security/API behavior, marker assets, `.claude/`, `.claire/`, or another agent folder.
