export type MicHandle = {
  stream: MediaStream;
  recorder: MediaRecorder;
  stop: () => void;
};

export async function startMic(onChunk: (chunk: Blob) => void): Promise<MicHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
