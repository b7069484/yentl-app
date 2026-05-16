"use client";

import type { TranscriptSegment, Speaker } from "@/lib/types";

/**
 * Probes an audio file's duration in seconds using an HTMLAudioElement.
 * Returns 0 on failure (e.g. in non-browser environments).
 */
export function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const dur = isFinite(audio.duration) ? audio.duration : 0;
        audio.src = "";
        audio.load();
        resolve(dur);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audio.src = "";
        audio.load();
        resolve(0);
      };
      audio.src = url;
    } catch {
      resolve(0);
    }
  });
}

/**
 * Estimates the Deepgram nova-3 prerecorded transcription cost for a given duration.
 * Rate: $0.0043 per minute.
 */
export function estimateDeepgramCost(durationSec: number): {
  dollars: number;
  display: string;
} {
  const dollars = (durationSec / 60) * 0.0043;
  const display = `$${dollars.toFixed(2)}`;
  return { dollars, display };
}

/**
 * Formats a duration in seconds to h:mm:ss (or m:ss if under 1 hour).
 */
export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

/**
 * Formats a byte count into a human-readable string (KB / MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Uploads a File directly to the server and transcribes it via Deepgram.
 * The server route accepts multipart/form-data and streams the buffer into
 * Deepgram's transcribeFile API — no external storage (Vercel Blob) required.
 *
 * The caller should create a blob: URL from URL.createObjectURL(file) for
 * in-app audio playback before calling this function.
 */
export async function transcribeAudioFile(
  file: File,
  durationSec: number,
  signal?: AbortSignal,
): Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("duration_sec", String(durationSec));

  const res = await fetch("/api/transcribe-batch", {
    method: "POST",
    body: formData,
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      (errBody as { error?: string }).error ?? `Transcription failed (${res.status})`,
    );
  }

  return res.json() as Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }>;
}

/**
 * @deprecated Use transcribeAudioFile instead.
 * Kept for back-compat. Will be removed once all callers are migrated.
 */
export async function uploadToBlob(_file: File): Promise<{ url: string }> {
  throw new Error(
    "uploadToBlob is no longer supported. Use transcribeAudioFile instead. " +
      "Vercel Blob client-direct upload requires BLOB_READ_WRITE_TOKEN which is not required for local dev.",
  );
}
