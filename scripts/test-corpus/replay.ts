/**
 * Phase B — fact-check + rhetoric pipeline replay.
 *
 * Status: STUB. The production endpoints don't exist yet
 * (Tasks 12-21 in docs/superpowers/plans/2026-05-11-factify-v1.md).
 *
 * When the endpoints land, this script will:
 *   1. Read each transcript from test-corpus/transcripts/<id>.json
 *   2. Walk its final utterances in chronological order
 *   3. For each utterance, POST to /api/extract-claims
 *   4. For each claim returned, POST to /api/verify-provisional + /api/verify-confirmed in parallel
 *   5. Every 5 utterances (or 30s of audio time), POST a window to /api/analyze-rhetoric
 *   6. Collect cards + markers into scores/<id>.replay.json
 *   7. (Optional) feed the collected output into a judgment scorer per rubric.md
 *
 * This script intentionally mirrors lib/client/orchestrator.ts (Task 16) so the
 * harness exercises the same code path the live UI does.
 */

console.log("replay.ts is a stub — see docstring at top.");
console.log("The fact-check endpoints (Tasks 12-21) need to land first.");
console.log("Once they do, this is where the corpus becomes a real acceptance test.");
process.exit(0);
