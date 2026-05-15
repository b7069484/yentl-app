"use client";

import { upload } from "@vercel/blob/client";

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
 * Uploads a File to Vercel Blob via the client-direct upload flow.
 * The server-side token is fetched from /api/upload-audio.
 */
export async function uploadToBlob(file: File): Promise<{ url: string }> {
  const result = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload-audio",
    contentType: file.type,
  });
  return { url: result.url };
}
