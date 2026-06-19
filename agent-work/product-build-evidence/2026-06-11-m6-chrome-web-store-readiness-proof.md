# 2026-06-11 M6 Chrome Web Store Readiness Proof

## Scope

Closed the missing launch-asset gap in the Chrome extension path. The extension
already had local installed proof and same-page panel proof, but it did not
ship declared icon assets or a deterministic listing-collateral check.

## Product Change

- Added extension PNG icons at `16`, `32`, `48`, and `128` pixels under
  `extension/icons/`.
- Declared extension icons and action icons in both production and local
  manifests.
- Added `docs/superpowers/chrome-web-store-listing.json` with listing summary,
  category/language, home/privacy/support URLs, screenshot asset, small promo
  tile, permission rationales, and data-use disclosures.
- Added store-sized launch collateral:
  - `docs/superpowers/validation/screenshots/chrome-store-extension-panel-1280x800.png`
  - `docs/superpowers/validation/screenshots/chrome-store-small-promo-440x280.png`
- Hardened `npm run extension:check` to fail on missing/mis-sized icons,
  missing listing metadata, incomplete permission rationales, production
  localhost leakage, missing store screenshots, or a missing/mis-sized promo
  tile.
- Updated extension README with the Chrome Web Store readiness gate.

## Proof

`npm run extension:check` passed and rewrote:

- `docs/superpowers/validation/extension-store-readiness.json`

The generated readiness flags are:

```json
{
  "mv3": true,
  "production_host_permission": true,
  "local_origins_optional_only": true,
  "icons_declared": true,
  "listing_metadata_present": true,
  "screenshot_assets_present": true,
  "permission_rationales_complete": true,
  "popup_controls_documented": true,
  "readme_install_docs": true
}
```

Focused regression:

```bash
npx vitest run tests/extension-package-check.test.ts tests/installed-extension-proof-script.test.ts
```

Result:

- 2 test files passed
- 10 tests passed

## Remaining M6 Work

- Repeated extension latency sampling remains open.
- True live full-workspace sync from an active extension tab remains future
  work.
- Real article/video/YouTube extension variants still need broader same-page
  capture proof before launch.
