# Data Processing Agreement (DPA) status

**Owner:** Israel B. Bitton (b7069484@gmail.com)
**Last updated:** 2026-05-20
**Source of truth for:** `yentl-this-week-actions` clause 3 (expanded
structure) — supersedes the 2026-05-18 summary version that lived here
from `yentl-compliance-foundation` Run 1.

This document tracks the status of Data Processing Agreements (DPAs)
between Yentl (controller) and each sub-processor that handles personal
data on our behalf. DPAs are required under GDPR Article 28 and are the
legal framework under which a processor commits to processing data only on
the controller's instructions, applying appropriate technical and
organizational measures, and notifying us of any breach.

The worker that generated this file CANNOT and DOES NOT sign anything — it
prepares the document. Human signature is tracked in the **Human-action
checklist** at the bottom.

---

## Sub-processor status table

| Sub-processor | Status | Portal URL | Contact | Notes |
|---|---|---|---|---|
| **Deepgram** | In Progress (Enterprise ToS DPA in force; SCCs annexed) | https://deepgram.com/legal/dpa | privacy@deepgram.com | Streaming + batch transcription. US-based by default; EU endpoint switchable via `NEXT_PUBLIC_DEEPGRAM_REGION=eu`. Confirm signed-date and that voiceprint provisions match our v1 default (diarize OFF) per `yentl-this-week-actions` clause 1. |
| **Anthropic** | In Progress (auto-incorporated, 2026-01-01) | https://www.anthropic.com/legal/dpa | privacy@anthropic.com | Claim extraction + verdict + bias/fallacy analysis. Per Anthropic Commercial ToS effective 2026-01-01, DPA + SCCs auto-incorporate for paid accounts — no separate signature required unless on Anthropic Enterprise. Confirm our tier triggers auto-incorp. |
| **Vercel** | In Progress (signed via dashboard) | https://vercel.com/legal/dpa | privacy@vercel.com | Hosting + Edge functions + AI Gateway. DPA accepted via Vercel dashboard under Account → Legal → Data Processing Agreement. Take a screenshot or note the agreed-date for audit. |

**Status values:** `Not Started` | `In Progress` | `Signed` | `Date Signed`

---

## What to verify in each DPA

For each sub-processor, confirm the signed DPA covers all of the following.
If any line is missing, escalate to legal before continuing to use that
processor for EU or California-resident traffic.

- [ ] **Standard Contractual Clauses (SCCs) included** — EU Commission's
      2021/914 Module 2 (controller-to-processor) clauses, either attached
      as an annex OR explicitly incorporated by reference. Without SCCs
      we have no lawful basis for transferring EU personal data to a US
      processor outside the EU-US Data Privacy Framework.
- [ ] **Sub-processor list disclosed** — the processor must publish (or
      provide on request) a current list of any further sub-processors
      they route data to (AWS, GCP, Azure regions). New sub-processors
      must come with a notification period.
- [ ] **Deletion-on-request mechanism** — the DPA must commit the processor
      to deleting all personal data on our written request within a
      defined window (industry standard: 30 days). Without this we cannot
      fulfill GDPR Article 17 right-to-erasure requests downstream.
- [ ] **Encryption-in-transit confirmed** — TLS 1.2+ for all data in
      motion. Look for "encryption in transit" language explicitly.
- [ ] **Breach-notification SLA stated** — processor commits to a maximum
      window (industry standard: 24-72 hours) for notifying us of any
      personal-data breach. We then have 72 hours under GDPR Article 33
      to notify the supervisory authority.
- [ ] **EU-US Data Privacy Framework certification** (where applicable) —
      for US processors, check the [DPF participant list](https://www.dataprivacyframework.gov/list)
      for active certification. If not certified, SCCs become the sole
      transfer mechanism and must be airtight.

---

## Anthropic-specific note

Per Anthropic's published commercial Terms of Service (effective
**January 1, 2026**), the DPA and Standard Contractual Clauses are
**auto-incorporated** for all paid Anthropic API accounts. This means:

- No separate signature is required for paid accounts under the standard ToS.
- The DPA Annex and Module 2 SCCs apply by reference.
- For accounts on **Anthropic Enterprise** (custom contract), the DPA may
  need to be re-negotiated as part of the master agreement — verify with
  Anthropic Enterprise contact if applicable.

Action: confirm with Anthropic that our account is on standard commercial
ToS (not legacy beta or research-preview terms), which would not have the
auto-incorporated DPA.

---

## Vercel-specific note

Vercel's DPA is signed via the Vercel dashboard, not by paper or email:

1. Log in to Vercel at https://vercel.com
2. Navigate to your team's settings: **Account → Legal**
3. Click into **Data Processing Agreement** (DPA)
4. Read the current version, then click **I agree** at the bottom

The agreed-version date is then shown in the dashboard. Take a screenshot
or note the date for audit purposes.

---

## Transfer Impact Assessment (TIA) status

A formal TIA documents the residual risk of transferring EU personal data
to a third-country processor (US, in our case), specifically whether
local laws materially impair the SCC commitments. Required for EU
commercial launch.

| Processor | TIA status | Notes |
|---|---|---|
| Deepgram | Pending | DPF certification provides baseline; formal TIA not yet documented |
| Anthropic | Pending | Commercial DPA provides contractual coverage; formal TIA not yet documented |
| Vercel | Pending | Vercel DPA provides contractual coverage; formal TIA not yet documented |

---

## Human-action checklist

- [ ] Deepgram DPA signed (paper or e-sign via their portal)
- [ ] Anthropic DPA confirmed (auto-incorp verified for our account tier)
- [ ] Vercel DPA confirmed (signed in dashboard)
- [ ] Deepgram EU endpoint enabled for EU-region traffic in production env vars
      (set `NEXT_PUBLIC_DEEPGRAM_REGION=eu` for the EU-targeted Vercel
      environment — see `.env.example` and `lib/client/deepgram-endpoint.ts`)
- [ ] Disable speaker tagging on the Deepgram dashboard as backup defense
      (in addition to code default of `diarize: false` per
      `yentl-this-week-actions` clause 1)
- [ ] Document the signed-date for each DPA in the table above
- [ ] Complete formal TIA for all three processors before EU commercial launch
