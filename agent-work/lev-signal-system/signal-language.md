# Lev Live Signal Language

## Dependency Note

Talia's folder records the locked verdict language Lev should use: `Checking`, `Supported`, `Mixed`, `False`, `No reliable backing`, and `Opinion`.

Shira's source-intake repair is not recorded as complete in `agent-work/shira-source-intake/`, so Lev stayed out of source intake panes and limited edits to Watch, extension panel, signal component, and targeted tests.

## Watch Signal Board

The Watch board has four always-visible reads:

- **Current read:** the strongest factual read currently visible. `False` and misleading/context-risk claims are red, `No reliable backing`, `Mixed`, and `Checking` are amber, `Supported` is green, and `Opinion` stays neutral.
- **Rhetoric heat:** the intensity of rhetoric markers. Blatant markers or three clear markers are red, one or two clear markers are amber, subtle markers and no-marker calm states are green.
- **Evidence state:** whether Yentl has enough source support. Waiting, checking, missing sources, and `No reliable backing` are amber; cited claims are green.
- **Live state:** the media/transcript connection. Loading and ready-without-transcript are amber; synced transcript playback is green.

## Extension Mini Strip

The extension panel keeps the detailed transcript/claims/markers tabs, but adds an always-on 2x2 mini strip above the tabs:

- **Claim risk:** high/caution/low/waiting summary.
- **Rhetoric heat:** same heat model as Watch.
- **Evidence state:** same evidence model as Watch.
- **Pulse:** latest claim or marker finding, with `motion-safe:animate-pulse` so reduced-motion users keep a static state.

## Color Guardrails

- Red is reserved for false/misleading/failure/severe rhetoric.
- Amber is used for waiting, checking, incomplete, caution, and source-support gaps.
- Green is used for supported, cited, healthy, calm, and connected states.
- Neutral is limited to quiet/no-new-finding and opinion states.

## Verification

- `npm run test:run -- tests/watch-view.test.tsx tests/extension-panel-view.test.tsx`
- `npm run lint -- components/session/live-signal.tsx components/session/watch-view.tsx components/session/extension-panel-view.tsx tests/watch-view.test.tsx tests/extension-panel-view.test.tsx`

Screenshots:

- `agent-work/lev-signal-system/screenshots/watch-desktop-signal-board.png`
- `agent-work/lev-signal-system/screenshots/extension-side-panel-signal-strip.png`
- `agent-work/lev-signal-system/screenshots/watch-mobile-signal-board.png`
