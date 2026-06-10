# YENTL-MOBILE-BUILD-0002 Preflight

Timestamp: 2026-06-08T18:17:09-04:00

## Scope

Preflighted the queued immediate-wave mobile UI row before the scheduled 8:25 PM worker.

No product UI files or tests were changed in this preflight.

## Findings

- `YENTL-MOBILE-BUILD-0002` is still the only `ready_for_build` row assigned to `mobile-ui-build`.
- `components/session/source-picker.tsx` already has platform-specific source experiences for:
  - `desktop-chrome`
  - `desktop-other`
  - `mobile-ios`
  - `mobile-android`
  - `mobile-web`
- Mobile source cards already exclude `browser_tab` capture and keep the mobile notice that another tab's audio is unavailable on mobile browsers.
- `tests/source-picker.test.tsx` already checks mobile iOS/Android rendering, mobile absence of current-tab capture, and click behavior.
- The missing mobile-specific guard is ergonomic: source choice cards should have a stable mobile tap-target/layout contract so the app does not regress into cramped, shifting source cards on iOS/Android/mobile-web.

## Scheduled Worker Target

The scheduled mobile worker should make one narrow source-picker improvement:

- Add an explicit mobile-safe touch/layout affordance for source choice cards, such as a stable minimum tap height and wrapping behavior for title/status/description text.
- Keep unsupported current-tab capture absent on iOS, Android, and mobile-web.
- Preserve the existing mobile platform notice.
- Do not claim native iOS/Android implementation.
- Do not change extension capture policy, consent semantics, or source routing.

## Verification Target

Update `tests/source-picker.test.tsx` to assert the mobile ergonomic contract, for example:

- mobile source buttons have the new stable tap-target class or data attribute
- mobile iOS/Android/mobile-web still do not expose `browser_tab`
- mobile notice still renders
- desktop Chrome still exposes `Current tab`

Then run `npx vitest run tests/source-picker.test.tsx`, `npx tsc --noEmit`, and `npm run build` if product files change.
