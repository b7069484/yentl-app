This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/optimizing) for more details.

---

## Compliance & Trust

Yentl is designed to be **legally and ethically shippable** under EU, US, UK, Quebec, and Australian regulatory regimes. The compliance layer is documented here.

### Consent flow

All audio recording requires explicit consent before any microphone access begins. A `ConsentGate` component (built in `yentl-this-week-actions` goal) gates session start. A `TwoPartyDisclosure` banner reminds users that recording others may require their consent. A 30-minute re-confirmation toast fires mid-session.

### Trust pages

| Page | Purpose |
|---|---|
| [/about](/about) | Mission, engines used, taxonomy source, funding model, known limitations |
| [/methodology](/methodology) | How claims become verdicts: decision tree, reputation tiers, engagement gate |
| [/changelog](/changelog) | User-facing changelog for methodology/prompt/model changes |
| [/privacy](/privacy) | Privacy policy: GDPR Art. 6(1)(a) + Art. 9(2)(a), named processors, retention, CCPA, Quebec Law 25 |
| [/terms](/terms) | Terms of service: 18+, informational-only, no-warranty, anti-SLAPP California law |
| [/subprocessors](/subprocessors) | Named data processors: Deepgram, Anthropic, Vercel |
| [/accessibility](/accessibility) | Accessibility statement: WCAG 2.2 AA target, known gaps, contact |
| [/taxonomy.json](/taxonomy.json) | Machine-readable taxonomy (123 entries, CC-BY-4.0) |

### Accessibility posture

- **Target**: WCAG 2.2 Level AA (required by European Accessibility Act, enforcement date 28 June 2025)
- Skip-to-content link is first focusable element in all layouts
- Focus ring token (`--ring`) has ≥3:1 contrast (WCAG 2.4.7)
- All interactive targets ≥44×44 CSS px (WCAG 2.5.5)
- `prefers-reduced-motion` respected on all animated elements
- `aria-live="polite"` on transcript container and claims region
- Automated axe-core + Lighthouse audits run in CI

### Browser tab capture

Yentl includes a local Chrome MV3 extension scaffold in [`extension/`](extension/)
for capturing the active tab's audio and streaming it into a live Yentl session.
This is the preferred path for "any video on any page" because it works from the
user's browser session instead of depending on server-side YouTube or site
fetches. See [`docs/browser-tab-capture.md`](docs/browser-tab-capture.md).

### Data protection

- **DPIA**: [`docs/dpia.md`](docs/dpia.md) — EDPB-template DPIA covering the audio→Deepgram→Anthropic pipeline
- **Engagement-gate policy**: [`docs/engagement-gate.md`](docs/engagement-gate.md) — policy spec for ENGAGE/DECLINE/REFUSE decision categories
- **Retention**: No audio or transcripts persisted server-side in v1 (in-memory only)
- **Processors**: Deepgram (DPF + SCCs), Anthropic (DPA + SCCs), Vercel (DPA + SCCs)

### How to report issues

- **Accessibility issues**: Use the [contact page](/contact) or see [/accessibility](/accessibility)
- **Incorrect verdicts**: Use the Report button on any verdict card (stored locally in `yentl.reports`)
- **Security vulnerabilities**: See [`SECURITY.md`](SECURITY.md) if present, or use the contact page
- **General feedback**: [GitHub Issues](https://github.com/project-witness/yentl-app/issues)

---

## Security

### Edge-level posture

Every response from Yentl carries the following security headers (applied in [`proxy.ts`](proxy.ts)):

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | 2-year HSTS — HSTS preload list eligibility |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Defense in depth alongside CSP frame-ancestors |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage to cross-origin requests |
| `Permissions-Policy` | `camera=(), geolocation=(), microphone=(self)` | Mic same-origin only (Yentl needs it); camera + geo denied |
| `X-DNS-Prefetch-Control` | `on` | Speed without exposing additional data |

### Authentication + authorization

- **Clerk** handles all user authentication. Public-facing routes (verdict, methodology, corrections) require no auth. Protected routes (`/session*`, `/sessions*`, `/api/sessions*`, `/account*`, `/project*`) call `auth.protect()` in [`proxy.ts`](proxy.ts).
- **Cost-bearing AI routes** (`/api/extract-claims`, `/api/verify-*`, `/api/analyze-rhetoric`, `/api/synthesize`, `/api/devil-advocate`, `/api/transcribe-batch`, `/api/upload-audio`, `/api/youtube-ingest`, `/api/media-ingest`, `/api/source-preview`, `/api/deepgram/token`) are auth-gated in production when `YENTL_REQUIRE_AUTH=1` is set.
- **Internal API routes** (`/api/corpus-sample`, `/api/project-flow-comments`) are production-only locked.

### Rate limiting

Per-route rate limits live in [`lib/server/rate-limit.ts`](lib/server/rate-limit.ts) and are applied inside each API route handler:

| Bucket | Limit | Window |
|---|---|---|
| `deepgram-token` | 30 | 60s |
| `upload-token` | 40 | 60s |
| `transcription` | 240 | 60s |
| `source-ingest` | 120 | 60s |
| `model` | 240 | 60s |
| `source-preview` | 240 | 60s |

Production must set `YENTL_RATE_LIMIT_BACKEND=redis` with either Upstash Redis REST or Vercel KV REST credentials. Without those env vars, the rate limiter falls back to per-process in-memory state, which is single-instance only and resets on every cold start.

### Biometric privacy (BIPA / CUBI / Washington)

Speaker diarization uses temporary voiceprints, which fall under the Illinois Biometric Information Privacy Act and similar Texas/Washington laws.

Yentl uses a **dual gate** to ensure diarization only fires with explicit user consent:

1. **Env-level kill switch** — `YENTL_ENABLE_BIPA_DIARIZE=1` must be set on the deployment (default: unset → diarize stays off)
2. **Per-upload consent** — the audio upload pane includes a checkbox: *"I have explicit consent from every person audible in this recording for biometric voiceprint analysis."* The checkbox state is forwarded as `bipa_consented=true` to `/api/transcribe-batch`.

Both must be true for `diarize: true` to fire on the batch path. URL/YouTube ingest **never** sets consent (the user can't legitimately consent on behalf of third-party speakers in public video). Live streaming **always** stays `diarize: false` regardless — Soniox + Deepgram both warn real-time diarization quality is weaker and BIPA exposure is higher.

See [/methodology#voiceprint-consent](/methodology#voiceprint-consent) for the user-facing explanation.

### Data flow

| Surface | Where it goes | Persisted? |
|---|---|---|
| Audio (live mic) | Browser → Deepgram WebSocket (region-selectable) | No — streamed only |
| Audio (file upload) | Browser → Vercel Blob (private) → Deepgram batch → Vercel function | Deleted after transcription |
| Transcript | Zustand client store → (optional) Neon `sessions.data` jsonb blob | Yes, when session is ended by an authed user |
| Voiceprints | Deepgram internal (diarize:true only with dual consent) | No — Deepgram policy is no retention beyond request |
| Claims/verdicts | Anthropic via Vercel AI Gateway | No — request-scoped only |
| Dispute submissions | Neon `disputes` table | Yes — for editorial review |

### How to report a vulnerability

Email the privacy contact listed in [/contact](/contact). Include:

- Affected URL or component
- Reproduction steps
- Impact assessment from your perspective

We respond within 72 hours and aim to ship fixes within 30 days for high-severity, 90 days for medium. Critical issues are addressed immediately with an out-of-band release if needed.
