# Yentl World-Class UX + Committee Audit · Pickup Handoff

**Date:** 2026-05-20 22:39 EDT
**Workspace:** `/Users/israelbitton/Live FactCheck`
**User-facing current URL:** `http://localhost:3000/session?view=flows#flow-drilldown`
**Status:** UX flow atlas expanded and verified; simulated expert committee audit complete; next session should implement fixes, starting with P0 trust/state/navigation blockers.

## Important Context

This handoff summarizes the latest Codex work and a simulated committee review. The committee was **not** actual executives from Apple, OpenAI, Instagram, ElevenLabs, Blizzard, or Scholastic. It was a structured expert-lens audit using those disciplines:

- Apple-level UI/UX craft
- OpenAI-style consumer AI product/trust
- Instagram-style engagement/retention
- ElevenLabs-style audio/voice product
- Blizzard-style interaction/game feel
- Scholastic-style edtech/digital pedagogy

The user wants the next session to pick up fresh and “knock it all out.” Be proactive. Implement, verify, and keep moving. Do not stop at proposals unless the user redirects.

## User Intent

The user wants Yentl to become a world-class, robust, beautiful, intuitive, enjoyable fact-checking experience across:

- YouTube and captioned video
- Any video on any page via Chrome extension tab audio capture
- Audio files
- Direct media URLs
- Text/transcript/doc inputs
- Live microphone
- Desktop and mobile web
- Future iOS/Android app
- Trust/legal/methodology surfaces
- Edtech/classroom possibilities

The user was especially concerned that the UI atlas must simulate real desktop/mobile layouts, not tiny fake windows with clipped text or empty space. Mobile wireframes were audited and fixed in the latest pass.

## What Was Done In This Session

### 1. Created / expanded the UX Flows atlas

File:

- `components/session/ux-flow-dashboard.tsx`

Test:

- `tests/ux-flow-dashboard.test.tsx`

The flow atlas now covers **12 product flow groups** and **40 desktop/mobile screen frames**:

1. YouTube Captions
2. Browser Tab Capture
3. Audio File
4. Text / Document
5. Microphone
6. Media URL
7. Session Workspace
8. Drill-down / Learning
9. Session Management
10. Public / Trust / Account
11. Chrome Extension
12. Mobile App Prep

The atlas includes:

- Desktop and mobile simulations for every planned screen
- “Why this is weak” critique for each screen
- “Good design target” guidance for each screen
- A top-level Screen Atlas Index
- Review rules for desktop, mobile, and approval
- More realistic 1440 x 900 desktop framing
- More realistic mobile frame sizing

### 2. Improved core wireframe targets

The atlas was upgraded from generic skeletons into more concrete target UX for:

- Overview: command center with synthesis, metrics, topic concentration, activity
- Watch: large real 16:9 player with side review queue and bottom action row
- Transcript: audit/search/correction surface
- Claims and Markers lists: filter/sort rows with verdict/severity context
- Claim and Marker detail: evidence/pattern hero, confidence/strength, actions
- Learn screens: source dossier / pattern guide structure
- Save/export/end/library
- Landing/auth/trust
- Extension popup/options
- Mobile import/live/library

### 3. Fixed mobile atlas overflow

User pointed out that most mobile wireframes did not fit correctly and some text/buttons overflowed.

Fixes made:

- Mobile frame changed from tiny thumbnail to realistic phone simulation:
  - width max `390px`
  - height `740px`
- Added defensive `min-w-0` and wrapping rules inside screenshot frames
- Removed bad truncation where copy should wrap
- Tightened mobile detail screen padding/type
- Repaired repeated overflow sources in:
  - YouTube input
  - Audio upload
  - Overview activity rows
  - Claims/Markers lists
  - Claim/Marker detail
  - Save/export/end dialog backgrounds
  - Landing/auth/trust screens

Rendered browser audit result:

```text
40 mobile frames checked
0 visible horizontal overflow problems
```

### 4. Verified health gates after atlas changes

Commands run successfully:

```bash
npx vitest run tests/ux-flow-dashboard.test.tsx
npx tsc --noEmit
npm run lint
```

Status:

- UX flow dashboard test passed
- TypeScript passed
- Lint passed with the existing 28 warnings and no errors

Existing lint warnings are unrelated historical warnings, not introduced by the atlas pass.

### 5. Ran simulated expert committee audit

Six subagents reviewed the codebase/readme/docs/UI. No files were edited by committee agents. Their findings are consolidated below.

## Current Dirty Tree Warning

`git status --short` shows many modified and untracked files. Do **not** reset, checkout, or revert unless the user explicitly asks.

Known relevant new/untracked files from this work:

- `components/session/ux-flow-dashboard.tsx`
- `tests/ux-flow-dashboard.test.tsx`
- `docs/browser-tab-capture.md`
- `extension/`
- `components/session/ExtensionBridge.tsx`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`
- `tests/extension-bridge.test.tsx`

There are also many existing modified files from earlier work:

- `app/session/layout.tsx`
- `app/session/page.tsx`
- `components/session/session-shell.tsx`
- `components/session/source-picker.tsx`
- `components/session/watch-view.tsx`
- `components/session/home-overview.tsx`
- ingest pane tests and related store/router files

Treat all dirty files as meaningful. Work with them, do not revert them.

## Committee Audit Results

### P0: Must Fix First

#### 1. Broken Claims/Markers drill-down from filtered lists

**Finding:** Claims and markers list rows link to routes that do not exist:

- Current wrong links:
  - `/session/claim/:id`
  - `/session/marker/:id`
- Actual route:
  - `/session/detail/[type]/[id]`

Files:

- `components/session/filtered-list.tsx`
- `app/session/detail/[type]/[id]/page.tsx`

Fix:

- Change claim rows to `/session/detail/claim/${claim.id}`
- Change marker rows to `/session/detail/marker/${marker.id}`
- Preserve filter context with `from=` so sibling navigation works
- Add tests in `tests/filtered-list.test.tsx` asserting row hrefs

Why it matters:

This is the core exploration loop. It cannot be broken.

#### 2. Browser-tab capture state is not truthful

**Finding:** The app can show `Listening` before extension capture/audio/Deepgram is actually connected. Starting a waiting session currently starts a session and may mark recording-like state too early.

Files:

- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`
- `components/session/ExtensionBridge.tsx`
- `components/session/home-overview.tsx`
- `lib/client/session-store.ts`
- `docs/browser-tab-capture.md`

Fix:

- Add explicit browser capture state:
  - `idle`
  - `waiting_for_extension`
  - `extension_connected`
  - `capturing`
  - `transcribing`
  - `no_audio_detected`
  - `error`
  - `stopped`
- Only show `Listening` after extension `capture-start` and live transcription stream readiness
- Render app-side waiting cockpit:
  - selected tab
  - extension connection
  - permissions
  - audio meter
  - last error
  - retry / open extension / switch source

#### 3. End/Pause in app does not reliably control extension capture

**Finding:** Ending local app state does not necessarily send a stop command to the Chrome extension/offscreen capture. Capture can continue until the extension is manually stopped.

Files:

- `components/session/EndSessionDialog.tsx`
- `components/session/session-shell.tsx`
- `extension/background.js`
- `extension/content-script.js`
- `extension/offscreen.js`
- `docs/browser-tab-capture.md`

Fix:

- Implement app → content-script → background command messages:
  - `pause`
  - `resume`
  - `stop`
  - `status`
- Require extension ACK before UI claims capture is stopped
- Make extension errors close recorder/tracks consistently

#### 4. Consent/trust claims are ahead of implementation

**Finding:** Docs imply a real consent gate, but shipped UI has a dismissible reminder. Mic/browser-tab capture can begin without a true pre-capture consent checkpoint.

Files:

- `README.md`
- `components/session/TwoPartyDisclosure.tsx`
- `components/session/ingest-panes/mic-prerecord-pane.tsx`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`

Fix:

- Add source-specific pre-capture consent checkpoint
- Make it explicit for:
  - mic/live room recording
  - browser tab audio capture
  - uploaded recordings
- Use clear copy:
  - “You are responsible for consent where required.”
  - “Yentl does not know where you are.”
  - “Do not record people illegally.”
- Persist only acknowledgment state needed for UX, not sensitive content

#### 5. Public trust pages misstate current pipeline

**Finding:** Methodology/privacy pages describe implementation details that do not match current code:

- model classes
- provisional web-search-backed verification
- label schema
- engagement gate status
- Deepgram endpoint/regional claim

Files:

- `app/methodology/page.tsx`
- `app/privacy/page.tsx`
- `docs/engagement-gate.md`
- `lib/prompts/verify-provisional.ts`
- `app/api/extract-claims/route.ts`
- `lib/client/deepgram-stream.ts`

Fix:

- Create a single “pipeline manifest” source of truth and render trust pages from it
- Clearly mark planned safeguards as planned, not active
- Fix `/docs/engagement-gate` and `/contact` broken links or remove links until routes exist

#### 6. “Confidence” is conflated with truth score

**Finding:** Claim `score` is displayed as confidence, but prompts treat it as verdict/truth score. `UNVERIFIABLE = 50` reads like uncertainty rather than insufficient evidence.

Files:

- `components/session/claim-detail.tsx`
- `lib/prompts/verify-confirmed.ts`
- `lib/types.ts`

Fix:

- Split into:
  - `truth_rating`
  - `model_confidence`
  - `evidence_quality`
- For unverifiable claims, show “Insufficient evidence” instead of numeric 50/100
- Update UI labels and export wording

#### 7. Saved-session privacy story conflicts with ephemeral language

**Finding:** Sessions are persisted locally in IndexedDB, while some trust docs still lean on ephemeral/in-memory claims.

Files:

- `lib/client/session-storage.ts`
- `components/session/SaveSessionDialog.tsx`
- `app/privacy/page.tsx`
- `docs/dpia.md`

Fix:

- Make first save a clear privacy opt-in
- Label `/sessions` as “local to this browser”
- Add “Clear all saved sessions”
- Update privacy/DPIA/README

#### 8. Edtech/student use is blocked by terms and tone

**Finding:** Terms make product 18+. Classroom/student deployment is blocked unless a separate classroom mode is designed.

Files:

- `app/terms/page.tsx`
- `components/session/AIDisclosureFooter.tsx`
- `app/methodology/page.tsx`

Fix:

- Decide lane:
  - adult/teacher-only tool, or
  - separate classroom mode with district/guardian consent and school-safe defaults
- Replace glib “Use your head” style trust copy with clearer language:
  - “AI can be wrong. Check the evidence before you decide.”

## P1: High-Impact Product / UX Fixes

### Source selection is too implementation-led

Current source picker asks users to choose technology:

- Microphone
- Browser tab
- Text doc
- Audio file
- YouTube
- Media URL

Fix:

- Redesign around user jobs:
  - “Analyze a video I can play”
  - “Upload audio/video”
  - “Paste transcript”
  - “Use microphone”
  - “Check a single claim”
- Make Browser tab the hero path for “any video on any page”
- Keep YouTube captions as fast path, but not a dead-end path

File:

- `components/session/source-picker.tsx`

### Browser-tab handoff needs a production cockpit

Fix app + extension together:

- extension popup with target tab title
- start/stop status
- current Yentl origin
- audio meter
- permissions/consent copy
- diagnostic state
- app waiting screen mirrors extension state

Files:

- `extension/manifest.json`
- `extension/options.html`
- `extension/options.js`
- `extension/background.js`
- `extension/offscreen.js`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`

### Analysis completion is unclear

Bulk ingest redirects when transcript is ready, but claims/markers/verification/synthesis may still be running.

Fix:

- Add explicit progress states:
  - transcript ready
  - extracting claims
  - analyzing rhetoric
  - verifying sources
  - synthesis ready
- Mark export as partial while analysis is still running

Files:

- `lib/client/ingest-orchestrator.ts`
- `components/session/ingest-panes/youtube-ingest-pane.tsx`
- audio/media/text panes

### Failure recovery should be standardized

Current:

- YouTube has good recovery ladder
- mic errors are dismiss-only
- extension errors become interim transcript text
- media URL failures do not consistently route to alternatives

Fix:

- Shared error card component:
  - what failed
  - what data is preserved
  - retry
  - switch source
  - diagnostics

Files:

- `app/session/layout.tsx`
- `components/session/ExtensionBridge.tsx`
- `components/session/ingest-panes/media-url-ingest-pane.tsx`
- `components/session/ingest-panes/youtube-ingest-pane.tsx`

### Exports need trust framing

HTML/Markdown/JSON exports should include:

- AI-assisted/not authoritative disclosure
- generated timestamp
- source count
- verification status
- methodology link
- claim evidence context

Files:

- `lib/export/report.ts`
- `lib/export/markdown.ts`
- `lib/export/json.ts`
- `components/session/ExportDialog.tsx`

### Touch targets and mobile controls

Findings:

- Header tabs/controls are small
- `Button size="sm"` is `h-7`
- session library icon actions are tiny
- dismiss buttons may be too small

Fix:

- All important touch controls at least 44px on coarse pointers
- Mobile bottom action strip for live session controls
- Add tests beyond base button component

Files:

- `components/ui/button.tsx`
- `components/session/session-shell.tsx`
- `components/session/TwoPartyDisclosure.tsx`
- `app/sessions/page.tsx`

### Pre-session navigation lies about current state

Example:

- `/session?view=transcript` with no session shows source picker but highlights Transcript
- after selecting YouTube, Watch may appear before a session exists

Fix:

- Separate Start/source flow from active session workspace nav
- Hide workspace tabs until `startedAt`, except internal dev flows if allowed
- Redirect non-`flows` views back to source/start when no session exists

Files:

- `app/session/page.tsx`
- `components/session/session-shell.tsx`

### Timer/live state needs real ticking

Findings:

- elapsed time is derived from `Date.now()` in render but not guaranteed to update every second
- speaker rail says “Listening for voices…” before any session is active

Fix:

- Shared ticking hook for live session
- Freeze timer after ended
- State-aware speaker rail copy:
  - idle
  - waiting for source
  - listening
  - paused

Files:

- `components/session/session-shell.tsx`
- `components/session/SessionTimer.tsx`
- `components/session/speaker-rail.tsx`

### Watch transcript auto-follow can fight the user

Finding:

- YouTube polls every 250ms
- `WatchView` scrolls on every `currentTime` change
- manual transcript scanning can feel slippery

Fix:

- Auto-scroll only when `currentSegStart` changes
- Pause follow mode after user scrolls
- Add “follow playhead” toggle
- Respect reduced motion

Files:

- `components/session/watch-view.tsx`
- `lib/client/youtube-adapter.ts`

### Accessibility issues

Findings:

- global skip link targets `#main-content`
- `/` and `/sessions` may not define that id
- `ClaimsLiveRegion` is decorative/empty rather than announcing new claims
- small `ink-4/ink-5` metadata can be too low contrast

Fix:

- Add `id="main-content"` to top-level route mains
- Add live region messages for debounced new claims/markers
- Promote essential metadata contrast

Files:

- `components/ui/skip-to-content.tsx`
- `app/page.tsx`
- `app/sessions/page.tsx`
- `components/session/ClaimsLiveRegion.tsx`
- `app/globals.css`

## P2: Later But Important

### UX Flows atlas should not ship as a normal session tab

The atlas is currently very useful for review, but should eventually move behind:

- `NEXT_PUBLIC_ENABLE_UX_FLOWS`
- `/dev/flows`
- admin/dev route
- or the `.project/dashboard.html` ecosystem

Do not remove it while user is actively reviewing it unless asked.

Files:

- `components/session/session-shell.tsx`
- `app/session/page.tsx`
- `components/session/ux-flow-dashboard.tsx`

### Landing page is product-light

Fix:

- first viewport should show actual product/source paths
- make browser-tab “any video” direction clear
- include trust posture up front
- avoid abstract hero-only branding

File:

- `app/page.tsx`

### Session library is useful but not yet lovable

Fix:

- search-first header
- source filters
- “Continue latest”
- quick export
- topic/verdict chips
- browser-tab badge
- clear all saved sessions

File:

- `app/sessions/page.tsx`

### Correction/reporting loop is not wired into detail experience

There is a `ReportFlow`, but detail pages show dispute as coming soon.

Fix:

- expose “Report issue” / “Challenge verdict” on every detail page
- capture transcript/source context
- save local review status
- export correction log

Files:

- `components/verdict/ReportFlow.tsx`
- `components/session/claim-detail.tsx`
- `components/session/marker-detail.tsx`

### Edtech/classroom layer

If the product goes toward education:

- add grade bands
- teacher-only mode or classroom-safe mode
- source-literacy workspace
- marker practice / rewrite neutrally / exit ticket
- classroom packets
- debate roles
- assessment exports

Files to extend:

- `components/session/marker-learn-more.tsx`
- `components/session/claim-learn-more.tsx`
- `components/session/source-card.tsx`
- `lib/reputation.ts`
- `lib/export/report.ts`

## Recommended Implementation Order

Do not try to beautify everything before fixing trust and functionality. Suggested order:

### Sprint A: Core trust/function blockers

1. Fix filtered-list detail hrefs and tests.
2. Add real live ticker and state-aware speaker rail.
3. Separate browser-tab waiting vs listening state.
4. Add app ↔ extension stop/pause/status protocol.
5. Standardize extension/capture error state instead of interim text.
6. Update trust pages so they do not overclaim implementation.
7. Split claim score/confidence/evidence semantics or at least relabel `score` immediately.

### Sprint B: Input and recovery experience

1. Redesign source picker around user jobs.
2. Add analysis-progress states for bulk ingest.
3. Standardize error cards across mic/browser/audio/media/youtube.
4. Treat empty transcript as failure with recovery paths.
5. Add browser-tab capture cockpit in app.
6. Add extension popup/options production UX.

### Sprint C: UI craft + mobile

1. Hide/gate UX Flows outside dev/review.
2. Fix touch targets and mobile bottom controls.
3. Improve landing page with real product preview.
4. Improve session library search/filter/export.
5. Improve contrast of operational metadata.
6. Fix skip links/live regions.

### Sprint D: Evidence, sharing, exports

1. Add AI disclosure/watermark to all exports.
2. Replace raw local “Share” URLs with evidence-card export/copy.
3. Add correction/reporting loop to detail pages.
4. Add end-session completion tray / evidence receipt.

### Sprint E: Edtech option

Only if user wants classroom/student mode:

1. Decide teacher-only vs student-safe product lane.
2. Add grade-banded copy and teacher controls.
3. Add source-literacy tables.
4. Add marker lessons/practice.
5. Add classroom packet export.

## Implementation Notes / Gotchas

### Filtered detail links

Current relevant lines:

- `components/session/filtered-list.tsx` marker href uses `/session/marker/${marker.id}`
- `components/session/filtered-list.tsx` claim href uses `/session/claim/${claim.id}`

Actual route:

- `app/session/detail/[type]/[id]/page.tsx`

Likely fix:

```tsx
href={`/session/detail/marker/${marker.id}${from ? `?from=${from}` : ""}`}
href={`/session/detail/claim/${claim.id}${from ? `?from=${from}` : ""}`}
```

Check existing `item-detail.tsx` parsing for `from=` format before finalizing.

### Browser-tab capture

Docs already describe planned architecture in `docs/browser-tab-capture.md`. Current implementation files:

- `extension/manifest.json`
- `extension/background.js`
- `extension/offscreen.html`
- `extension/offscreen.js`
- `extension/content-script.js`
- `extension/options.html`
- `extension/options.js`
- `components/session/ExtensionBridge.tsx`
- `components/session/ingest-panes/browser-tab-ingest-pane.tsx`

Needed protocol:

- extension → app:
  - `capture-start`
  - `capture-stop`
  - `capture-error`
  - `transcript-interim`
  - `transcript-final`
  - `capture-status`
- app → extension:
  - `bridge-ready`
  - `pause-capture`
  - `resume-capture`
  - `stop-capture`
  - `request-status`

### Trust pages

Before editing copy, verify code behavior:

- models in `app/api/*`
- prompts in `lib/prompts/*`
- Deepgram endpoints in `lib/client/deepgram-stream.ts` and server batch files
- engagement gate actual implementation status
- session persistence behavior in `lib/client/session-storage.ts`

Do not claim safeguards are live unless code proves it.

### UX atlas

The user is actively reviewing:

- `http://localhost:3000/session?view=flows`

Do not delete the atlas. If gating it, preserve a dev/review route and tell the user where it moved.

## Latest Verification Details

Commands passed after latest UI atlas/mobile fixes:

```bash
npx vitest run tests/ux-flow-dashboard.test.tsx
npx tsc --noEmit
npm run lint
```

Browser verification:

- Reloaded `http://localhost:3000/session?view=flows`
- Verified atlas/index/core redesign copy renders
- Ran DOM/CSS overflow audit over all mobile frames
- Result: `problemFrameCount: 0`

## Tone / Collaboration Notes

User is pushing hard because they care about the product and can see weak design immediately. Match that energy with decisive action.

Good behavior:

- Admit issues plainly
- Implement quickly
- Verify visually and with tests
- Keep desktop and mobile honest
- Tie every change to world-class UX, trust, or reliability

Bad behavior:

- Do not defend placeholder UI
- Do not call a tiny fake mobile frame “good”
- Do not ship clipped text/buttons in a wireframe
- Do not let trust copy outrun implementation
- Do not pretend simulated expert review is actual executive review

## Suggested First Prompt For Next Session

```text
Read docs/superpowers/handoff/2026-05-20-worldclass-ux-committee-audit-pickup.md.
Then implement Sprint A in order:
1. fix filtered-list detail links and tests,
2. add truthful live timer/state-aware speaker rail,
3. split browser-tab waiting/listening state,
4. add extension stop/status handshake,
5. update trust copy that overclaims implementation.
Run targeted tests, tsc, lint, and browser verification.
```
