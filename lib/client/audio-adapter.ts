/**
 * audio-adapter.ts
 *
 * Wraps a native HTML5 <audio> element as a MediaAdapter.
 * Works for both audio_file (blob_url src) and media_url (direct URL src).
 *
 * - Creates an <audio controls> element inside the container.
 * - Listens to "timeupdate" events (~4 Hz natively).
 * - seekTo sets audio.currentTime directly.
 * - destroy removes the element and all listeners.
 */

import type { MediaAdapter, MediaAdapterOptions } from "@/lib/client/media-adapter";

export type CreateAudioAdapterOptions = Omit<MediaAdapterOptions, "container"> & {
  container: HTMLElement;
  src: string;
};

export async function createAudioAdapter(
  opts: CreateAudioAdapterOptions,
): Promise<MediaAdapter> {
  const { container, src, onTimeUpdate, onReady, onError } = opts;

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "metadata";
  audio.style.width = "100%";
  audio.src = src;

  function handleTimeUpdate() {
    onTimeUpdate(audio.currentTime);
  }

  function handleCanPlay() {
    onReady();
  }

  function handleError() {
    const msg = audio.error
      ? `Audio error: code ${audio.error.code}`
      : "Unknown audio error";
    onError?.(msg);
  }

  audio.addEventListener("timeupdate", handleTimeUpdate);
  audio.addEventListener("loadedmetadata", handleCanPlay);
  audio.addEventListener("canplay", handleCanPlay);
  audio.addEventListener("error", handleError);

  container.appendChild(audio);

  // If already ready (e.g., cached)
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    onReady();
  }

  return {
    seekTo(seconds: number) {
      audio.currentTime = seconds;
    },
    destroy() {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleCanPlay);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
      audio.remove();
    },
  };
}
