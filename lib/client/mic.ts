export type MicHandle = {
  stream: MediaStream;
  recorder: MediaRecorder;
  stop: () => void;
};

export type StartMicOptions = {
  /**
   * When true, disables Chrome's default echoCancellation / noiseSuppression /
   * autoGainControl. Useful when the user wants to capture audio playing
   * through the device's own speakers (otherwise Chrome filters it out before
   * Deepgram sees it).
   */
  speakersMode?: boolean;
  deviceId?: string | null;
};

export async function startMic(
  onChunk: (chunk: Blob) => void,
  opts: StartMicOptions = {},
): Promise<MicHandle> {
  const speakersMode = opts.speakersMode ?? false;
  const deviceId = opts.deviceId?.trim();
  const audioConstraints = {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    ...(speakersMode
      ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true }),
  };
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
  });
  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, { mimeType });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) onChunk(e.data);
  };

  recorder.start(250); // emit a chunk every 250ms

  return {
    stream,
    recorder,
    stop: () => {
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}
