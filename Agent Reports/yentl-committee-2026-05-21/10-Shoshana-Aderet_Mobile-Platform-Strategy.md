# Yentl Committee Report - Mobile, Platform Limits, and Distribution Strategy

    **Committee member:** Shoshana Aderet  
    **Remit:** Mobile web, iOS/Android constraints, responsive product strategy, platform distribution, extension/mobile handoff.  
    **Why this name:** Shoshana is a Jewish name meaning rose; Aderet means mantle or cloak. This seat covers the different surfaces Yentl must wear without pretending they are the same.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `components/session/source-picker.tsx`, `components/session/session-shell.tsx`, `components/session/watch-view.tsx`, `components/session/extension-panel-view.tsx`, `docs/browser-tab-capture.md`, `components/session/az-flow-dashboard.tsx`, `docs/superpowers/specs/2026-05-21-yentl-complete-flow-spec.md`.
- Prior UI, UX, flow, and audio reports.

## Core Platform Truth

Desktop Chrome extension is not mobile. iOS apps generally cannot capture arbitrary other-app audio; mobile web cannot use a Chrome extension path. The product must stop treating `analyze any video` as universal. It is desktop Chrome-first unless the user is sharing/importing, using mic, or providing a direct file/URL.

## Strengths

The codebase already acknowledges this in `docs/browser-tab-capture.md`: mobile architecture should use microphone capture, file/share-sheet import, URL ingestion where permitted, and platform-specific capture only where OS APIs/policy allow. The flow atlas also names non-Chrome and mobile unavailable states.

Yentl's core data contracts can be shared across platforms: `TranscriptSegment`, `SessionSource`, claim/marker/synthesis APIs, saved-session exports, and report formats.

## Severe Gaps

Mobile UX is currently a compressed desktop product. The active session shell and source picker do not yet feel like a mobile task launcher. Session controls compete with tabs and status; long text truncates; important activity content can disappear behind ellipses.

The source picker does not platform-gate enough. On mobile, browser-tab capture should not be presented as a normal first-class path without a clear alternative.

There is no mobile share/import plan in the live product. A real mobile strategy needs share-sheet targets, file picker, URL paste, text share, microphone flow, and report export/share.

The extension install path is desktop Chrome-specific but not yet packaged as such. Non-Chrome desktop browsers need a fallback path.

## Recommendations

Create platform-specific source ordering:

- Desktop Chrome: Browser tab first, YouTube/caption import second, upload/text/mic next.
- Desktop non-Chrome: YouTube/upload/text/media URL first; explain Chrome extension as optional.
- Mobile web: paste/share URL, upload file, paste text, microphone; no browser-tab capture promise.
- Future iOS/Android: share-sheet import, mic, downloaded media/file import, direct URL, saved reports.

Redesign mobile shell around thumb-safe tasks: one status strip, one current insight, bottom navigation or sticky segmented controls, 44px targets, large transcript mode, and share/export sheet.

Add platform-detection copy that is honest without sounding apologetic: `Tab capture works in the Chrome extension on desktop. On this device, send Yentl a link, file, transcript, or microphone audio.`

Add mobile-specific tests and screenshots for source selection, source unavailable states, transcript reading, claim detail, export/share, library restore, and sign-in.

## Launch Blockers

Do not advertise `any video on any page` without `desktop Chrome extension` qualification. Do not launch mobile until unavailable states and alternatives are explicit. Do not claim app-store readiness until platform capture policies are reviewed.

## Platform Roadmap

Phase 1: desktop web + Chrome extension private beta.  
Phase 2: mobile web optimized for paste/upload/mic/share.  
Phase 3: native share targets and offline report viewer.  
Phase 4: platform-specific capture integrations only if policy and OS APIs allow them.
