/**
 * Compute the split time for a boundary AFTER the word at `wordIndex`.
 *
 * Formula: splitTime = start + ((wordIndex + 1) / wordCount) * (end - start)
 *
 * @param text      - The full utterance text.
 * @param start     - Segment start time in seconds.
 * @param end       - Segment end time in seconds.
 * @param wordIndex - Zero-based index of the word after which the split occurs.
 * @returns The interpolated split timestamp in seconds.
 */
export function computeSplitTime(
  text: string,
  start: number,
  end: number,
  wordIndex: number,
): number {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  return start + ((wordIndex + 1) / wordCount) * (end - start);
}
