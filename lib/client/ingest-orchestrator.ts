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
 */
export async function bulkIngest(segments: TranscriptSegment[]): Promise<void> {
  const state = useSession.getState();

  if (state.startedAt === null) {
    state.startSession();
  }

  for (const seg of segments) {
    useSession.getState().appendFinal(seg);
    await onFinalUtterance(seg);
  }

  await runSynthesisNow();
}
