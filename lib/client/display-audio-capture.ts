export type DisplayAudioCaptureErrorCode =
  | "UNSUPPORTED"
  | "PERMISSION_DENIED"
  | "NO_AUDIO"
  | "RECORDER_UNSUPPORTED";

export class DisplayAudioCaptureError extends Error {
  code: DisplayAudioCaptureErrorCode;

  constructor(code: DisplayAudioCaptureErrorCode, message: string) {
    super(message);
    this.name = "DisplayAudioCaptureError";
    this.code = code;
  }
}

export type DisplayAudioCaptureHandle = {
  stream: MediaStream;
  audioStream: MediaStream;
  recorder: MediaRecorder;
  stop: () => void;
};

type DisplayMediaOptionsWithHints = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
  systemAudio?: "include" | "exclude";
};

export async function startDisplayAudioCapture(
  onChunk: (chunk: Blob) => void,
): Promise<DisplayAudioCaptureHandle> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new DisplayAudioCaptureError(
      "UNSUPPORTED",
      "This browser cannot share tab or system audio from the page.",
    );
  }

  if (typeof MediaRecorder === "undefined") {
    throw new DisplayAudioCaptureError(
      "RECORDER_UNSUPPORTED",
      "This browser cannot record the shared audio stream.",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "include",
      systemAudio: "include",
    } as DisplayMediaOptionsWithHints);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DisplayAudioCaptureError(
      "PERMISSION_DENIED",
      message || "Tab audio sharing was cancelled or blocked.",
    );
  }

  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    stream.getTracks().forEach((track) => track.stop());
    throw new DisplayAudioCaptureError(
      "NO_AUDIO",
      "No tab or system audio was shared. Choose the YouTube tab and enable Share audio.",
    );
  }

  const audioStream = new MediaStream(audioTracks);
  const mimeType = pickMime();
  const recorder = mimeType
    ? new MediaRecorder(audioStream, { mimeType })
    : new MediaRecorder(audioStream);

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) onChunk(event.data);
  };

  recorder.start(250);

  return {
    stream,
    audioStream,
    recorder,
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
      const tracks = new Set([...stream.getTracks(), ...audioStream.getTracks()]);
      tracks.forEach((track) => track.stop());
    },
  };
}

export function displayAudioCaptureMessage(error: unknown): string {
  if (error instanceof DisplayAudioCaptureError) {
    if (error.code === "NO_AUDIO") {
      return "Chrome shared the screen without audio. Try again and pick this YouTube tab with Share audio enabled.";
    }
    if (error.code === "PERMISSION_DENIED") {
      return "Tab audio sharing was cancelled or blocked. Reopen capture and allow Chrome to share this tab with audio.";
    }
    return error.message;
  }

  return error instanceof Error ? error.message : String(error);
}

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}
