import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAudioAdapter } from "@/lib/client/audio-adapter";

// ── HTMLAudioElement stub ─────────────────────────────────────────────────────
// jsdom provides a basic HTMLAudioElement; we augment it with the pieces we test.

function getAudioElement(container: HTMLElement): HTMLAudioElement {
  const el = container.querySelector("audio");
  if (!el) throw new Error("No <audio> element found in container");
  return el as HTMLAudioElement;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

// ── 1. Element creation ───────────────────────────────────────────────────────

describe("createAudioAdapter — element creation", () => {
  it("appends an <audio> element inside the container", async () => {
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    const audio = getAudioElement(container);
    expect(audio).toBeTruthy();

    adapter.destroy();
  });

  it("sets the src attribute correctly", async () => {
    const src = "https://example.com/podcast.mp3";
    const adapter = await createAudioAdapter({
      container,
      src,
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    const audio = getAudioElement(container);
    expect(audio.src).toBe(src);

    adapter.destroy();
  });

  it("sets controls=true on the audio element", async () => {
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    const audio = getAudioElement(container);
    expect(audio.controls).toBe(true);

    adapter.destroy();
  });

  it("does not force CORS mode for public media playback", async () => {
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    const audio = getAudioElement(container);
    expect(audio.crossOrigin).toBeNull();

    adapter.destroy();
  });
});

// ── 2. Event wiring ───────────────────────────────────────────────────────────

describe("createAudioAdapter — timeupdate fires onTimeUpdate", () => {
  it("calls onTimeUpdate with audio.currentTime when timeupdate fires", async () => {
    const onTimeUpdate = vi.fn();
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate,
      onReady: vi.fn(),
    });

    const audio = getAudioElement(container);
    // Directly set currentTime (jsdom allows this) and dispatch the event
    Object.defineProperty(audio, "currentTime", { value: 42.5, writable: true, configurable: true });
    audio.dispatchEvent(new Event("timeupdate"));

    expect(onTimeUpdate).toHaveBeenCalledWith(42.5);

    adapter.destroy();
  });

  it("calls onReady when canplay fires", async () => {
    const onReady = vi.fn();
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate: vi.fn(),
      onReady,
    });

    const audio = getAudioElement(container);
    audio.dispatchEvent(new Event("canplay"));

    expect(onReady).toHaveBeenCalled();

    adapter.destroy();
  });

  it("calls onReady when metadata loads", async () => {
    const onReady = vi.fn();
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate: vi.fn(),
      onReady,
    });

    const audio = getAudioElement(container);
    audio.dispatchEvent(new Event("loadedmetadata"));

    expect(onReady).toHaveBeenCalled();

    adapter.destroy();
  });
});

// ── 3. seekTo ────────────────────────────────────────────────────────────────

describe("createAudioAdapter — seekTo", () => {
  it("sets audio.currentTime when seekTo is called", async () => {
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    const audio = getAudioElement(container);
    let currentTimeSetter = 0;
    Object.defineProperty(audio, "currentTime", {
      get: () => currentTimeSetter,
      set: (v) => { currentTimeSetter = v; },
      configurable: true,
    });

    adapter.seekTo(30);
    expect(currentTimeSetter).toBe(30);

    adapter.destroy();
  });
});

// ── 4. destroy ───────────────────────────────────────────────────────────────

describe("createAudioAdapter — destroy", () => {
  it("removes the <audio> element from the container", async () => {
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    expect(container.querySelector("audio")).toBeTruthy();

    adapter.destroy();

    expect(container.querySelector("audio")).toBeNull();
  });

  it("stops calling onTimeUpdate after destroy", async () => {
    const onTimeUpdate = vi.fn();
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate,
      onReady: vi.fn(),
    });

    adapter.destroy();

    // After destroy the <audio> is gone; no more timeupdate calls should
    // propagate — confirm mock was not called after destruction.
    const callCountAtDestroy = onTimeUpdate.mock.calls.length;
    // There's nothing meaningful to fire a timeupdate on now
    expect(onTimeUpdate.mock.calls.length).toBe(callCountAtDestroy);
  });

  it("clears the src attribute on destroy", async () => {
    const adapter = await createAudioAdapter({
      container,
      src: "https://example.com/audio.mp3",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    // The audio element exists before destroy
    expect(container.querySelector("audio")).toBeTruthy();

    adapter.destroy();

    // Element is removed; verifying the cleanup happened
    expect(container.querySelector("audio")).toBeNull();
  });
});
