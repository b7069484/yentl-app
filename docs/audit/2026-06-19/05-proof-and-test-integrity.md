# Proof & Test Integrity Audit — Yentl (yentl.it)

Date: 2026-06-19
Auditor stance: skeptic. Mandate: determine how much of the "proof battery" and the
8.6/10 launch-readiness self-score is real verification vs green-but-hollow fixture
theater. Code was read, tests/tsc/lint were run, JSON artifacts were inspected. **No code
was changed.**

Working root: `/Users/israelbitton/Live FactCheck` (git toplevel confirmed correct, not a
swallowed parent repo).

---

## 0. Headline

- **Real test suite: 176 files / 1836 tests, ALL PASS, 0 fail, 0 skip, ~47s wall.** Clean.
- **`tsc --noEmit`: exit 0. `eslint`: exit 0.** Clean.
- **The proof battery is roughly half real, half synthetic.** The "deterministic / fixture"
  proofs are honest *as unit tests of internal logic* but are routinely **mislabeled as
  end-to-end product proof**. The two most-cited deploy proofs (ingestion-deploy,
  analysis-deploy) are the weakest and the most misleading.
- **The project's own top-level aggregator, `release-readiness-proof.json`, says
  `"launch_ready": false` with 6 launch-critical blockers and 0/3 external proofs passing.**
  That single fact is the most important in this audit: the 8.6/10 "ship checkpoint /
  prod deploy now authorized" narrative is contradicted by the battery's own summary file.

---

## 1. Proof Inventory

### 1a. `scripts/validation/*` — what each claims to prove + REAL/SYNTHETIC class

| Script | Claims to prove | Class | Giveaway |
|---|---|---|---|
| `prove-analysis-local.mjs` | Claim-extraction + rhetoric + verification replay over corpus | **MIXED** | Replays a **stored** Deepgram transcript (`replay.ts:127`) through real `/api/extract-claims`, `/api/verify-*`. Deploy verify hits real Opus. But rhetoric failures are downgraded to non-fatal (`:140-150`) and claim asserts are `>=1`. |
| `prove-ingestion-local.mjs` | Ingestion API paths (article/media/PDF/YouTube/upload/SSRF) | **MIXED→SYNTHETIC** | Core media/article checks *require* the validation-demo stub (`validation_fixture === true`, `:276-282`). Deploy mode launders production failures into passes (`:67-81`). |
| `prove-ingestion-ui-local.mjs` | Rendered source-picker UI handoffs | SYNTHETIC (browser, local fixtures) | agent-browser over local app with validation fixtures. |
| `prove-cloud-sync-local.mjs` | Saved-session cloud-sync API | **SYNTHETIC** | Asserts the **unconfigured** path returns 503; never proves an authed save/restore. |
| `prove-installed-extension-local.mjs` | Installed Chrome extension capture | **REAL-ish (local fixture)** | Drives a real loaded extension + tabCapture against `/validation/browser-capture.html` (synthetic page). |
| `prove-large-real-media-canary.mjs` | Large real phone-recorded media through prod Blob+Deepgram | **REAL (gated)** — *correctly fails* | Refuses to pass without a real manifest; current artifact `ok:false`. |
| `prove-mobile-device-canary.mjs` | Physical iOS/Android flows | **REAL (gated)** — *correctly fails* | `ok:false`, missing manifest. |
| `prove-mobile-pwa-local.mjs` | Mobile/PWA route render | SYNTHETIC (browser, emulated) | jsdom/agent-browser route render, not a real device. |
| `prove-pwa-native-contract.ts` | manifest/share/file-handler contract | SYNTHETIC (static) | Parses manifest JSON shape. |
| `prove-session-ux-local.mjs` | Session UX, save roundtrip, restore | SYNTHETIC (browser, local) | Real-ish UX flow but local + localStorage. |
| `prove-synthesis-metaread.ts` | Synthesis/meta-read quality gate | **SYNTHETIC (deterministic)** | Asserts against **hand-authored `expected` objects baked in the script** (`:26-205`); never calls the live model. |
| `prove-speaker-attribution.ts` / `score-speaker-attribution.ts` | Multi-speaker purity/owner accuracy | **SYNTHETIC (fixture corpus)** | Scores pre-labeled corpus windows; deterministic. High scores (purity 0.997) are over fixtures. |
| `prove-sensitive-attribution-review.mjs` | Human review of sensitive windows | **REAL (gated)** — *correctly fails* | `ok:false`, 0 of 5 windows reviewed, missing manifest. |
| `prove-text-document-fixtures.ts` | Text/PDF/caption fixtures | SYNTHETIC | Fixture inputs. |
| `prove-a11y-deploy.mjs` | axe a11y on launch routes | REAL (axe) but **launders stale deploy** | Deploy mode records production a11y violations as `deploy_blockers` and still passes. |
| `prove-trust-copy-deploy.mjs` | Trust/legal copy present on pages | REAL (fetch) but laundered same way | — |
| `sample-extension-latency.mjs` | Extension capture latency | **HOLLOW** | `requested_runs:0`; re-aggregates 2 old JSONs; reports transcript-latency avg from a sample that never produced a transcript. |
| `verify-real-webpage-targets.mjs` | Extension works on real pages | partial REAL | Hits real Wikipedia/article pages for page-text; not full transcription. |
| `check-extension-package.mjs` | Extension package shape | SYNTHETIC (static) | File/manifest inspection. |
| `prove-release-readiness.mjs` | Aggregate launch gate | **REAL META-PROOF (honest)** | Aggregates all proofs; correctly emits `launch_ready:false` + blockers. Best artifact in the battery. |
| `create-launch-canary-templates.mjs` | Canary manifest scaffolding | N/A (tooling) | Generates empty templates. |

### 1b. `docs/superpowers/validation/*.json` — artifact + verdict

| Artifact | Reported | Honest? |
|---|---|---|
| `release-readiness-proof.json` | `ok:true, launch_ready:false`, 6 blockers, ext 0/3 | **Yes — most honest** |
| `ingestion-deploy-proof.json` | `ok:true, failures:[]` but **6 deploy_blockers** incl. doc-upload 500s, broken YouTube ingest | **No — laundered** |
| `ingestion-local-proof.json` | `ok:true`, 20 checks | Mixed (passes by requiring the stub) |
| `analysis-deploy-both-proof.json` | `ok:true`, **1 check, 1 claim, 6 utterances** | Real model call, trivially thin |
| `analysis-deploy-confirmed-proof.json` | `ok:true`; `interview_002` = **0 claims, 0 verified** still passes | **No — green-but-hollow** |
| `analysis-local-proof.json` | `ok:true`; `interview_002` 0 claims | Hollow on that row |
| `synthesis-metaread-proof.json` | `ok:true`, 6 checks | Deterministic; not live-model |
| `speaker-attribution-proof.json` | `ok:true`, purity 0.997, **`launch_ready:true` but `review_required_before_public_claims`** | Fixture-scored; over-claims launch-ready |
| `cloud-sync-local-proof.json` | `ok:true`, `cloud_mode:cloud_unavailable` | Honest but proves only the disabled path |
| `cloud-sync-deploy-proof.json` | `ok:true`, `signed_out`, `authenticated_proof_skipped:true` | Proves only the signed-out guard |
| `installed-extension-local-proof.json` | `ok:true`, live transcription proven (local fixture) | Real on a synthetic page |
| `installed-extension-external-proof.json` | `ok:true` but **`live_transcription_proven:false`** | Passes without proving transcription |
| `extension-latency-samples.json` | `ok:true`, avg first-transcript 8516ms | **No — re-aggregated, sample w/o transcript** |
| `extension-store-readiness.json` | `ok:true`, all store flags green | Static file check, NOT a real CWS submit |
| `large-real-media-canary-proof.json` | **`ok:false`** | **Yes — correctly fails** |
| `mobile-device-canary-proof.json` | **`ok:false`** | **Yes — correctly fails** |
| `sensitive-attribution-review-proof.json` | **`ok:false`** | **Yes — correctly fails** |
| `a11y-deploy-proof.json` / `trust-copy-deploy-proof.json` | `ok:true` (deploy) | Laundered stale-deploy (handoff admits 14+3 a11y violations live) |
| `mobile-pwa-local-proof.json` (117KB) | `ok:true`, 60 checks | Emulated render, not device |
| `pwa-native-contract-proof.json` | `ok:true`, 6 checks | Static manifest contract |

---

## 2. GREEN-BUT-HOLLOW — proofs whose pass does NOT guarantee the user-facing behavior

1. **`ingestion-deploy-proof.json` launders production failures into passes.**
   `prove-ingestion-local.mjs:67-81`: in deploy mode, any failing check whose *local*
   counterpart passed gets `check.stale_deploy = true; check.ok = true;`. The top-level
   `ok` is then `failures.length === 0` computed *after* the laundering (`:83-85`).
   Result: the live artifact reports `ok:true, failures:[]` while six checks carry real
   error strings — **`pdf-document-ingest`: "document ingest returned 500"**,
   `document-upload-missing-file`/`unsupported-type`: production returns **500 instead of
   400/415**, **`youtube-caption-ingest`: `{"code":"PRIVATE"...}` (broken on prod)**, and
   article/media ingest "did not use the local validation fixture." A production endpoint
   returning HTTP 500 is recorded as a passing check. The handoff (line 922) admits this,
   but the JSON's headline still reads green.

2. **Analysis replay passes with 0 verified claims.** `analysis-deploy-confirmed-proof.json`
   → `interview_002`: `claims:0, verified_claims:0`, yet `ok:true`. Cause:
   `prove-analysis-local.mjs:172-177` only requires `markers>=1 || claims>=1`, and
   `assertVerificationOutcomes` (`:190-198`) returns early when `claims.length === 0`.
   A regression that silently stops extracting claims would not be caught for that case.

3. **Rhetoric-stage failures are non-fatal.** `prove-analysis-local.mjs:140-150` splits
   replay errors into `rhetoricErrors` (ignored) vs `fatalErrors`. The LLM rhetoric stage
   can error out completely and the proof still passes if any claim/marker exists.

4. **The deploy "both" analysis proof is one round-trip.** `analysis-deploy-both-proof.json`
   = a single corpus id, 6 utterances, 1 claim, 1 verified claim. Real Opus call (good),
   but presented as production analysis validation. One sentence verified ≠ analysis works.

5. **External extension proof passes without transcription.**
   `installed-extension-external-proof.json`: `live_transcription_proven:false`,
   `first_transcript_event_ms:null`, `ok:true`. And `extension-latency-samples.json` then
   reports an aggregate "first transcript" latency built partly from that transcript-less
   run — with `requested_runs:0` (it ran nothing; it re-read old JSON).

6. **"Synthesis quality" is asserted against hand-written expected text.**
   `prove-synthesis-metaread.ts:26-205` embeds the expected meta-read objects in the script.
   And `lib/server/validation-media-fixtures.ts:120-153` returns a fully hardcoded synthesis
   verdict (headlines, grades, one-liners at `:136-151`) for the canned panel. The live
   model's synthesis quality is never gated.

7. **Cloud-sync proofs prove only the OFF path.** Local asserts `cloud_unavailable` (503);
   deploy asserts `signed_out` (401) with `authenticated_proof_skipped:true`. Neither shows
   a signed-in user saving on device A and restoring on device B. (Release-readiness lists
   this as blockers #2 and #3.)

8. **Speaker-attribution claims `launch_ready:true` while flagging review_required.**
   `speaker-attribution-proof.json` reports purity 0.997 over a **pre-labeled fixture
   corpus** and `launch_ready:true`, yet simultaneously
   `public_claims_review_status: "review_required_before_public_claims"` with 5 unreviewed
   sensitive windows. The "launch_ready" sub-flag is misleading given its own caveat.

9. **a11y/trust deploy proofs are green over a stale prod with known violations.** Same
   stale-deploy laundering. Handoff lines 466-467: production has 14 color-contrast
   violations on `/` and 3 on `/contact` — recorded as `deploy_blockers`, proof still green.

> Fixture short-circuit confirmed in server code: `validationMediaFixturesEnabled()` returns
> true whenever `NODE_ENV !== "production"` (`validation-media-fixtures.ts:60-64`). So *any*
> non-prod run silently serves canned transcripts/synthesis for fixture URLs. The ingestion
> proof's media checks **require** this (`validation_fixture === true`), i.e. they test the
> stub, not Deepgram. (`verify-confirmed/route.ts:17-18` also has fixture bypasses.)

---

## 3. Real test / tsc / lint results (run 2026-06-19)

```
> vitest run
 Test Files  176 passed (176)
      Tests  1836 passed (1836)
   Duration  46.65s  (real 47.81s)
```
- `npx tsc --noEmit` → **exit 0** (no type errors).
- `npm run lint` (eslint) → **exit 0** (no lint errors).
- No flakes observed; deterministic single run. (Prompt estimated ~1751 tests; actual 1836.)

**Caveat:** these 1836 are Vitest unit/component tests (jsdom). They verify logic and React
render contracts. They do **not** exercise real Deepgram, real Opus, real Blob, real Clerk
auth, or a real browser/device — those live only in the (gated, mostly failing) proof scripts.
A green Vitest run is genuine but narrow.

---

## 4. Launch-checklist reality check

**`2026-05-26-external-launch-proof-checklist.md`** — all 5 sections unmet:
1. Real Chrome extension permission prompt — "**blocked** on a manually loaded extension";
   5 required screenshots not captured.
2. Deployed Redis/Blob smoke — "**blocked** on deployed env vars."
3. Configured Clerk captures — "**blocked** on a deployment with Clerk keys configured."
4. Legal/compliance signoff — "**not signed off**." TIAs pending; Anthropic retention/opt-out
   unconfirmed for EU commercial launch; Quebec Law 25 PIA flagged.
5. Document/PDF/OCR import — "**still needs deeper build-out** before it can be called
   complete." (Consistent with the live PDF-ingest 500s in the ingestion deploy proof.)

**`2026-05-26-youtube-live-pipeline-proof.md`** — partly real, honestly bounded. Real caption
ingest is proven (Rosling `fTznEIZRkLg` 241 segments; Tucker/O'Leary `IDC8PrZQHts` 283
segments; `validation_fixture:false`). But §"Remaining Wiring Gap": for **captionless**
arbitrary YouTube videos, live tab-audio capture → transcription → rail is **only
unit-tested**, never proven end-to-end in a real browser. A real 45-min multi-speaker debate
without public captions is unproven.

**`release-readiness-proof.json`** — `launch_ready:false`. 6 blockers: sensitive-attribution
human review (0/5), authed cloud-sync (local + prod), physical iOS/Android, large real media
canaries, production release smoke on current tree. `git.dirty_count: 246, clean:false` — the
"ship checkpoint" commit sits on a 246-file-dirty tree. Deploy proofs flagged stale.

**Verdict: the launch checklist is aspirational, and the battery's own aggregator agrees.**

---

## 5. THE UNTESTED GAP — what a paying user hits that was never truly tested

1. **A real, long, multi-speaker debate.** No real ≥30–45 min YouTube/livestream debate has
   gone end-to-end. Replays cap at 6–12 utterances of a *stored* transcript. Speaker
   diarization, drift, and claim density at scale are unproven on real audio.
2. **Captionless live audio capture.** The launch-critical path (tab/system audio →
   Deepgram → live rail) is unit-tested only. The external extension proof literally has
   `live_transcription_proven:false`.
3. **A real noisy phone recording.** `large-real-media-canary` is `ok:false` — no real
   phone-recorded audio/MP4/MOV/WebM has been transcribed through prod Blob+Deepgram.
4. **Real STT accuracy / WER on real input.** Analysis proofs replay canned transcripts;
   Deepgram is never invoked in the proof path. WER corpus scripts exist but no passing
   WER artifact is in the battery.
5. **Real model cost & latency under load.** Only single tiny Opus round-trips were timed.
   No concurrency, no rate-limit-under-load, no $/session or p95-latency data for real
   45-min sessions. (Release-readiness blocker: production smoke not run on current tree.)
6. **Authenticated cross-device cloud sync.** Never proven with a real Clerk auth header.
   Save-on-phone / restore-on-laptop is untested; only signed-out guards pass.
7. **Real Chrome Web Store install.** `extension-store-readiness` is a static manifest/file
   check. No real submission, review, or installed-from-store run. The real permission
   prompt is still "blocked."
8. **Real concurrent load / abuse.** No load test, no real rate-limit smoke against prod, no
   SSRF/abuse testing beyond a single 169.254 metadata probe.
9. **Production parity.** Live prod returns 500 on document upload and breaks on YouTube
   ingest *right now* (ingestion-deploy-proof) — masked by stale-deploy laundering. The
   tree that "fixes" it is committed but admittedly **not yet deployed**.
10. **Legal/compliance launch gates.** DPIA/DPA/TIA unsigned; EU/Quebec posture unresolved.
11. **Mobile on real devices.** iOS/Android share-sheet, file picker, mic, PWA install,
    restore — all `ok:false`, emulated-only.
12. **Sensitive-content editorial review.** 0 of 5 flagged sensitive attribution windows
    have had the required human review.

---

## 6. Bottom line

- **Fraction real vs synthetic:** Of ~21 proof scripts / ~25 JSON artifacts, roughly **40–50%
  are genuine signal** (the gated canaries that correctly fail, real caption ingest, real
  Opus verify on deploy, the honest release-readiness aggregator, plus the clean 1836-test
  Vitest/tsc/lint trifecta). The other **~50% are synthetic/deterministic and, more
  importantly, mislabeled** — fixture replays and stub-dependent checks presented as
  end-to-end product proof, with a stale-deploy laundering mechanism that turns live
  production failures green.
- **Most misleading "green" claims:** (1) `ingestion-deploy-proof.json` `ok:true` while prod
  500s and broken YouTube ingest hide in `deploy_blockers`; (2) analysis deploy proofs that
  pass with 0 verified claims / 1-sentence samples; (3) `extension-latency-samples.json`
  reporting transcript latency from a run that produced no transcript; (4) cloud-sync "passes"
  that only prove the feature is off.
- **Real test result:** 1836/1836 Vitest pass, tsc clean, lint clean — solid engineering
  hygiene at the unit level, but narrow (no real external services in that path).
- **Trust in the 8.6/10:** The unit-test/typecheck/lint foundation justifies maybe the lower
  half of that. The launch-readiness implication does not survive contact with the project's
  own `release-readiness-proof.json` (`launch_ready:false`, 6 blockers, ext 0/3, 246-file
  dirty tree, stale deploy proofs). To the team's credit, the gaps are **documented honestly**
  in the handoff and the aggregator — this is sloppy *labeling at the top*, not deception
  underneath.

**Independent readiness estimate: ~5.5/10 for engineering maturity / internal correctness;
~3/10 for actual external launch readiness.** Justification: the codebase is well-tested and
typesafe, and the harness *knows* what's missing — but every launch-critical real-world path
(real long audio, captionless capture, real device, authed sync, store install, prod parity,
legal signoff) is either failing-by-design-and-honest or untested. The 8.6 conflates "our
unit suite and fixture proofs are green" with "the product is proven for paying users." It is
not. Ship-readiness should be read off `release-readiness-proof.json`, which says **not yet.**
