# M7 Accessibility Local Proof

Timestamp: 2026-06-10

## Command

```bash
npm run a11y:proof:local
```

## Result

Launch-critical routes passed with zero axe violations:

- `/`
- `/session`
- `/mobile`
- `/contact`

Artifact: `docs/superpowers/validation/a11y-local-proof.json`

## Product fixes applied

- `app/page.tsx`: improved contrast on hero/demo labels (`text-ink-3`, amber badge).
- `components/public-info-page.tsx`: replaced nested `aside` with top-level `nav`; improved trust-nav contrast.
- `app/contact/page.tsx`: replaced `text-muted-foreground` with `text-ink-3`.
- `app/pricing/page.tsx`: improved secondary copy and icon badge contrast.
- `app/session/page.tsx`: added `sr-only` page heading for stable `page-has-heading-one` coverage.
- `app/faq/page.tsx`: contact link + privacy mailto (pending production redeploy).

## Remaining

- Production deploy still needs redeploy for a11y/copy fixes on `https://yentl.it`.
- `/pricing` still reports non-blocking contrast warnings locally (non-critical route).