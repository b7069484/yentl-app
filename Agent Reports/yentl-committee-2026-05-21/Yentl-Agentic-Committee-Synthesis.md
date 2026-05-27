# Yentl Agentic Committee Synthesis

Date: 2026-05-21  
Workspace: `/Users/israelbitton/Live FactCheck`

## Executive Verdict

Yentl is a serious product lab with a strong strategic wedge: a live, source-anchored media-literacy companion that can sit beside a video/page, transcribe what is said, flag checkable claims, show evidence strength, and teach users how rhetoric is operating.

It is **not ready for open public launch**. The blockers are not mainly aesthetic. They are product truth, security, privacy, consent, cost controls, evaluation validity, extension proof, mobile honesty, and conversation-state intelligence.

## What Yentl Has Now

- Distinctive UI identity and source-oriented session workspace.
- Six source paths: browser tab, microphone, audio upload, text, YouTube, media URL.
- Watch/Overview/Transcript/Claims/Markers, save/export/library, extension panel preview, and internal flow dashboards.
- Core AI pipeline: ASR -> extraction -> provisional verification -> web-search confirmed verification -> rhetoric -> synthesis -> Devil's Advocate.
- Two 100-video corpora with 200 transcript artifacts; Corpus 1 has WER summaries and a few replay slices; Corpus 2 targets failure modes.
- Extension scaffold aligned with Chrome tabCapture architecture.
- Meaningful trust/compliance docs, though many are ahead of runtime behavior.

## Highest-Risk Blockers

1. Cost-bearing APIs are public or insufficiently protected.
2. Upload/Blob behavior conflicts with no-persistence privacy copy.
3. Consent and engagement gate are mostly copy/specs, not hard runtime gates.
4. Account/save/privacy story contradicts itself.
5. Corpus evidence does not yet prove meaning preservation under crosstalk, quotation, repair, irony, and sensitive identity claims.
6. Extension audio capture needs installed-Chrome proof on real pages.
7. Mobile and platform limits are not clear enough.
8. Public landing page, pricing, FAQ, support/contact, and launch assets are incomplete.

## Committee Consensus

The next move should be a convergence sprint, not a broad redesign. Fix the truth and safety foundations first, then refine UI and launch messaging.

Recommended implementation sequence:

1. Freeze product truth decisions: account model, storage, retention, pricing, limitations.
2. Protect APIs, add quotas, metering, security headers, and Blob lifecycle controls.
3. Implement hard consent and engagement gate.
4. Fix visible trust breakers: unreadable CTAs, auth fallback, claim counts, accessibility copy, contact/terms gaps.
5. Separate live analysis from offline full-transcript review to remove future-context leakage.
6. Add evidence ladder, source roles, and source independence checks.
7. Preserve richer ASR evidence and run crosstalk/speaker attribution evaluations.
8. Run Corpus 2 Phase B pilot with human judgment sidecars.
9. Prove installed Chrome extension audio capture across real scenarios.
10. Build private beta launch assets, pricing intent, support, analytics, and feedback loops.

## Recommended Launch Posture

Private beta / research preview. Do not market as a real-time truth machine. Use language like:

> Yentl helps you inspect live media. It flags checkable claims, gathers source-backed evidence, marks rhetoric patterns, and shows uncertainty so you can think more clearly about what is being said.

## Best-Suited Committee Seats For Immediate Work

- Devorah Or: security/privacy launch gates.
- Miriam Shifra + Naomi Emet: product truth, copy lock, and flow alignment.
- Rivka Batya Halevi + Rivka Ben-Ami: engagement gate, claim semantics, evidence/eval architecture.
- Tova Shulamit Levin: ASR/crosstalk/extension audio proof.
- Bezalel Navon + Shoshana Aderet: UI trust breakers, mobile shell, accessibility.
- Ari Eliezer + Hadassah Keren: cost metering, quotas, analytics ledger.
- Yonah Barak + Elior Sapir: private beta positioning and competitive/PR discipline.
- Noam Gil: learning loops after trust foundations are stable.

## Bottom Line

Yentl should continue. It has a clear product heart. But launch must wait until runtime behavior, trust copy, security, evaluation, and user-facing claims all converge.
