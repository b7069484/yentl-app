import { readFileSync } from "node:fs";
import { join } from "node:path";
import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type OffscreenListener = (
  message: unknown,
  sender?: unknown,
  sendResponse?: (response: unknown) => void,
) => boolean;

type ChromeRuntimeMessage = {
  target?: string;
  type?: string;
  payload?: {
    phase?: string;
    message?: string;
  };
};

class FakeAudioContext {
  destination = {};
  sourceNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  createMediaStreamSource = vi.fn(() => this.sourceNode);
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
}

class FakeMediaRecorder {
  static isTypeSupported = vi.fn(() => true);

  static instances: FakeMediaRecorder[] = [];

  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onerror: ((event: { error?: Error }) => void) | null = null;
  state = "inactive";
  startedWith: number | null = null;

  constructor() {
    FakeMediaRecorder.instances.push(this);
  }

  start(ms: number) {
    this.state = "recording";
    this.startedWith = ms;
  }

  stop() {
    this.state = "inactive";
  }

  emitChunk(bytes = [1, 2, 3]) {
    this.ondataavailable?.({
      data: new Blob([new Uint8Array(bytes)], { type: "audio/webm" }),
    });
  }
}

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  readyState = FakeWebSocket.CONNECTING;
  sent: unknown[] = [];

  constructor() {
    FakeWebSocket.instances.push(this);
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

function installHarness() {
  let listener: OffscreenListener | null = null;
  let resolveFetch: ((value: unknown) => void) | null = null;
  const messages: ChromeRuntimeMessage[] = [];
  const mediaStream = {
    getTracks: () => [{
      enabled: true,
      id: "track-1",
      kind: "audio",
      label: "Tab audio",
      muted: false,
      readyState: "live",
      stop: vi.fn(),
    }],
  };
  const getUserMedia = vi.fn().mockResolvedValue(mediaStream);
  const fetchMock = vi.fn(() => new Promise((resolve) => {
    resolveFetch = resolve;
  }));

  vi.stubGlobal("chrome", {
    runtime: {
      onMessage: {
        addListener: vi.fn((callback: OffscreenListener) => {
          listener = callback;
        }),
      },
      sendMessage: vi.fn((message: ChromeRuntimeMessage) => {
        messages.push(message);
        return Promise.resolve({});
      }),
    },
  });

  Object.defineProperty(window.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: FakeAudioContext,
  });

  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("WebSocket", FakeWebSocket);
  vi.stubGlobal("fetch", fetchMock);

  const source = readFileSync(join(process.cwd(), "extension/offscreen.js"), "utf8");
  Function(source)();

  if (!listener) throw new Error("offscreen listener was not installed");

  const startCapture = () => {
    listener?.({
      target: "offscreen",
      type: "start-capture",
      streamId: "stream-1",
      appOrigin: "http://localhost:3000",
      sessionId: "session-1",
    });
  };

  const diagnostics = () =>
    new Promise((resolve) => {
      listener?.({
        target: "offscreen",
        type: "diagnostics-request",
      }, {}, resolve);
    });

  const resolveToken = () => {
    resolveFetch?.({
      ok: true,
      json: async () => ({
        key: "deepgram-test-token",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    });
  };

  return {
    fetchMock,
    getUserMedia,
    messages,
    diagnostics,
    resolveToken,
    startCapture,
  };
}

afterEach(() => {
  FakeMediaRecorder.instances = [];
  FakeWebSocket.instances = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("extension offscreen capture", () => {
  it("starts recording tab audio before the Deepgram token request resolves", async () => {
    const harness = installHarness();

    harness.startCapture();

    await waitFor(() => {
      expect(FakeMediaRecorder.instances).toHaveLength(1);
    });

    expect(harness.fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/deepgram/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-yentl-source-consent": "source-analysis-v1",
        }),
      }),
    );
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(FakeMediaRecorder.instances[0]?.startedWith).toBe(250);
    expect(harness.messages).toContainEqual(
      expect.objectContaining({
        type: "capture-status",
        payload: expect.objectContaining({
          phase: "capturing",
          message: expect.stringContaining("Capturing tab audio now"),
        }),
      }),
    );
  });

  it("buffers early media chunks and flushes them after the Deepgram socket opens", async () => {
    const harness = installHarness();

    harness.startCapture();

    await waitFor(() => {
      expect(FakeMediaRecorder.instances).toHaveLength(1);
    });

    FakeMediaRecorder.instances[0]?.emitChunk([7, 8, 9]);
    harness.resolveToken();

    await waitFor(() => {
      expect(FakeWebSocket.instances).toHaveLength(1);
    });

    expect(FakeWebSocket.instances[0]?.sent).toHaveLength(0);
    FakeWebSocket.instances[0]?.open();

    await waitFor(() => {
      expect(FakeWebSocket.instances[0]?.sent).toHaveLength(1);
    });

    expect(FakeWebSocket.instances[0]?.sent[0]).toBeInstanceOf(ArrayBuffer);
    expect(harness.messages).toContainEqual(
      expect.objectContaining({
        type: "capture-status",
        payload: expect.objectContaining({
          phase: "capturing",
          message: expect.stringContaining("Live transcription is connected"),
        }),
      }),
    );
  });

  it("reports offscreen diagnostics for chunks, socket state, and transcripts", async () => {
    const harness = installHarness();

    harness.startCapture();

    await waitFor(() => {
      expect(FakeMediaRecorder.instances).toHaveLength(1);
    });

    FakeMediaRecorder.instances[0]?.emitChunk([7, 8, 9, 10]);
    harness.resolveToken();

    await waitFor(() => {
      expect(FakeWebSocket.instances).toHaveLength(1);
    });

    FakeWebSocket.instances[0]?.open();
    FakeWebSocket.instances[0]?.onmessage?.({
      data: JSON.stringify({
        type: "Results",
        is_final: true,
        start: 1,
        duration: 2,
        channel: {
          alternatives: [{
            transcript: "The operating budget increased.",
            words: [{ speaker: 1 }, { speaker: 1 }],
          }],
        },
      }),
    });

    await waitFor(async () => {
      const diagnostics = await harness.diagnostics();
      expect(diagnostics).toMatchObject({
        active: true,
        appOrigin: "http://localhost:3000",
        chunksObserved: 1,
        chunksSent: 1,
        bytesObserved: 4,
        bytesSent: 4,
        finalTranscriptCount: 1,
        interimTranscriptCount: 0,
        sawTranscript: true,
        socketState: "open",
        socketResultCount: 1,
        transcriptChars: "The operating budget increased.".length,
      });
      expect(diagnostics).toMatchObject({
        lastTranscriptPreview: "The operating budget increased.",
        mediaRecorderMimeType: "audio/webm;codecs=opus",
        mediaRecorderState: "recording",
      });
    });
  });
});
