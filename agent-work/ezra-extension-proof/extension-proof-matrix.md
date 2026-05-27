# Ezra Extension Proof Matrix

Date: 2026-05-21  
App origin: `http://localhost:3000`  
Chrome extension load path: `/Users/israelbitton/Live FactCheck/extension`  
Extension observed in Chrome: `Yentl Tab Listener`

## Summary

| Surface | Result | Evidence |
| --- | --- | --- |
| Required extension tests | Pass | `npx vitest run tests/extension-panel-view.test.tsx tests/extension-content-script.test.ts tests/extension-offscreen.test.ts tests/extension-bridge.test.tsx` passed: 4 files, 17 tests. |
| Real webpage verifier | Pass | `node scripts/validation/verify-real-webpage-targets.mjs` passed: 2 real webpage targets verified. |
| Local validation media page | Pass | Panel injected on the same page, tab content shared, transcript reached `0:24`, markers reached `2`, stop worked. Screenshots: `screenshots/local-validation-extension-panel.png`, `screenshots/local-validation-transcript-markers.png`. |
| Real Wikimedia video page | Pass for same-page capture and transcript; snapshot handoff needed fix | Panel injected on the same page after granting Yentl site access, tab content shared, audio status moved to audio/transcribing/stopped, transcript reached `0:30`, markers reached `2`, export controls appeared. Screenshots: `screenshots/wikimedia-video-panel-transcript-markers.png`, `screenshots/wikimedia-video-panel-stopped.png`, `screenshots/wikimedia-export-controls.png`. |
| Real Wikinews article page | Partial / blocked by Chrome site permission | Yentl rail injected and Chrome marked tab content shared, but the embedded localhost workspace was blocked by Chrome after the site prompted for access to other apps/services. I did not approve that permission on the user's behalf. Screenshot: `screenshots/wikinews-article-panel-blocked.png`. |
| YouTube tab | Not attempted | A YouTube tab was open, but this pass avoided changing the user's existing YouTube state after proving the real media path on Wikimedia. |

## Required Behaviors

| Requirement | Local validation page | Wikinews article | Wikimedia video |
| --- | --- | --- | --- |
| Panel injects beside original page | Pass | Pass | Pass |
| Page content reserves room for panel | Pass | Pass | Pass |
| Page text appears | Pass | Blocked after rail injection | Pass, but Wikimedia UI text also entered the transcript at `0:00`; that is a quality issue to review. |
| Tab audio status changes | Pass: active/transcript/stopped | Not applicable: text page | Pass: active/audio arriving/transcribing/stopped |
| Transcript arrives | Pass: `0:24` | Not applicable | Pass: `0:30` |
| Claims tab updates | `0` claims in observed local stop state | Not observed | `0` claims in observed media stop state |
| Markers tab updates | Pass: `2` markers | Not observed | Pass: `2` markers |
| Report button visible | Pass | Blocked by iframe load | Pass |
| Markdown/JSON export controls visible | Pass | Blocked by iframe load | Pass |
| Open snapshot preserves state | Local path previously visible; real-site path failed live before fix | Blocked | Failed live before fix with `Saved snapshot not found`; code fix added to mirror the saved record into the popup's top-level IndexedDB before navigation. Fresh manual proof is still needed after a clean capture. |

## Fix Applied

The real-site `Open snapshot` path failed because Chrome partitions storage for `localhost` inside a third-party page iframe. The panel saved state in the iframe's partition, then opened a top-level `localhost` workspace that could not see that IndexedDB record.

Code change:

- `components/session/extension-panel-view.tsx`: waits for `loadSession(meta.id)` after saving, then mirrors the saved record into the popup window's own `yentl/sessions` IndexedDB before setting `popup.location.href`.
- `tests/extension-panel-view.test.tsx`: mocks `loadSession` and verifies `Open snapshot` waits for the saved id before opening the restore URL.

Verification after code change:

- `npx vitest run tests/extension-panel-view.test.tsx tests/extension-content-script.test.ts tests/extension-offscreen.test.ts tests/extension-bridge.test.tsx` passed.
- `npx tsc --noEmit --pretty false` passed.
- `node scripts/validation/verify-real-webpage-targets.mjs` passed.

## Screenshots

- `/Users/israelbitton/Live FactCheck/agent-work/ezra-extension-proof/screenshots/local-validation-extension-panel.png`
- `/Users/israelbitton/Live FactCheck/agent-work/ezra-extension-proof/screenshots/local-validation-transcript-markers.png`
- `/Users/israelbitton/Live FactCheck/agent-work/ezra-extension-proof/screenshots/wikinews-article-panel-blocked.png`
- `/Users/israelbitton/Live FactCheck/agent-work/ezra-extension-proof/screenshots/wikimedia-video-panel-audio-arriving.png`
- `/Users/israelbitton/Live FactCheck/agent-work/ezra-extension-proof/screenshots/wikimedia-video-panel-transcript-markers.png`
- `/Users/israelbitton/Live FactCheck/agent-work/ezra-extension-proof/screenshots/wikimedia-video-panel-stopped.png`
- `/Users/israelbitton/Live FactCheck/agent-work/ezra-extension-proof/screenshots/wikimedia-export-controls.png`
- `/Users/israelbitton/Live FactCheck/agent-work/ezra-extension-proof/screenshots/open-snapshot-not-found.png`

