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
