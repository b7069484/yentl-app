"use client";

import { useSession } from "@/lib/client/session-store";
import { onFinalUtterance, runSynthesisNow } from "@/lib/client/orchestrator";
import type { TranscriptSegment } from "@/lib/types";

/**
 * Bulk-ingests a list of pre-parsed TranscriptSegments into the pipeline.
 *
 * - Starts a session if one is not already active.
 * - Appends each segment to the store and pipes it through onFinalUtterance
 *   (sequential, so claims/markers populate in document order).
 * - Fires runSynthesisNow() once after the loop completes.
 * - Deliberately does NOT call endSession() — the user ends the session
 *   manually from the header controls.
 * - Accepts an optional AbortSignal; if aborted mid-loop the remaining
 *   segments are skipped and runSynthesisNow is NOT called.
 */
export async function bulkIngest(
  segments: TranscriptSegment[],
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const state = useSession.getState();

  if (state.startedAt === null) {
    state.startSession();
  }

  for (const seg of segments) {
    if (opts?.signal?.aborted) return;
    useSession.getState().appendFinal(seg);
    await onFinalUtterance(seg);
  }

  if (opts?.signal?.aborted) return;

  await runSynthesisNow();
}
