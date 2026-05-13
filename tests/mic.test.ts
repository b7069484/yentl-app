import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("startMic — constraint mapping", () => {
  const getUserMediaMock = vi.fn();
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    getUserMediaMock.mockReset();
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
    // jsdom doesn't ship mediaDevices — install a minimal shim
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: { getUserMedia: getUserMediaMock },
      },
    });
    // MediaRecorder shim
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = class {
      static isTypeSupported() { return true; }
      ondataavailable: ((e: unknown) => void) | null = null;
      start() {}
      stop() {}
    };
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  });

  it("defaults to echoCancellation/noiseSuppression/autoGainControl ALL ON", async () => {
    const { startMic } = await import("@/lib/client/mic");
    await startMic(() => {});
    expect(getUserMediaMock).toHaveBeenCalledWith({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  });

  it("speakersMode=true flips all three flags OFF", async () => {
    const { startMic } = await import("@/lib/client/mic");
    await startMic(() => {}, { speakersMode: true });
    expect(getUserMediaMock).toHaveBeenCalledWith({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  });
});
