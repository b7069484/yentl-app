# Live FactCheck / Yentl Codebase and Git Audit

Agent: agent_codebase
Date: 2026-05-21 17:40:10 EDT
Workspace: /Users/israelbitton/Live FactCheck
Remote: https://github.com/b7069484/yentl-app.git
Mode: audit only. No app/source files were edited. This report file is the only intentional write.

## Scope

Focused audit of codebase state, git state, branches, worktrees, commits, pushes, PRs, remote refs, CI signals, and obvious packaging risks. I intentionally did not run `git fetch`, `npm run build`, `npm run lint`, `npm test`, or `tsc`, because those can update local metadata, caches, generated files, or refs. Remote status was checked through read-only `git ls-remote` and `gh` API calls.

## Executive Summary

1. The pushed branch is clean and synchronized:
   - Current branch: `codex/yentl-functional-samples-extension-handoff`
   - Current HEAD: `af3f5ae92b1fb3ec8beb66e03bc49245fea42ca0`
   - Upstream: `origin/codex/yentl-functional-samples-extension-handoff`
   - Local HEAD vs upstream: `0 ahead / 0 behind`
   - `git ls-remote` confirms the remote branch is also at `af3f5ae92b1fb3ec8beb66e03bc49245fea42ca0`.

2. PR #5 is open, mergeable, and green remotely:
   - URL: https://github.com/b7069484/yentl-app/pull/5
   - Title: `Add Yentl extension validation handoff`
   - Base: `main`
   - Head: `codex/yentl-functional-samples-extension-handoff`
   - Merge state: `CLEAN`
   - CI: `Type-check - Lint - Test - a11y` success on `af3f5ae`
   - Vercel: success
   - Vercel Preview Comments: success

3. The local worktree is not clean. There is a fresh local layer that is not committed, not pushed, and not represented in PR #5:
   - 31 tracked files modified but unstaged.
   - 1 staged new file.
   - 670 untracked paths.
   - No merge-conflict paths were detected.
   - No stash entries were present.

4. Nothing appears "lost" in the normal branch/upstream sense for the current branch: current HEAD is pushed, PR-visible, and CI-green. However, there are many uncommitted/untracked local artifacts and dirty sibling worktrees. Those are the real dangling-risk surface.

5. `git fsck --no-reflogs --unreachable --dangling` found unreachable objects:
   - 1126 blobs
   - 1279 trees
   - 16 commits
   - This is consistent with recent reset/rebase/churn visible in reflog, but these commits are not protected by branch/tag refs. If any are valuable, they need to be anchored later by a branch/tag before garbage collection. I did not create any refs.

## Current Branch and Commit Graph

Current branch:

```text
codex/yentl-functional-samples-extension-handoff
```

Current branch commits ahead of `main`:

```text
af3f5ae Preserve extension panel workspace and exports
a7e6189 Redesign extension panel tabs and source context
dfa17c3 Add extension Grok latency handoff
b4d9d52 Improve extension latency and add Grok challenge
2129c59 Improve extension panel analysis snapshot
5b61f41 Add Yentl extension validation handoff
```

`main` is not ahead of current HEAD. `main` is an ancestor of current HEAD.

Remote default branch:

```text
origin/HEAD -> origin/main
origin/main -> 015ff83fddf31a5ae2e9453f68302fa6b1e9430d
```

## Local Dirty State

`git status --porcelain=v1 -b` reports the current branch as tracking upstream with no ahead/behind marker, then a dirty worktree.

Unstaged tracked diff:

```text
31 files changed, 1086 insertions(+), 138 deletions(-)
```

Staged diff:

```text
docs/superpowers/handoff/2026-05-21-yentl-extension-panel-workspace-export-handoff.md
409 insertions
```

Staged check warning:

```text
docs/superpowers/handoff/2026-05-21-yentl-extension-panel-workspace-export-handoff.md:409: new blank line at EOF.
```

Unstaged tracked files:

```text
app/api/corpus-sample/route.ts
app/api/source-preview/route.ts
components/session/ClaimCard.tsx
components/session/MarkerChip.tsx
components/session/SourceListItem.tsx
components/session/chips.tsx
components/session/claim-detail.tsx
components/session/claim-row.tsx
components/session/filtered-list.tsx
components/session/marker-row.tsx
components/session/source-card.tsx
components/session/ux-flow-dashboard.tsx
components/session/watch-view.tsx
lib/client/verdict-theme.ts
lib/export/report.ts
lib/prompts/verify-confirmed.ts
lib/prompts/verify-provisional.ts
lib/server/og-fetch.ts
lib/types.ts
package.json
scripts/test-corpus/_shared.ts
scripts/test-corpus/fetch-ground-truth.ts
scripts/test-corpus/ingest-all.ts
scripts/test-corpus/replay.ts
scripts/test-corpus/resolve-urls.ts
scripts/test-corpus/score-wer.ts
test-corpus/scores/solo_005.json
tests/api/corpus-sample.test.ts
tests/hero-selection.test.ts
tests/og-fetch.test.ts
tests/ux-flow-dashboard.test.tsx
```

Top untracked clusters by count:

```text
150 public/visual-evidence
100 test-corpus-2/transcripts
100 test-corpus-2/audio
 98 test-corpus/audio
 96 test-corpus/transcripts
 23 .claude/worktrees
 17 test-corpus/ground-truth
 17 test-corpus-2/ground-truth
 16 test-corpus/scores
 14 test-corpus-2/scores
```

Large local artifact directories:

```text
9.9G  .claude
715M  test-corpus
645M  test-corpus-2
4.6M  public/visual-evidence
316K  public/corpus-2-report
12K   .claire
12K   docs/superpowers/visual-evidence
```

Notable individual untracked roots:

```text
.claire/
.claude/
3701551.3704128.pdf
app/api/project-flow-comments/
components/session/az-flow-dashboard.tsx
components/session/marker-asset-icon.tsx
components/session/visual-evidence-dashboard.tsx
download-1.jpg
download.jpg
lib/client/source-preview.ts
lib/visual-evidence/
scripts/test-corpus-2/
scripts/test-corpus/report.ts
scripts/visual-evidence/
tests/marker-assets.test.ts
yentl-mark.ai
yentl-mark.svg
```

Assessment: the local working state contains real work beyond the pushed PR. It should be deliberately committed, split, ignored, or discarded later by a human/implementation agent. I made no changes.

## Dependency and Lockfile Check

`package.json` has unstaged script additions for corpus and corpus2 commands. No dependency block changes were present in the displayed diff. `package-lock.json` exists and is not modified in git status.

Assessment: no immediate package-lock mismatch from the observed diff, because the current `package.json` change appears script-only. If dependency edits are introduced later, the lockfile must be updated with them.

## Ignore, Test, and TypeScript Hygiene

`.claude/**` and `.claire/**` are excluded from:

```text
vitest.config.ts
eslint.config.mjs
```

They are not ignored by `.gitignore`, and `tsconfig.json` only excludes:

```json
["node_modules"]
```

This matters because:

1. Parent git status sees `.claude/` and `.claire/` as untracked.
2. Local TypeScript includes `**/*.ts`, `**/*.tsx`, and `**/*.mts`, so nested worktree code can still be swept by local type-checks unless tooling narrows the project or ignores those paths elsewhere.
3. CI does not see these local untracked worktrees, so local and CI results can diverge.

Local env files detected by path only, not read:

```text
./.env.local
./.claude/worktrees/blissful-chaum-49849a/.env.local
./.claude/worktrees/crazy-robinson-52cde0/.env.local
./.claude/worktrees/fervent-knuth-fbe0a2/.env.local
./.claude/worktrees/jolly-kepler-076d7b/.env.local
./.claude/worktrees/marketing-landing/.env.local
./.claude/worktrees/phase-2-auth-foundation/.env.local
./.claude/worktrees/wonderful-bhabha-796897/.env.local
```

The root `.gitignore` does include `.env*` and `.env*.local`, so these are not shown as direct untracked files. The larger issue is the untracked `.claude/` worktree root.

## Worktree Inventory

`git worktree list --porcelain` reports the main workspace plus 23 `.claude/worktrees/*` worktrees.

Dirty or notable worktrees:

```text
/Users/israelbitton/Live FactCheck
  Dirty current worktree; see main dirty-state section.

/.claude/worktrees/blissful-chaum-49849a
  Many untracked test-corpus transcript JSON files.

/.claude/worktrees/bold-cray-e9479f
  Untracked --full-page, .claude/, .project/.

/.claude/worktrees/crazy-payne-b8c84f
  Untracked .claude/.

/.claude/worktrees/elegant-mendeleev-cf3350
  Untracked pnpm-lock.yaml.

/.claude/worktrees/epic-visvesvaraya-9e83ef
  Tracks origin/main and is behind by 147.

/.claude/worktrees/fervent-knuth-fbe0a2
  Modified .gitignore.

/.claude/worktrees/intelligent-poitras-6c2216
  Tracks origin/main and is behind by 162.

/.claude/worktrees/intelligent-shaw-7d6425
  Untracked --full-page.

/.claude/worktrees/marketing-landing
  On feat/v3-auth-screens, tracks origin branch, has untracked .project/screenshots/v3.* and components/marketing/.

/.claude/worktrees/phase-2-auth-foundation
  Tracks origin/feat/phase-2-auth-foundation, which is gone.

/.claude/worktrees/sad-ishizaka-b2ce36
  Tracks origin/main and is behind by 147; untracked --full-page.

/.claude/worktrees/trusting-hermann-e23f4a
  Modified app/globals.css, app/layout.tsx, app/page.tsx; untracked components/brand/ and brand public assets.

/.claude/worktrees/vigorous-boyd-e61c6a
  Untracked --fullpage.

/.claude/worktrees/wizardly-jones-792f60
  Untracked .goals/yentl-compliance-* folders.

/.claude/worktrees/wonderful-bhabha-796897
  On integration/sprint-as-trunk; modified five ingest pane files.
```

Several other worktrees reported clean short status in the first 80 lines of their status output.

Assessment: worktree sprawl is currently the largest operational cleanliness risk. There are multiple unrelated dirty surfaces under `.claude/worktrees`, including potential product work, generated screenshots, typo artifacts like `--full-page`, and a branch whose upstream is gone.

## Branch Inventory

Local branch concerns:

```text
feat/phase-2-auth-foundation -> upstream gone
claude/epic-visvesvaraya-9e83ef -> behind origin/main by 147
claude/sad-ishizaka-b2ce36 -> behind origin/main by 147
claude/intelligent-poitras-6c2216 -> behind origin/main by 162
```

Current branch is fine:

```text
codex/yentl-functional-samples-extension-handoff -> origin/codex/yentl-functional-samples-extension-handoff
```

Remote heads from read-only `git ls-remote --heads origin` include:

```text
main
codex/yentl-functional-samples-extension-handoff
feat/v3-auth-screens
goals/yentl-compliance-foundation
goals/yentl-this-week-actions
17 claude/* branches
```

Tag inventory:

```text
pre-sprint1-rebase
```

Submodules:

```text
No submodule status output.
```

Stashes:

```text
No stash entries.
```

## Pull Requests and CI

Open PRs:

```text
#5 OPEN  codex/yentl-functional-samples-extension-handoff -> main
   Add Yentl extension validation handoff
   Merge state: CLEAN
   CI: success
   Vercel: success

#4 OPEN  goals/yentl-this-week-actions -> main
   this-week: clauses 1-5 (BIPA + GDPR + AI Act + recording UX)
   Merge state: UNSTABLE
   CI: failure
   Vercel: success

#3 OPEN  feat/v3-auth-screens -> main
   V3 wireframe sprint + this-week-actions clauses 1+2+3 (BIPA defaults)
   Merge state: CLEAN
   CI: success
   Vercel: success
```

Merged PRs:

```text
#2 MERGED feat/phase-2-auth-foundation -> main
#1 MERGED claude/intelligent-shaw-7d6425 -> main
```

Recent CI runs show all six PR #5 commits succeeded:

```text
5b61f41 success
2129c59 success
b4d9d52 success
dfa17c3 success
a7e6189 success
af3f5ae success
```

CI failures still exist on PR #4 / goals/yentl-this-week-actions:

```text
26191704525 failure, pull_request, c35e985
26191702670 failure, push, c35e985
```

Assessment: current PR #5 is healthy. The broader repo still has an open unstable PR (#4), and open branch/PR sequencing should be handled deliberately before merging multiple streams.

## Object Reachability

`git fsck --no-reflogs --unreachable --dangling` summary:

```text
blob   1126
tree   1279
commit 16
```

Unreachable commits:

```text
080bcae5ece46d9a6145e030aeb76ba90b92292f
0cf122684e2df6d638c91d8801601e894c9a521f
263ac6fa199b5f13251a0a562266abbb2ef82381
2f3d213a07f17a8823fa6881f51cedd54578f939
32b3a84c2cb98c351882776a7863a1c0ab2fbfc4
3c6a30d72d51273e3c74ad75712662ff8171a73a
7964efca3d415ab453f9515e160723f8c96373a5
900074862cb4e96f533db7835ca39ed9f3a94e31
9786dbe1976505b2c282ef93405e7fb649e1ebe5
9fddc6bd44df53376ad0b195846e7b04783f633a
b32eb549f83639d2f325442493e144b993f41829
b38ac98d3f314eede31f13767f0a50f4aa054d99
c97853a8c3e7e1b67dc34541032653c31b665492
cbceec995ec915aa36bfa52451cca60332931929
e4ffa283d6fca1f570dd3f48056d3bf30ad550dd
e677718b4fe0439d37a04fbd588f3c4bfa0ace38
```

Reflog context shows recent reset/rebase/pull activity, including:

```text
2026-05-21 commits on codex/yentl-functional-samples-extension-handoff
2026-05-19 pull --ff-only origin main
2026-05-18 pull --rebase origin main
2026-05-13 reset: moving to 75b8050
```

Assessment: this is not proof of corruption. It is proof that there is unreachable history in the object database. Because I was instructed not to change anything, I did not anchor or prune it.

## Specific Risks

1. Local latest version is not the same as remote PR #5.
   - Remote PR #5 is green at `af3f5ae`.
   - Local worktree includes substantial uncommitted edits and 670 untracked paths.
   - Any statement that "everything is pushed" would be wrong for the local latest state.

2. One staged file has a whitespace/check warning.
   - `docs/superpowers/handoff/2026-05-21-yentl-extension-panel-workspace-export-handoff.md`
   - Warning: blank line at EOF.

3. Generated/corpus artifacts are mixed into the working tree.
   - `test-corpus`, `test-corpus-2`, `public/visual-evidence`, `public/corpus-2-report`, audio, transcripts, scores, and logs need a clear track-vs-ignore policy.

4. Nested worktrees are visible to parent git and possibly TypeScript.
   - `.claude/` is 9.9G and untracked.
   - `.claire/` is untracked.
   - ESLint/Vitest ignore them, but `.gitignore` and `tsconfig.json` do not.

5. There is dirty work in sibling worktrees.
   - Some look like generated artifacts.
   - Some look like real product work.
   - At least one worktree tracks a gone upstream branch.

6. PR #4 is still open and unstable.
   - Its CI is failing even though Vercel is green.
   - This can confuse "repo green" summaries if people only look at one status surface.

7. Unreachable commits exist.
   - Most likely old churn from reset/rebase and PR iteration.
   - Any valuable unreachable commit should be anchored before cleanup.

## Recommendations for Next Maintainer

1. Do not switch branches or merge until the current uncommitted layer is intentionally handled.

2. Split the current local changes into explicit buckets:
   - source/UI/API changes
   - corpus harness changes
   - generated corpus/audio/transcript outputs
   - visual-evidence assets
   - agent/worktree debris
   - one-off downloads/PDFs/vector assets

3. Fix or restage the staged handoff doc if it is intended to be committed. The only detected check warning is its blank line at EOF.

4. Decide whether `.claude/` and `.claire/` should be ignored by parent `.gitignore`, and decide whether `tsconfig.json` should exclude them. This should be done intentionally because those folders contain other agents' worktrees and local env files.

5. Resolve PR #4 before using it as a merge candidate. It is open and unstable.

6. Review the dirty sibling worktrees before deleting or pruning anything. Several contain untracked or modified files that may represent real work.

7. If the unreachable commits matter, inspect and anchor them. Do not run aggressive garbage collection until that decision is made.

## Audit Command Log

Read-only commands used or summarized:

```text
rg -n relevant memory registry terms
git rev-parse --show-toplevel
git status --porcelain=v1 -b
git branch --show-current
git branch -vv --all
git remote -v
git worktree list --porcelain
git stash list
git log --oneline --decorate --graph -n 40
git diff --stat --find-renames
git diff --cached --stat --find-renames
git diff --name-status
git diff --cached --name-status
git diff --check
git diff --cached --check
git diff --name-only --diff-filter=U
git ls-files --others --exclude-standard
git ls-files --modified
git rev-list --left-right --count HEAD...@{u}
git rev-parse HEAD
git rev-parse @{u}
git rev-parse origin/main
git log --oneline main..HEAD
git log --oneline HEAD..main
git diff --stat main...HEAD
git merge-base --is-ancestor main HEAD
git ls-remote --symref origin HEAD
git ls-remote --heads origin
git config --get branch.codex/yentl-functional-samples-extension-handoff.remote
git config --get branch.codex/yentl-functional-samples-extension-handoff.merge
git for-each-ref refs/heads
git fsck --no-reflogs --unreachable --dangling
git reflog --date=iso -n 30
git tag --list --sort=-creatordate
git submodule status --recursive
gh auth status
gh repo view
gh pr view
gh pr list
gh pr checks
gh run list
rg relevant ignore/worktree patterns in config files
sed selected config files
find selected artifact/env/report paths
du selected artifact directories
```

One worktree status sweep was rerun after a local zsh scripting mistake: using the loop variable name `path` temporarily broke command lookup inside that shell loop. No repository state changed from that failed command, and the sweep was rerun successfully with a neutral loop variable.

## Bottom Line

The pushed branch and PR #5 are in good shape: synchronized, merge-clean, and green. The local latest worktree is not packaged: it contains a substantial uncommitted layer, a staged doc with one check warning, hundreds of untracked generated/work artifacts, and multiple dirty sibling worktrees. Nothing should be assumed lost, but several things are currently unanchored and would be easy to lose if someone cleaned, switched, or pruned casually.
