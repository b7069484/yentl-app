/**
 * MediaAdapter — uniform interface for all playable media sources.
 *
 * Each adapter wraps a concrete player (YouTube IFrame API, HTML5 <audio>)
 * and exposes two imperative operations: seekTo and destroy.
 */

export interface MediaAdapter {
  /** Seek the player to a specific time in seconds. */
  seekTo(seconds: number): void;
  /** Tear down: remove listeners, destroy player, clean up DOM. */
  destroy(): void;
}

export type MediaAdapterOptions = {
  container: HTMLElement;
  onTimeUpdate: (seconds: number) => void;
  onReady: () => void;
  onError?: (msg: string) => void;
};

export type MediaAdapterFactory = (opts: MediaAdapterOptions) => Promise<MediaAdapter>;
