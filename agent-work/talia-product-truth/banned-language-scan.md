# Talia banned-language scan

Date: 2026-05-21

## Command

```bash
rg -n "functional sample|validation lab|UNVERIFIABLE|UNVERIFIED|No Valid Backing|drop lib/taxonomy|engagement gate" app components lib
```

## Result

The edited Talia surfaces no longer contain the visible strings `No Valid Backing`, `drop lib/taxonomy`, `Open side panel`, `What do you want to analyze`, `Analyze a video I can play`, or `/docs/engagement-gate`.

The repo-wide acceptance scan is **not fully clean** because it includes internal enums, prompts, fixtures, and out-of-scope user-facing components. Notable remaining hits:

- Internal enum/back-compat: `lib/types.ts`, `lib/prompts/verify-provisional.ts`, `lib/prompts/verify-confirmed.ts`, `lib/client/filter-selectors.ts`, `lib/client/overview-selectors.ts`, `lib/client/orchestrator.ts`, `app/api/corpus-sample/route.ts`.
- Edited mapping file with internal key but safe visible label: `lib/client/verdict-theme.ts` maps `UNVERIFIABLE` to `No reliable backing`.
- Edited claim detail file with internal key but safe visible label: `components/session/claim-detail.tsx` maps `UNVERIFIABLE` to `No reliable backing`.
- Remaining user-facing verdict labels outside Talia write scope: `components/session/chips.tsx` still has `No backing`; `components/session/claim-row.tsx` still has `NO BACKING`; `components/verdict/VerdictCard.tsx` still has `UNVERIFIED`.
- Remaining route copy outside Talia write scope: `app/changelog/page.tsx` still says `engagement gate`; `app/accessibility/page.tsx` still links to `/contact`.
- Internal review/development pages: `app/project/validation/page.tsx` still says `validation lab` and `Open functional sample`; `components/session/ux-flow-dashboard.tsx` still contains an internal `UNVERIFIABLE` example.
- Validation fixtures: `lib/validation/fixtures.ts` still says `functional samples`.
- Export/report path outside Talia write scope: `lib/export/report.ts` still labels `UNVERIFIABLE` as `No valid backing found`.

## Recommendation

Give the next copy-lock pass explicit write scope for:

- `/Users/israelbitton/Live FactCheck/components/session/chips.tsx`
- `/Users/israelbitton/Live FactCheck/components/session/claim-row.tsx`
- `/Users/israelbitton/Live FactCheck/components/verdict/VerdictCard.tsx`
- `/Users/israelbitton/Live FactCheck/lib/export/report.ts`
- `/Users/israelbitton/Live FactCheck/app/accessibility/page.tsx`
- `/Users/israelbitton/Live FactCheck/app/changelog/page.tsx`

Those files contain the remaining user-facing vocabulary leaks.
