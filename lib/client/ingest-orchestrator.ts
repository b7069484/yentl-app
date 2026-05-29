"use client";

import { useSession } from "@/lib/client/session-store";
import { attachAudioFeatures, onFinalUtterance, runSynthesisNow } from "@/lib/client/orchestrator";
import { mergeIntoUtterances } from "@/lib/client/utterance-merge";
import type { TranscriptSegment } from "@/lib/types";

const ANALYSIS_CONCURRENCY = 4;
const SYNTHESIS_BATCH_DELAY_MS = 4000;

/**
 * Bulk-ingests a list of pre-parsed TranscriptSegments into the pipeline.
 *
 * - Starts a session if one is not already active.
 * - Appends ALL segments to the store synchronously so the transcript is
 *   fully present immediately — this lets the Watch view render the player
 *   right away while analysis is still in flight.
 * - Schedules claim/marker extraction in the background with a small
 *   concurrency cap (so we don't slam the API) and resolves the returned
 *   promise as soon as the dispatch loop finishes, not when every API call
 *   completes. Claims will appear in the store as their fetches return —
 *   which is exactly what the Watch view's playhead-revealed UI wants.
 * - Schedules a single runSynthesisNow() shortly after dispatch so the
 *   synthesis card has something to render once enough claims land.
 * - Accepts an optional AbortSignal; if aborted, the dispatch loop stops
 *   and runSynthesisNow is not scheduled.
 */
export async function bulkIngest(
  segments: TranscriptSegment[],
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const state = useSession.getState();

  if (state.startedAt === null) {
    state.startSession();
  }

  // 1. Append every segment synchronously so the transcript is fully
  //    present before we yield. Watch view and Transcript view both see
  //    the full timeline immediately.
  for (const seg of segments) {
    if (opts?.signal?.aborted) return;
    attachAudioFeatures(seg);
    useSession.getState().appendFinal(seg);
  }

  if (opts?.signal?.aborted) return;

  // 2. Merge fine-grained caption fragments into utterance-sized chunks for
  //    analysis. The transcript already holds the fine-grained segments (for
  //    karaoke display); we only send merged utterances to the extractor so
  //    it has full-sentence context to work with.
  const analysisUtterances = mergeIntoUtterances(segments);

  // 3. Fire analysis in the background with a small concurrency cap so
  //    the Anthropic endpoint isn't slammed. We don't await completion —
  //    the caller (ingest pane) wants to redirect to Watch immediately;
  //    claims will populate as each /api/extract-claims call resolves.
  void runAnalysisInBackground(analysisUtterances, opts?.signal);

  // 4. Schedule the first synthesis pass after a brief delay so it has
  //    a few claims to work with. Subsequent synthesis runs are paced by
  //    the orchestrator naturally.
  scheduleSynthesis(opts?.signal);
}

async function runAnalysisInBackground(
  segments: TranscriptSegment[],
  signal: AbortSignal | undefined,
): Promise<void> {
  let index = 0;

  async function worker(): Promise<void> {
    while (true) {
      if (signal?.aborted) return;
      const i = index++;
      if (i >= segments.length) return;
      try {
        await onFinalUtterance(segments[i]);
      } catch (e) {
        // Individual extraction failures shouldn't abort the whole batch
        console.warn("bulkIngest: onFinalUtterance failed for segment", i, e);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(ANALYSIS_CONCURRENCY, segments.length) },
    () => worker(),
  );
  await Promise.all(workers);
}

function scheduleSynthesis(signal: AbortSignal | undefined): void {
  setTimeout(() => {
    if (signal?.aborted) return;
    void runSynthesisNow();
  }, SYNTHESIS_BATCH_DELAY_MS);
}
