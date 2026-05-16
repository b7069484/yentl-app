import type { TranscriptSegment } from "@/lib/types";

const MAX_GAP_SEC = 1.5;        // segments within this gap merge
const MIN_UTTERANCE_CHARS = 80; // small utterances keep merging
const MAX_UTTERANCE_CHARS = 360; // hard cap — flush when reached
const SENTENCE_TERMINATORS = /[.!?]\s*$/;

// Bracketed cues like [Music] [Applause] [Laughter] carry no factual content
const BRACKETED_CUE = /^\s*\[[^\]]*\]\s*$/;

/**
 * Merges consecutive caption-sized TranscriptSegments into utterance-sized
 * chunks suitable for /api/extract-claims. SRT-style captions are too
 * fragmented (~3s per line, often mid-sentence) for the claim extractor to
 * find anything; merging restores full-sentence context.
 *
 * Rules:
 *   - Same speaker_id (or both null) required to merge
 *   - Adjacent if time gap < MAX_GAP_SEC
 *   - Flush when the accumulated text exceeds MAX_UTTERANCE_CHARS, OR when
 *     it's already MIN_UTTERANCE_CHARS+ AND ends with a sentence terminator
 *   - Start = first fragment's start; end = last fragment's end; text joined
 *     with single space; the merged segment preserves is_final and speaker_id
 *   - Bracketed cues like [Music] are filtered out (no factual content)
 */
export function mergeIntoUtterances(segments: TranscriptSegment[]): TranscriptSegment[] {
  const result: TranscriptSegment[] = [];

  // Pending accumulator
  let pending: TranscriptSegment[] = [];

  function flush() {
    if (pending.length === 0) return;

    const first = pending[0];
    const last = pending[pending.length - 1];
    const text = pending.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();

    if (text.length > 0) {
      result.push({
        text,
        start: first.start,
        end: last.end,
        is_final: last.is_final,
        speaker_id: first.speaker_id,
      });
    }

    pending = [];
  }

  for (const seg of segments) {
    // Drop pure bracketed-cue segments (e.g. "[Music]", "[Applause]")
    if (BRACKETED_CUE.test(seg.text)) {
      continue;
    }

    if (pending.length === 0) {
      pending.push(seg);
      continue;
    }

    const last = pending[pending.length - 1];
    const currentText = pending.map((s) => s.text).join(" ").trim();

    // Flush if speaker changes
    const speakerMatch =
      seg.speaker_id === last.speaker_id ||
      (seg.speaker_id === null && last.speaker_id === null);
    if (!speakerMatch) {
      flush();
      pending.push(seg);
      continue;
    }

    // Flush if time gap is too large
    const gap = seg.start - last.end;
    if (gap >= MAX_GAP_SEC) {
      flush();
      pending.push(seg);
      continue;
    }

    // Flush if hard cap would be exceeded
    const wouldBe = (currentText + " " + seg.text).trim();
    if (wouldBe.length > MAX_UTTERANCE_CHARS) {
      flush();
      pending.push(seg);
      continue;
    }

    // Add to pending
    pending.push(seg);

    // Flush if MIN chars reached AND ends with sentence terminator
    const newText = pending.map((s) => s.text).join(" ").trim();
    if (newText.length >= MIN_UTTERANCE_CHARS && SENTENCE_TERMINATORS.test(newText)) {
      flush();
    }
  }

  flush();
  return result;
}
