# M1 Session UX Local Proof — 2026-06-10

## Command

```bash
npm run session:proof:local
```

## Result

Pass. CDP walkthrough of 19 launch-critical session routes at desktop (1280px) and mobile (390px) widths.

## Artifact

- `docs/superpowers/validation/session-ux-local-proof.json`

## Routes covered

- Source picker (`/session`)
- Validation overview, watch, claims (`status=checking`), markers, and transcript (`cable_008`)
- Populated claim/marker detail and marker learn pages
- Saved sessions library
- TV room mode
- Share-target text prefill (mobile)
- Export report preview dialog
- End session confirmation dialog (Save first / Keep going)
- Source switch dialog (Choose new source / Keep current source)
- Learn-claim populated page
- Mobile overview, claims, and transcript tabs

## Notes

- Overview uses `YENTL OPINION` copy, not TV-only `Yentl's Read` heading.
- Requires local dev server at `http://localhost:3000` (not `127.0.0.1` — Next.js dev blocks cross-origin HMR from 127.0.0.1).
- Proof waits for validation demo hydration and ignores dev-only webpack-hmr console noise.