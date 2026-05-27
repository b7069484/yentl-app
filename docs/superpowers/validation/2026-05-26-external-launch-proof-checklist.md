# External Launch Proof Checklist

Date: 2026-05-26

This checklist covers launch proof that cannot be honestly completed from the local repo alone. Do not mark any item complete until the named evidence exists in this repository or in the deployment record.

## 1. Real Chrome Extension Prompt Proof

Status: blocked on a manually loaded extension in the user's real Chrome profile.

Evidence to capture:

- `docs/superpowers/validation/screenshots/chrome-extension-permission-prompt.png`
- `docs/superpowers/validation/screenshots/chrome-extension-local-fixture-allowed.png`
- `docs/superpowers/validation/screenshots/chrome-extension-real-youtube-page.png`
- `docs/superpowers/validation/screenshots/chrome-extension-real-article-page.png`
- `docs/superpowers/validation/screenshots/chrome-extension-permission-denied-recovery.png`

Manual proof steps:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Load unpacked extension from `/Users/israelbitton/Live FactCheck/extension`.
4. Open `http://127.0.0.1:3000/validation/browser-capture.html`.
5. Click the Yentl extension action and capture the exact Chrome permission prompt.
6. Allow capture, confirm same-page panel injection, visible selected-tab identity, and transcript/capture status.
7. Repeat on one real YouTube page and one real text article page.
8. Deny permission once and capture the user-facing recovery state.

Pass criteria:

- The browser permission prompt names the selected tab/source.
- The extension UI does not claim audio/text capture before permission or page proof exists.
- Denied permission routes to upload, media URL, paste text, or microphone without a dead end.

## 2. Deployed Redis / Blob Smoke

Status: blocked on deployed environment variables and a deployment URL.

Command:

```bash
YENTL_SMOKE_BASE_URL=https://YOUR_DEPLOYMENT \
YENTL_SMOKE_AUTH_HEADER='Bearer ...' \
YENTL_SMOKE_RATE_LIMIT=1 \
YENTL_SMOKE_BLOB_TOKEN=1 \
npm run smoke:launch
```

Pass criteria:

- Public entry pages return `200`.
- Internal validation/project routes are not publicly exposed.
- Shared rate limit returns `429` within the smoke loop.
- Blob token generation returns a client token for `/api/upload-audio`.

Evidence to save:

- Smoke command output with deployment URL and timestamp.
- Deployment env confirmation for `UPSTASH_REDIS_REST_URL` or `KV_REST_API_URL`.
- Deployment env confirmation for `BLOB_READ_WRITE_TOKEN`.

## 3. Configured Clerk Captures

Status: blocked on a deployment with Clerk keys configured.

Required env:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Evidence to capture:

- Configured sign-in default state.
- Invalid credentials.
- Password reset.
- Email verification.
- Expired session.
- Post-auth redirect back to intended source/session.
- Mobile auth recovery at 390px.

Pass criteria:

- Guest continuation and privacy/local-save copy remain visible.
- Sign-in/sign-up do not imply live sync unless account-backed behavior is active.
- Post-auth redirect preserves the user's intended source, restore, save, or export task.

## 4. Legal / Compliance Signoff

Status: not signed off by this local build pass.

Repo documents to review:

- `docs/dpia.md`
- `docs/dpa-status.md`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `app/subprocessors/page.tsx`

Open signoff gates from current docs:

- Transfer Impact Assessments are still marked pending for processors.
- Anthropic API retention and opt-out terms need commercial confirmation before EU commercial launch.
- Quebec Law 25 PIA/privacy impact requirements are still flagged for legal review in `app/privacy/page.tsx`.
- If residual transfer risk remains high, prior supervisory-authority consultation may be required before EU launch.

Pass criteria:

- A named legal/privacy owner signs and dates DPIA/DPA/TIA status.
- Public privacy, terms, subprocessors, pricing, and FAQ pages match the signed launch posture.
- Any jurisdiction-specific launch limitations are reflected in product copy before deployment.

## 5. Document / PDF / OCR / Article Import

Status: local UI still needs deeper build-out before it can be called complete.

Required proof states:

- Article URL entry.
- Reader extraction success.
- Blocked fetch with paste fallback.
- PDF selected.
- OCR progress.
- Scanned PDF warning.
- OCR failed.
- Document outline.
- Highlighted claim anchors.
- Source/citation extraction.
- Mobile document import at 390px.

Pass criteria:

- The app distinguishes pasted text, article URL, PDF, scanned PDF, and unsupported documents.
- OCR progress is page-level and recoverable.
- Citation/source extraction never invents thumbnails or source text.
