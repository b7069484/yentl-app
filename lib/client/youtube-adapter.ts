/**
 * youtube-adapter.ts
 *
 * Wraps the YouTube IFrame Player API as a MediaAdapter.
 *
 * - Lazy-loads the YT IFrame API script exactly once (singleton promise).
 * - Polls getCurrentTime() every 250 ms while playing; stops on pause/end.
 * - Exposes seekTo / destroy.
 */

import type { MediaAdapter, MediaAdapterOptions } from "@/lib/client/media-adapter";

// ── Global YT type augmentation ──────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement | string, opts: YTPlayerOptions) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerOptions {
  height: string;
  width: string;
  videoId: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTPlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

// ── Singleton API loader ─────────────────────────────────────────────────────

let apiPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve) => {
    // If already loaded (e.g. test environment injected window.YT directly)
    if (typeof window !== "undefined" && window.YT && window.YT.Player) {
      resolve();
      return;
    }

    // Store any existing ready callback so we don't stomp it.
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    // Inject the script tag exactly once.
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export type CreateYouTubeAdapterOptions = Omit<MediaAdapterOptions, "container"> & {
  container: HTMLElement;
  videoId: string;
};

export async function createYouTubeAdapter(
  opts: CreateYouTubeAdapterOptions,
): Promise<MediaAdapter> {
  const { container, videoId, onTimeUpdate, onReady, onError } = opts;
  const origin = window.location.origin;
  const widgetReferrer = window.location.href;

  await loadYTApi();

  return new Promise<MediaAdapter>((resolve, reject) => {
    let player: YTPlayer | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        if (player) {
          onTimeUpdate(player.getCurrentTime());
        }
      }, 250);
    }

    function stopPolling() {
      if (pollInterval !== null) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }

    // Create a div inside the container for YT.Player to attach to.
    const mountEl = document.createElement("div");
    container.appendChild(mountEl);

    try {
      player = new window.YT.Player(mountEl, {
        height: "100%",
        width: "100%",
        videoId,
        playerVars: {
          origin,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          widget_referrer: widgetReferrer,
        },
        events: {
          onReady() {
            onReady();
            resolve({
              seekTo(seconds: number) {
                player?.seekTo(seconds, true);
              },
              destroy() {
                stopPolling();
                player?.destroy();
                player = null;
                mountEl.remove();
              },
            });
          },
          onStateChange(event: { data: number }) {
            const { PlayerState } = window.YT;
            if (event.data === PlayerState.PLAYING) {
              startPolling();
            } else {
              stopPolling();
            }
          },
          onError(event: { data: number }) {
            const msg = `YouTube player error: code ${event.data}`;
            onError?.(msg);
            reject(new Error(msg));
          },
        },
      });
    } catch (e) {
      reject(e);
    }
  });
}
