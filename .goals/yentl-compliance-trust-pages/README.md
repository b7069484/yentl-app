# Goal: `yentl-compliance-trust-pages` — operator manual

Split off from `yentl-compliance-foundation` Group D on 2026-05-18. **Largest sub-goal** — 7 trust pages, content-heavy.

## Scope

Ship the 6 trust-page routes + 1 JSON data route required for App Store submission, GDPR transparency, and public-launch credibility:
- `/about` · `/methodology` · `/changelog` · `/privacy` · `/terms` · `/subprocessors` · `/taxonomy.json`

These are **public legal surface**. Content must be substantive and accurate, not boilerplate. The research has source-of-truth content in §7 (regulatory) and §8 (brand voice).

## Cadence

- Worker: `23 * * * *` UTC (hourly at :23)
- Watchdog: `38 14 * * *` UTC (10:38 AM EDT daily)

## Budget

- Max cost: $50, max runs: 20, max days: 7, per-run cap: $5

## CRITICAL — content quality bar

These pages will be linked from the App Store listing, the consent modal, the privacy policy itself. The bar:

- **Every factual claim about Yentl's data handling matches the actual implementation** (no aspirational text). If the code doesn't yet enforce a thing, the page doesn't claim it.
- **Every legal reference (GDPR Art, CCPA section, etc.) is correctly cited**
- **No copy-paste from generic policy generators** — privacy / terms in particular
- **Brand voice from research §8** applies where natural (Yentl: smart, witty, friendly, snarky-when-earned)
- **18+ everywhere age is mentioned**
- **Named processors: Deepgram + Anthropic + Vercel** — always by name

If worker cannot write a section with confidence, embeds `<!-- TODO: legal review needed -->` and flags in alerts.md.

## Quick reference

| Action | How |
|---|---|
| Check progress | `cat STATE.md` on `goals/yentl-compliance-trust-pages` |
| **Eyeball draft pages** (recommended around 50% progress) | `npm run dev` locally; browse `/about`, `/privacy`, etc. |
| Kill | `echo STOP > alerts.md` + push |

## Recommended post-completion action

**Plan a media/internet lawyer review of `/privacy` and `/terms`** (~$3-5k one-time per research §7). The worker's draft is a starting point. Don't ship to public launch without it.
