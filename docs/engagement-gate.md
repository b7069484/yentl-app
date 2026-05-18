# Engagement-Gate Policy Specification

**Author**: Israel B. Bitton  
**Date**: 2026-05-17  
**Version**: 1.0  
**Status**: Policy document only. Runtime implementation is in the fact-check pipeline goal (a Haiku-based pre-engagement classifier).

---

## Purpose

Yentl does not fact-check every claim it encounters. Some claims are not appropriate for
automated fact-checking — either because they are unanswerable (opinions), trivial (jokes),
or because engaging with them would create harm (harassment, defamation, extremism).

This document specifies the engagement-gate policy: the rules that determine whether Yentl
should engage with a claim, engage cautiously, decline, or refuse silently.

**Why this exists**: Top Risk #1 in the Yentl risk assessment is defamation exposure from
AI verdicts about identifiable individuals. The engagement gate is the primary upstream
mitigation.

---

## Decision Categories

| Category | Description | User-visible behavior |
|---|---|---|
| `ENGAGE` | Verifiable factual claim; appropriate for full fact-check. | Full verdict displayed. |
| `DECLINE_FRIVOLOUS` | Claim is an opinion, joke, rhetorical question, or has no verifiable proposition. | Soft decline shown: "This looks more like an opinion than a fact — Yentl doesn't weigh in on those." |
| `REFUSE_INAPPROPRIATE` | Claim is a harassment vector, doxxing, hate speech, CSAM, extremism, or defamation-trap. | Silent drop. No verdict, no error message. |

---

## Claim Quality Buckets

The engagement-gate classifier assigns each claim to one of the following quality buckets:

| Bucket | Description | Gate decision |
|---|---|---|
| `verifiable` | Claim makes a specific, testable factual assertion that can in principle be checked against evidence. | `ENGAGE` or `ENGAGE_CAUTIOUSLY` |
| `opinion` | Claim expresses a preference, value judgment, or normative assertion. No fact-check is possible. | `DECLINE_FRIVOLOUS` |
| `rhetorical` | Claim is a rhetorical device (loaded question, false urgency, etc.) not intended as a sincere factual assertion. | `DECLINE_FRIVOLOUS` |
| `joke` | Claim is clearly humorous/satirical. | `DECLINE_FRIVOLOUS` |
| `none` | No identifiable claim in the text segment. | `DECLINE_FRIVOLOUS` |

---

## Appropriateness Buckets

For claims that pass the quality gate, the classifier also evaluates appropriateness:

| Bucket | Description | Gate decision |
|---|---|---|
| `ok` | Claim concerns a public figure in their public role, a public institution, a scientific/historical fact, or a public policy matter. | `ENGAGE` |
| `edgy_but_engage` | Claim is controversial or uncomfortable but still factual and appropriate for engagement with appropriate framing. | `ENGAGE_CAUTIOUSLY` |
| `harassment_vector` | Claim targets a private individual in a way that could facilitate harassment or harm (e.g., "Is it true that [private person] did X?"). | `REFUSE_INAPPROPRIATE` |
| `doxxing` | Claim seeks to reveal or verify private information about an individual (address, phone, workplace, etc.). | `REFUSE_INAPPROPRIATE` |
| `csam` | Claim involves child sexual abuse material or sexualization of minors. | `REFUSE_INAPPROPRIATE` |
| `extremism` | Claim promotes, justifies, or glorifies terrorism, genocide, or mass violence. | `REFUSE_INAPPROPRIATE` |

---

## Hard Refusals (Silent)

Yentl refuses the following claim types silently — no verdict, no decline message, no error:

1. **Private individual harassment vectors** — Any claim that names or clearly identifies a non-public individual in a context that could facilitate harassment, stalking, or reputational harm.
2. **Hate speech targeting protected characteristics** — Claims asserting the inferiority, criminality, or subhumanity of groups based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin.
3. **Extremist / threatening content** — Claims that justify, glorify, or recruit for terrorism, genocide, or mass violence.
4. **Doxxing** — Requests to verify or find private information about identifiable individuals.
5. **CSAM** — Any content involving the sexual exploitation of minors.
6. **Defamation-trap setups** — Claims phrased to elicit a FALSE verdict against a named individual on a matter that, if adjudicated incorrectly, would constitute defamation per se (e.g., false crime accusations against a private person).

---

## Engage Cautiously — Protocol

For claims in the `ENGAGE_CAUTIOUSLY` category, Yentl applies additional constraints:

- Requires a minimum of two high-reputation sources.
- Explicitly includes named expert dissent where it exists (not presenting one-sided consensus).
- Replaces TRUE/FALSE with MIXED where expert consensus is genuinely contested.
- Adds a confidence level indicator (High / Medium / Low) to the verdict.
- Adds a disclaimer: "This is a contested area where reasonable experts disagree. Yentl's verdict reflects the current majority-expert position."

---

## Full Engagement Policy Table

This table represents the public-facing policy documentation (to be linked from /methodology):

| Claim type | Yentl does... |
|---|---|
| Verifiable fact about a public figure's public statements | Engages fully |
| Verifiable fact about a public institution or government | Engages fully |
| Scientific consensus (climate, vaccines, evolution) | Engages fully |
| Historical fact | Engages fully |
| Statistical claim from government/academic data | Engages fully |
| Contested empirical matter (legitimate expert disagreement) | Engages cautiously |
| Edgy but factual claim | Engages cautiously |
| Opinion / normative claim | Declines with explanation |
| Rhetorical device / joke | Declines with explanation |
| Claim with no verifiable proposition | Declines with explanation |
| Private individual harassment vector | Refuses silently |
| Hate speech targeting protected group | Refuses silently |
| Doxxing request | Refuses silently |
| Extremist / terrorist content | Refuses silently |
| CSAM | Refuses silently |
| Defamation-trap setup | Refuses silently |

---

## Implementation Hand-Off Note

This document specifies the policy. The runtime implementation — a Haiku-class pre-engagement classifier that accepts a claim string and returns an `EngagementDecision` (`ENGAGE | ENGAGE_CAUTIOUSLY | DECLINE_FRIVOLOUS | REFUSE_INAPPROPRIATE`) — is the responsibility of the **fact-check pipeline goal** (separate from this compliance goal).

The classifier should be implemented as a fast (low-latency) Anthropic Claude Haiku call with:
- A system prompt encoding the quality and appropriateness buckets above.
- Structured JSON output: `{ decision: EngagementDecision, quality_bucket: string, appropriateness_bucket: string, confidence: number }`.
- Hard-coded fallback to `REFUSE_INAPPROPRIATE` on parse error.

---

## Related Documents

- `/methodology` — User-facing summary of the engagement gate.
- `docs/dpia.md` — DPIA mitigation: engagement gate as Top Risk #1 mitigation.
- `/terms` — User obligation: no circumvention of the engagement gate.
