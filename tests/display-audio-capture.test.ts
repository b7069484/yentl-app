import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeTrack = {
  kind: "audio" | "video";
  stop: ReturnType<typeof vi.fn>;
};

class FakeMediaStream {
  tracks: FakeTrack[];

  constructor(tracks: FakeTrack[] = []) {
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio");
  }
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported = vi.fn(() => true);

  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  startedWith: number | null = null;

  constructor(
    public stream: FakeMediaStream,
    public options?: MediaRecorderOptions,
  ) {
    FakeMediaRecorder.instances.push(this);
  }

  start(ms: number) {
    this.state = "recording";
    this.startedWith = ms;
  }

  stop() {
    this.state = "inactive";
  }

  emit(chunk: Blob) {
    this.ondataavailable?.({ data: chunk });
  }
}

describe("startDisplayAudioCapture", () => {
  const getDisplayMediaMock = vi.fn();
  const originalNavigator = globalThis.navigator;
  const originalMediaStream = globalThis.MediaStream;
  const originalMediaRecorder = globalThis.MediaRecorder;

  beforeEach(() => {
    vi.resetModules();
    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.isTypeSupported.mockReturnValue(true);
    getDisplayMediaMock.mockReset();
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: { getDisplayMedia: getDisplayMediaMock },
      },
    });
    vi.stubGlobal("MediaStream", FakeMediaStream);
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    vi.stubGlobal("MediaStream", originalMediaStream);
    vi.stubGlobal("MediaRecorder", originalMediaRecorder);
  });

  it("asks Chrome for display capture with audio-sharing hints", async () => {
    const audio = { kind: "audio", stop: vi.fn() } satisfies FakeTrack;
    const video = { kind: "video", stop: vi.fn() } satisfies FakeTrack;
    getDisplayMediaMock.mockResolvedValue(new FakeMediaStream([audio, video]));

    const { startDisplayAudioCapture } = await import("@/lib/client/display-audio-capture");
    await startDisplayAudioCapture(() => {});

    expect(getDisplayMediaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        video: true,
        audio: expect.objectContaining({
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }),
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "include",
        systemAudio: "include",
      }),
    );
    expect(FakeMediaRecorder.instances[0]?.stream.getAudioTracks()).toEqual([audio]);
    expect(FakeMediaRecorder.instances[0]?.startedWith).toBe(250);
  });

  it("fails clearly when the user shares a surface without audio", async () => {
    const video = { kind: "video", stop: vi.fn() } satisfies FakeTrack;
    getDisplayMediaMock.mockResolvedValue(new FakeMediaStream([video]));

    const { startDisplayAudioCapture } = await import("@/lib/client/display-audio-capture");

    await expect(startDisplayAudioCapture(() => {})).rejects.toMatchObject({
      code: "NO_AUDIO",
    });
    expect(video.stop).toHaveBeenCalledTimes(1);
  });

  it("forwards MediaRecorder chunks and stops every shared track once", async () => {
    const audio = { kind: "audio", stop: vi.fn() } satisfies FakeTrack;
    const video = { kind: "video", stop: vi.fn() } satisfies FakeTrack;
    getDisplayMediaMock.mockResolvedValue(new FakeMediaStream([audio, video]));
    const onChunk = vi.fn();

    const { startDisplayAudioCapture } = await import("@/lib/client/display-audio-capture");
    const handle = await startDisplayAudioCapture(onChunk);
    const chunk = new Blob(["voice"]);

    FakeMediaRecorder.instances[0]?.emit(chunk);
    handle.stop();

    expect(onChunk).toHaveBeenCalledWith(chunk);
    expect(audio.stop).toHaveBeenCalledTimes(1);
    expect(video.stop).toHaveBeenCalledTimes(1);
  });
});
