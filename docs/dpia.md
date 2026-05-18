# Data Protection Impact Assessment (DPIA)

**Author**: Israel B. Bitton  
**Date**: 2026-05-17  
**Version**: 1.0  
**Template basis**: EDPB Guidelines on Data Protection Impact Assessments (WP248 rev.01) and the EDPB April 2026 updated template structure.  
**Scope**: Yentl v1 web application — audio → Deepgram transcription → Anthropic Claude fact-check pipeline.

---

## 1. Scope of Processing

This DPIA covers the data processing activities of the Yentl v1 web application, specifically:

- **Input**: Live microphone audio captured in the user's browser.
- **Processing step 1 (Deepgram)**: Real-time speech-to-text transcription. Audio is streamed from the browser directly to Deepgram's API (or Deepgram EU endpoint for EU/EEA users). No audio is stored on Yentl's servers.
- **Processing step 2 (Anthropic Claude)**: Transcript text is sent to Anthropic's API for (a) claim extraction, (b) engagement-gate classification, (c) fact-checking with web-search citation, and (d) cognitive bias / logical fallacy / rhetoric marker identification.
- **Output**: AI-generated verdict cards displayed in-browser. Not persisted server-side.
- **All processing is ephemeral** (in-memory only). Yentl v1 has no server-side database, no user accounts, and no session log storage.

This DPIA does not cover future versions that may add persistence, user accounts, or mobile applications.

---

## 2. Processing Purposes

| Purpose | Description |
|---|---|
| Transcription | Convert live speech to text so that factual claims can be identified. |
| Claim extraction | Identify discrete verifiable factual claims in the transcript for analysis. |
| Engagement-gate classification | Determine whether a claim is appropriate for fact-checking (ENGAGE / ENGAGE_CAUTIOUSLY / DECLINE / REFUSE_SILENT). |
| Fact-check + source citation | Evaluate each claim against web-search results; assign a verdict (TRUE / FALSE / MIXED / UNVERIFIED) with source citations. |
| Bias / fallacy / rhetoric analysis | Identify cognitive biases, logical fallacies, and rhetorical patterns in the transcript, per the Yentl taxonomy (123 entries). |

---

## 3. Lawful Basis

| Processing | Lawful Basis | Article |
|---|---|---|
| Audio capture and streaming to Deepgram | Explicit consent | GDPR Art. 6(1)(a) |
| Transcript text sent to Anthropic | Explicit consent | GDPR Art. 6(1)(a) |
| Special-category data in audio (health, political/religious views, ethnicity, sexual orientation) | Explicit consent | GDPR Art. 9(2)(a) |

**Consent implementation**: The session consent gate (ConsentGate component) obtains explicit consent before any audio recording begins. Users can withdraw consent at any time by ending the session. Withdrawal does not affect lawfulness of prior processing.

---

## 4. Special-Category Data Assessment

Audio may incidentally contain special-category personal data under GDPR Art. 9, including:

- **Political opinions** (e.g., a speaker's political views expressed during a recorded debate)
- **Religious or philosophical beliefs** (e.g., discussion of religious claims)
- **Health data** (e.g., discussion of medical conditions)
- **Data revealing racial or ethnic origin** (e.g., discussion of ethnicity in the context of bias/fallacy analysis)
- **Data concerning sexual orientation**

**Risk assessment**: The risk that special-category data will be captured is non-trivial given Yentl's use case (fact-checking discourse, including political and social claims). Audio often contains incidental personal data about speakers and third parties mentioned in conversation.

**Mitigations**:
- Explicit Art. 9(2)(a) consent obtained before recording begins.
- No persistence: audio and transcripts are in-memory only and discarded at session end.
- Deepgram EU endpoint used for EU/EEA traffic to avoid cross-border transfer for audio.
- Engagement-gate hard-refusals block processing of claims about private individuals where harassment risk exists.

---

## 5. Cross-Border Transfer Assessment

All three processors are US-based. Transfer mechanisms:

| Processor | Transfer Mechanism | Notes |
|---|---|---|
| **Deepgram** | EU-US Data Privacy Framework (DPF) + SCCs | DPF-certified. EU endpoint (api.eu.deepgram.com) used for EU/EEA audio traffic to minimize cross-border data movement. |
| **Anthropic** | SCCs (auto-incorporated in Commercial ToS, effective January 1, 2026) | DPA signed. SCCs cover transcript text transfers. |
| **Vercel** | SCCs + DPA | Global edge network; EU hosting available. Application code, not personal audio/transcripts, handled by Vercel directly. |

**Transfer Impact Assessment (TIA) status**: TIAs for all three processors are pending completion before EU commercial launch. This is flagged as a residual risk item (see §8).

---

## 6. Three EDPB High-Risk Triggers

GDPR Art. 35 requires a DPIA when processing is "likely to result in a high risk." Yentl triggers three of the nine EDPB high-risk criteria:

### 6.1 Innovative Technology — LLM Fact-Checking

**Trigger**: Use of a novel technology (large language model with web-search-backed fact-checking) for automated analysis of speech content.

**Risk**: LLMs are not fully understood by regulators, users, or operators. They may generate incorrect verdicts with high confidence, may be manipulated via prompt injection in audio, and their behavior is not fully predictable.

**Mitigations**:
- Prominent AI disclosure ("Verdicts are AI-generated. Sources may be incomplete. Use your head.") on every session page.
- AIGeneratedBadge on every verdict card (triple-encoded: text + icon + color).
- ReportVerdictButton for users to flag incorrect verdicts.
- Public methodology documentation (/methodology).
- Version-locked prompts with a public prompt-version log.

### 6.2 Potentially Large-Scale Special-Category Processing

**Trigger**: Audio processing can incidentally capture special-category data (political views, health, religion, ethnicity) from potentially many users at scale.

**Risk**: If Yentl reaches significant user scale, the aggregate volume of special-category data processed (even ephemerally) represents heightened risk.

**Mitigations**:
- In-memory-only architecture eliminates persistence risk entirely.
- Explicit Art. 9(2)(a) consent obtained before any processing.
- No server-side logging of session content.

### 6.3 Automated Decision-Making with Potentially Significant Effect

**Trigger**: A FALSE verdict on a factual claim made by an identifiable individual (e.g., a public figure, a politician, a journalist) could affect their reputation if shared or cited.

**Risk**: This is Top Risk #1 in the research (defamation exposure). AI verdicts may be wrong. A falsely labeled "FALSE" verdict that circulates could cause reputational harm.

**Mitigations**:
- Terms of Service explicitly prohibit redistribution of verdicts as authoritative fact-checks without independent verification.
- AI disclosure prominently labels all verdicts as AI-generated.
- ReportFlow allows users to report incorrect verdicts.
- Engagement-gate hard-refusals block claims designed to defame private individuals.
- Public methodology published for expert scrutiny.
- WCAG-compliant interface ensures verdicts are presented with appropriate context (not decontextualized).

---

## 7. Mitigations (Complete List)

| Risk | Mitigation | Status |
|---|---|---|
| Audio persistence | In-memory-only architecture; no server-side storage | Implemented |
| Special-category data capture | Explicit Art. 9(2)(a) consent via ConsentGate | Pending (sister goal) |
| Third-party in room without consent | TwoPartyDisclosure banner on every session | Implemented |
| Audio chain opacity | AudioRouteDisclosure popover (Deepgram→Anthropic chain) | Partially implemented |
| AI verdict incorrectness | AI disclosure footer, AIGeneratedBadge, ReportVerdictButton | Implemented |
| Defamation via AI verdicts | ToS no-redistribution clause, methodology transparency | Implemented |
| Cross-border transfer (audio) | Deepgram EU endpoint for EU/EEA traffic | Planned (sister goal) |
| Cross-border transfer (all) | SCCs + DPF for all processors | Implemented (contractual) |
| Engagement for harmful claims | Hard-refusal categories in engagement gate | Documented (implementation: fact-check pipeline goal) |
| Screen reader inaccessibility | WCAG 2.2 AA baseline (aria-live, skip-to-content, focus rings, 44px targets) | Implemented |

---

## 8. Residual Risk

The following risks are not fully mitigated in v1 and are accepted as residual:

1. **TIA completion for all three processors** — Transfer Impact Assessments are not yet formally complete. This is required before EU commercial launch and is flagged for legal review.

2. **Manual screen reader testing** — Automated axe-core audits are clean, but manual VoiceOver/NVDA testing has not been completed. Scheduled before commercial launch.

3. **Anthropic data retention** — Anthropic's API may retain prompt/completion data for safety monitoring per its ToS. The exact retention period and opt-out mechanism for commercial customers should be confirmed via the DPA before EU commercial launch.

4. **Verdict defamation in the wild** — Even with ToS prohibiting redistribution, a user could screenshot and share a FALSE verdict about a real person. This risk is accepted as a residual risk inherent to any fact-checking product and is partially mitigated by the AI disclosure labeling.

5. **Quebec Law 25 full compliance** — A Quebec-specific Privacy Impact Assessment (PIA) has not been conducted. Required before commercial launch targeting Quebec residents.

---

## 9. Consultation

No prior consultation with a supervisory authority (Art. 36) was conducted for this v1 DPIA. If the TIA assessment concludes that residual cross-border transfer risk is high and cannot be mitigated, prior consultation with the lead supervisory authority will be required.

---

## 10. Review Schedule

This DPIA will be reviewed:
- Before EU commercial launch (to complete TIA items).
- Before adding any persistence (user accounts, session history, audio storage).
- Before adding v2 features (mobile app, API access, third-party integrations).
- Annually thereafter.
