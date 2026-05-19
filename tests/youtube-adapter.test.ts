import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Flush the microtask queue so Promise chains triggered by `await loadYTApi()`
 *  have a chance to call `new YT.Player(...)` before we inspect capturedEvents.
 *  Uses Promise.resolve() chaining which works even when fake timers are active,
 *  because fake timers don't intercept microtasks. */
async function flushMicrotasks(): Promise<void> {
  // Multiple rounds ensure deeply chained promises settle
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function makeMockPlayer() {
  return {
    getCurrentTime: vi.fn(() => 0),
    seekTo: vi.fn(),
    destroy: vi.fn(),
  };
}

// Captured events from the last YT.Player constructor call
let capturedEvents: {
  onReady?: (e: { target: unknown }) => void;
  onStateChange?: (e: { data: number }) => void;
  onError?: (e: { data: number }) => void;
} = {};

let mockPlayer: ReturnType<typeof makeMockPlayer>;
let playerCtorCallCount = 0;
let lastPlayerCtorArgs: [HTMLElement, unknown] | null = null;

const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_ENDED = 0;

function installYTGlobal() {
  mockPlayer = makeMockPlayer();
  playerCtorCallCount = 0;
  lastPlayerCtorArgs = null;
  capturedEvents = {};

  // Must be a real function (not vi.fn()) because `new YT.Player(...)` requires a constructor.
  function PlayerCtor(
    this: unknown,
    el: HTMLElement,
    opts: { events?: typeof capturedEvents },
  ) {
    capturedEvents = opts.events ?? {};
    playerCtorCallCount += 1;
    lastPlayerCtorArgs = [el, opts];
    return mockPlayer;
  }

  // @ts-expect-error – deliberately stomping window.YT in tests
  globalThis.YT = {
    Player: PlayerCtor,
    PlayerState: {
      PLAYING: YT_PLAYING,
      PAUSED: YT_PAUSED,
      ENDED: YT_ENDED,
      BUFFERING: 3,
      CUED: 5,
    },
  };

  // Ensure the "already loaded" path is taken (no script injection).
  // @ts-expect-error -- assigning a global YT iframe API callback TS doesn't model
  globalThis.onYouTubeIframeAPIReady = undefined;
}

// ── Script injection tests ────────────────────────────────────────────────────

describe("createYouTubeAdapter — script injection", () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
    installYTGlobal();
  });

  it("does NOT inject a script tag when window.YT is already present", async () => {
    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const container = document.createElement("div");
    const p = createYouTubeAdapter({
      container,
      videoId: "abc123",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    // Allow microtasks to propagate so PlayerCtor gets called
    await flushMicrotasks();
    // Resolve the adapter promise
    capturedEvents.onReady?.({ target: mockPlayer });
    await p;

    const scriptTags = document.querySelectorAll('script[src*="youtube.com/iframe_api"]');
    expect(scriptTags.length).toBe(0);
  });

  it("injects a script tag when window.YT is NOT present", async () => {
    // @ts-expect-error -- deleting the YT global to simulate the un-loaded state
    delete globalThis.YT;

    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const container = document.createElement("div");
    // Don't await — just trigger the call, then check immediately
    void createYouTubeAdapter({
      container,
      videoId: "abc123",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    await flushMicrotasks();

    const scriptTags = document.querySelectorAll('script[src*="youtube.com/iframe_api"]');
    expect(scriptTags.length).toBe(1);
  });

  it("only injects one script tag on multiple parallel calls", async () => {
    // @ts-expect-error -- deleting the YT global to simulate the un-loaded state
    delete globalThis.YT;

    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const c1 = document.createElement("div");
    const c2 = document.createElement("div");
    void createYouTubeAdapter({ container: c1, videoId: "v1", onTimeUpdate: vi.fn(), onReady: vi.fn() });
    void createYouTubeAdapter({ container: c2, videoId: "v2", onTimeUpdate: vi.fn(), onReady: vi.fn() });

    await flushMicrotasks();

    const scriptTags = document.querySelectorAll('script[src*="youtube.com/iframe_api"]');
    expect(scriptTags.length).toBe(1);
  });
});

// ── Player creation tests ─────────────────────────────────────────────────────

describe("createYouTubeAdapter — player creation", () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
    installYTGlobal();
  });

  it("creates a YT.Player with the right videoId and playerVars", async () => {
    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const container = document.createElement("div");
    const p = createYouTubeAdapter({
      container,
      videoId: "testVideoId",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    await flushMicrotasks();
    capturedEvents.onReady?.({ target: mockPlayer });
    await p;

    expect(playerCtorCallCount).toBe(1);
    const [el, opts] = lastPlayerCtorArgs!;
    expect(el).toBeInstanceOf(HTMLElement);
    expect((opts as { videoId: string }).videoId).toBe("testVideoId");
    expect((opts as { playerVars: Record<string, number> }).playerVars).toMatchObject({
      playsinline: 1,
      rel: 0,
    });
  });

  it("calls onReady when the YT.Player fires onReady", async () => {
    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const onReady = vi.fn();
    const container = document.createElement("div");
    const p = createYouTubeAdapter({
      container,
      videoId: "abc",
      onTimeUpdate: vi.fn(),
      onReady,
    });

    await flushMicrotasks();
    capturedEvents.onReady?.({ target: mockPlayer });
    await p;

    expect(onReady).toHaveBeenCalledOnce();
  });
});

// ── Polling & callbacks tests ─────────────────────────────────────────────────

describe("createYouTubeAdapter — polling & callbacks", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.head.innerHTML = "";
    installYTGlobal();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onTimeUpdate when PLAYING and interval fires", async () => {
    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const onTimeUpdate = vi.fn();
    const container = document.createElement("div");
    mockPlayer.getCurrentTime.mockReturnValue(42);

    const p = createYouTubeAdapter({
      container,
      videoId: "abc",
      onTimeUpdate,
      onReady: vi.fn(),
    });

    // Flush the loadYTApi promise chain with fake timers active
    await flushMicrotasks();
    capturedEvents.onReady?.({ target: mockPlayer });
    const adapter = await p;

    // Simulate PLAYING state change
    capturedEvents.onStateChange?.({ data: YT_PLAYING });

    // Advance fake timer by 250ms to trigger the polling interval
    vi.advanceTimersByTime(250);

    expect(onTimeUpdate).toHaveBeenCalledWith(42);

    adapter.destroy();
  });

  it("stops polling when PAUSED", async () => {
    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const onTimeUpdate = vi.fn();
    const container = document.createElement("div");
    mockPlayer.getCurrentTime.mockReturnValue(10);

    const p = createYouTubeAdapter({
      container,
      videoId: "abc",
      onTimeUpdate,
      onReady: vi.fn(),
    });

    await flushMicrotasks();
    capturedEvents.onReady?.({ target: mockPlayer });
    const adapter = await p;

    // Start playing
    capturedEvents.onStateChange?.({ data: YT_PLAYING });
    vi.advanceTimersByTime(250);
    expect(onTimeUpdate).toHaveBeenCalledTimes(1);

    // Pause
    capturedEvents.onStateChange?.({ data: YT_PAUSED });
    vi.advanceTimersByTime(500);
    // Should NOT have been called again
    expect(onTimeUpdate).toHaveBeenCalledTimes(1);

    adapter.destroy();
  });
});

// ── seekTo and destroy tests ──────────────────────────────────────────────────

describe("createYouTubeAdapter — seekTo and destroy", () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
    installYTGlobal();
  });

  it("seekTo proxies to player.seekTo with allowSeekAhead=true", async () => {
    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const container = document.createElement("div");
    const p = createYouTubeAdapter({
      container,
      videoId: "abc",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    await flushMicrotasks();
    capturedEvents.onReady?.({ target: mockPlayer });
    const adapter = await p;

    adapter.seekTo(99);
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(99, true);
  });

  it("destroy calls player.destroy", async () => {
    const { createYouTubeAdapter } = await import("@/lib/client/youtube-adapter");

    const container = document.createElement("div");
    const p = createYouTubeAdapter({
      container,
      videoId: "abc",
      onTimeUpdate: vi.fn(),
      onReady: vi.fn(),
    });

    await flushMicrotasks();
    capturedEvents.onReady?.({ target: mockPlayer });
    const adapter = await p;

    adapter.destroy();
    expect(mockPlayer.destroy).toHaveBeenCalledOnce();
  });
});
