"use client";

import { upload } from "@vercel/blob/client";
import {
  sourceAnalysisConsentHeaders,
  sourceAnalysisConsentPayload,
} from "@/lib/source-consent";
import { apiErrorMessage } from "@/lib/client/api-errors";
import type { TranscriptSegment, Speaker } from "@/lib/types";

/**
 * Files >= this threshold are uploaded client-direct to Vercel Blob
 * (bypassing the 4.5 MB serverless function body limit on Vercel Pro).
 * Files below this threshold use the existing multipart server path
 * (no BLOB_READ_WRITE_TOKEN required — friendlier for local dev).
 */
export const BLOB_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024; // 4 MB

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
 * Transcribes an audio file via Deepgram using the appropriate upload path:
 *
 * - Files < 4 MB  → multipart POST to /api/transcribe-batch (no token needed,
 *                    works in local dev without BLOB_READ_WRITE_TOKEN)
 * - Files >= 4 MB → client-direct upload to Vercel Blob via /api/upload-audio,
 *                    then JSON POST to /api/transcribe-batch with { blob_url }.
 *                    This bypasses Vercel's 4.5 MB function-body limit.
 *
 * The caller should create a blob: URL from URL.createObjectURL(file) for
 * in-app audio playback before calling this function.
 *
 * @param onUploadProgress  Optional callback receiving 0-100 progress during
 *                          the Blob upload phase (large files only).
 */
export async function transcribeAudioFile(
  file: File,
  durationSec: number,
  signal?: AbortSignal,
  onUploadProgress?: (pct: number) => void,
): Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }> {
  if (file.size >= BLOB_UPLOAD_THRESHOLD_BYTES) {
    return transcribeViaBlob(file, durationSec, signal, onUploadProgress);
  }
  return transcribeViaMultipart(file, durationSec, signal);
}

// ─── Internal: multipart path (small files) ───────────────────────────────────

async function transcribeViaMultipart(
  file: File,
  durationSec: number,
  signal?: AbortSignal,
): Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("duration_sec", String(durationSec));

  const res = await fetch("/api/transcribe-batch", {
    method: "POST",
    headers: sourceAnalysisConsentHeaders(),
    body: formData,
    signal,
  });

  return parseTranscribeResponse(res);
}

// ─── Internal: Vercel Blob path (large files) ─────────────────────────────────

async function transcribeViaBlob(
  file: File,
  durationSec: number,
  signal?: AbortSignal,
  onUploadProgress?: (pct: number) => void,
): Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }> {
  // 1 — Upload directly to Vercel Blob (no function body limit)
  const blobResult = await upload(file.name, file, {
    access: "private",
    handleUploadUrl: "/api/upload-audio",
    headers: sourceAnalysisConsentHeaders(),
    clientPayload: sourceAnalysisConsentPayload(),
    abortSignal: signal,
    ...(onUploadProgress
      ? {
          onUploadProgress: (event) => {
            const pct = Math.round((event.loaded / event.total) * 100);
            onUploadProgress(pct);
          },
        }
      : {}),
  });

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // 2 — Call transcribe-batch with the blob URL (JSON branch)
  const res = await fetch("/api/transcribe-batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sourceAnalysisConsentHeaders(),
    },
    body: JSON.stringify({ blob_url: blobResult.url, duration_sec: durationSec }),
    signal,
  });

  return parseTranscribeResponse(res);
}

// ─── Shared response parser ───────────────────────────────────────────────────

async function parseTranscribeResponse(
  res: Response,
): Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }> {
  if (!res.ok) {
    throw new Error(await apiErrorMessage(res, `Transcription failed (${res.status})`));
  }
  return res.json() as Promise<{ utterances: TranscriptSegment[]; speakers: Speaker[] }>;
}
