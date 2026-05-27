# Talia status row update

Talia completed the allowed product-truth pass.

- Status: done with residual out-of-scope findings.
- Decisions: v1 is guest-first/browser-local for saved sessions; account sync is not part of v1 unless a deployment explicitly enables it and updates copy.
- Copy lock: homepage/source-picker/auth fallback/policy pages/claim detail/verdict theme updated to the locked vocabulary.
- Verification: targeted tests, related filter/chip tests, lint, and browser route smoke passed.
- Residual: repo-wide banned scan still finds user-facing leaks in files outside Talia scope, especially `components/session/chips.tsx`, `components/session/claim-row.tsx`, `components/verdict/VerdictCard.tsx`, `lib/export/report.ts`, `app/accessibility/page.tsx`, and `app/changelog/page.tsx`.

See:

- `/Users/israelbitton/Live FactCheck/agent-work/talia-product-truth/product-truth-decisions.md`
- `/Users/israelbitton/Live FactCheck/agent-work/talia-product-truth/banned-language-scan.md`
- `/Users/israelbitton/Live FactCheck/agent-work/talia-product-truth/status-row.csv`
