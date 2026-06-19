/* global chrome */

const DEEPGRAM_PARAMS = new URLSearchParams({
  model: "nova-3",
  language: "en",
  punctuate: "true",
  smart_format: "true",
  interim_results: "true",
  utterance_end_ms: "1000",
  diarize: "true",
  numerals: "true",
});

const REFRESH_LEAD_MS = 30_000;
const TOKEN_RETRY_ATTEMPTS = 3;
const TOKEN_BACKOFF_BASE_MS = 500;
const CHUNK_MS = 250;
const NO_TRANSCRIPT_NOTICE_MS = 5000;
const MAX_BUFFERED_CHUNKS = 120;
const MAX_BUFFERED_BYTES = 4_000_000;
const SOURCE_CONSENT_HEADER = "x-yentl-source-consent";
const SOURCE_CONSENT_VALUE = "source-analysis-v1";

let currentCapture = null;
let lastCaptureDiagnostics = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== "offscreen") return false;

  if (message.type === "diagnostics-request") {
    sendResponse(buildCaptureDiagnostics());
    return false;
  }

  if (message.type === "start-capture") {
    void startCapture(message);
    return false;
  }

  if (message.type === "stop-capture") {
    void stopCapture({ notify: true });
  }

  return false;
});

async function startCapture(message) {
  await stopCapture({ notify: false });

  const controller = new AbortController();
  const capture = {
    appOrigin: message.appOrigin,
    audioContext: null,
    controller,
    mediaRecorder: null,
    mediaRecorderMimeType: null,
    mediaRecorderStartedAt: null,
    mediaStream: null,
    noTranscriptTimer: null,
    refreshTimer: null,
    sawTranscript: false,
    sessionId: message.sessionId,
    socket: null,
    socketErrorCount: 0,
    socketOpenAt: null,
    socketOpeningAt: null,
    socketResultCount: 0,
    socketState: "idle",
    pendingChunks: [],
    pendingBytes: 0,
    sourceNode: null,
    startedAt: Date.now(),
    stoppedAt: null,
    streamOpenedAt: null,
    tokenExpiresAtMs: null,
    tokenReceivedAt: null,
    tokenRequestedAt: null,
    chunksBuffered: 0,
    chunksDropped: 0,
    chunksObserved: 0,
    chunksSent: 0,
    bytesBuffered: 0,
    bytesDropped: 0,
    bytesObserved: 0,
    bytesSent: 0,
    emptyTranscriptResults: 0,
    finalTranscriptCount: 0,
    interimTranscriptCount: 0,
    lastStatusAt: null,
    lastTranscriptAt: null,
    lastTranscriptPreview: null,
    noTranscriptNoticeSentAt: null,
    transcriptChars: 0,
  };
  currentCapture = capture;
  lastCaptureDiagnostics = null;

  try {
    capture.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: message.streamId,
        },
      },
      video: false,
    });
    capture.streamOpenedAt = Date.now();

    preserveTabAudio(capture);
    startMediaRecorder(capture);
    sendBackground("capture-status", {
      running: true,
      phase: "capturing",
      message:
        "Capturing tab audio now. Yentl is connecting live transcription and will process buffered audio as soon as it is ready.",
    });

    capture.tokenRequestedAt = Date.now();
    const token = await fetchTokenWithRetry(capture.appOrigin, controller.signal);
    capture.tokenReceivedAt = Date.now();
    capture.tokenExpiresAtMs = token.expiresAtMs;
    capture.socketOpeningAt = Date.now();
    capture.socket = await openDeepgramSocket(token.key, controller.signal, capture);
    flushPendingChunks(capture);
    scheduleTokenRefresh(capture, token.expiresAtMs);

    sendBackground("capture-status", {
      running: true,
      phase: "capturing",
      message: "Live transcription is connected. Audio is flowing from this tab.",
    });
    scheduleNoTranscriptNotice(capture);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    capture.lastError = messageText;
    sendBackground("capture-error", { message: messageText });
    await stopCapture({ notify: false });
  }
}

async function stopCapture({ notify }) {
  const capture = currentCapture;
  currentCapture = null;
  if (!capture) return;

  capture.stoppedAt = Date.now();
  capture.controller.abort();
  if (capture.refreshTimer) clearTimeout(capture.refreshTimer);
  if (capture.noTranscriptTimer) clearTimeout(capture.noTranscriptTimer);

  try {
    if (capture.mediaRecorder && capture.mediaRecorder.state !== "inactive") {
      capture.mediaRecorder.stop();
    }
  } catch {
    // noop
  }

  for (const track of capture.mediaStream?.getTracks() ?? []) {
    track.stop();
  }

  try {
    if (capture.socket?.readyState === WebSocket.OPEN) {
      capture.socket.send(JSON.stringify({ type: "CloseStream" }));
    }
    capture.socket?.close();
  } catch {
    // noop
  }

  try {
    capture.sourceNode?.disconnect();
    await capture.audioContext?.close();
  } catch {
    // noop
  }

  lastCaptureDiagnostics = summarizeCaptureDiagnostics(capture);

  if (notify) {
    sendBackground("capture-stop");
  }
}

function startMediaRecorder(capture) {
  const mimeType = pickMimeType();
  capture.mediaRecorderMimeType = mimeType;
  capture.mediaRecorder = new MediaRecorder(capture.mediaStream, {
    mimeType,
  });
  capture.mediaRecorder.ondataavailable = (event) => {
    if (!event.data || event.data.size === 0) return;
    capture.chunksObserved += 1;
    capture.bytesObserved += event.data.size;
    sendChunk(capture, event.data);
  };
  capture.mediaRecorder.onerror = (event) => {
    capture.lastError = event.error?.message ?? "MediaRecorder failed.";
    sendBackground("capture-error", {
      message: event.error?.message ?? "MediaRecorder failed.",
    });
  };
  capture.mediaRecorder.start(CHUNK_MS);
  capture.mediaRecorderStartedAt = Date.now();
}

function preserveTabAudio(capture) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextCtor();
  const sourceNode = audioContext.createMediaStreamSource(capture.mediaStream);
  sourceNode.connect(audioContext.destination);
  void audioContext.resume();
  capture.audioContext = audioContext;
  capture.sourceNode = sourceNode;
}

async function fetchTokenWithRetry(appOrigin, signal) {
  let lastError;
  for (let attempt = 1; attempt <= TOKEN_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchToken(appOrigin, signal);
    } catch (error) {
      lastError = error;
      if (signal.aborted) throw error;
      if (attempt === TOKEN_RETRY_ATTEMPTS) break;
      await sleep(TOKEN_BACKOFF_BASE_MS * 2 ** (attempt - 1), signal);
    }
  }
  throw lastError ?? new Error("Could not fetch Deepgram token.");
}

async function fetchToken(appOrigin, signal) {
  let response;
  try {
    response = await fetch(`${appOrigin}/api/deepgram/token`, {
      method: "POST",
      headers: {
        [SOURCE_CONSENT_HEADER]: SOURCE_CONSENT_VALUE,
      },
      signal,
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach the Yentl app at ${appOrigin}. Confirm the extension origin and Chrome site permission, then try again. (${cause})`,
    );
  }
  if (!response.ok) throw new Error(`Token request failed (${response.status}).`);
  const data = await response.json();
  const expiresAtMs = new Date(data.expires_at).getTime();
  if (!data.key || !Number.isFinite(expiresAtMs)) {
    throw new Error("Token response was malformed.");
  }
  return { key: data.key, expiresAtMs };
}

function openDeepgramSocket(key, signal, capture) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${DEEPGRAM_PARAMS}`,
      ["bearer", key],
    );

    const onAbort = () => {
      try {
        socket.close();
      } catch {
        // noop
      }
      reject(new Error("aborted"));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    socket.onopen = () => {
      signal.removeEventListener("abort", onAbort);
      capture.socketOpenAt = Date.now();
      capture.socketState = "open";
      attachSocketHandlers(socket, capture);
      resolve(socket);
    };
    socket.onerror = () => {
      signal.removeEventListener("abort", onAbort);
      capture.socketErrorCount += 1;
      capture.socketState = "error";
      reject(new Error("Deepgram WebSocket failed to open."));
    };
  });
}

function attachSocketHandlers(socket, capture) {
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type !== "Results") return;
      capture.socketResultCount += 1;
      const alternative = message.channel?.alternatives?.[0];
      const text = alternative?.transcript;
      if (!text) {
        capture.emptyTranscriptResults += 1;
        return;
      }
      capture.sawTranscript = true;
      capture.lastTranscriptAt = Date.now();
      capture.lastTranscriptPreview = text.slice(0, 240);
      capture.transcriptChars += text.length;
      if (capture.noTranscriptTimer) {
        clearTimeout(capture.noTranscriptTimer);
        capture.noTranscriptTimer = null;
      }

      if (message.is_final) {
        capture.finalTranscriptCount += 1;
        const start = typeof message.start === "number" ? message.start : 0;
        const duration = typeof message.duration === "number" ? message.duration : 0;
        sendBackground("transcript-final", {
          text,
          start,
          end: start + duration,
          speaker_id: dominantSpeaker(alternative.words ?? []),
        });
      } else {
        capture.interimTranscriptCount += 1;
        sendBackground("transcript-interim", { text });
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      capture.lastError = messageText;
      sendBackground("capture-error", { message: messageText });
    }
  };

  socket.onerror = () => {
    capture.socketErrorCount += 1;
    capture.socketState = "error";
    sendBackground("capture-error", { message: "Deepgram WebSocket error." });
  };
}

function scheduleTokenRefresh(capture, expiresAtMs) {
  if (capture.refreshTimer) clearTimeout(capture.refreshTimer);
  const delay = Math.max(1000, expiresAtMs - Date.now() - REFRESH_LEAD_MS);
  capture.refreshTimer = setTimeout(() => {
    void refreshDeepgramSocket(capture);
  }, delay);
}

async function refreshDeepgramSocket(capture) {
  if (currentCapture !== capture || capture.controller.signal.aborted) return;

  try {
    const token = await fetchTokenWithRetry(capture.appOrigin, capture.controller.signal);
    const nextSocket = await openDeepgramSocket(token.key, capture.controller.signal, capture);
    const oldSocket = capture.socket;
    capture.socket = nextSocket;
    flushPendingChunks(capture);
    scheduleTokenRefresh(capture, token.expiresAtMs);

    try {
      if (oldSocket?.readyState === WebSocket.OPEN) {
        oldSocket.send(JSON.stringify({ type: "CloseStream" }));
      }
      oldSocket?.close();
    } catch {
      // noop
    }
  } catch (error) {
    if (capture.controller.signal.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    sendBackground("capture-error", { message });
    await stopCapture({ notify: false });
  }
}

function scheduleNoTranscriptNotice(capture) {
  if (capture.noTranscriptTimer) clearTimeout(capture.noTranscriptTimer);
  capture.noTranscriptTimer = setTimeout(() => {
    if (currentCapture !== capture || capture.controller.signal.aborted) return;
    if (capture.sawTranscript) return;
    capture.noTranscriptNoticeSentAt = Date.now();
    sendBackground("capture-status", {
      running: true,
      phase: "no_audio_detected",
      message:
        "Yentl is connected to this tab, but no speech has been transcribed yet. Make sure the media is playing, unmuted, and contains speech.",
    });
  }, NO_TRANSCRIPT_NOTICE_MS);
}

function sendChunk(capture, blob) {
  blob.arrayBuffer().then((buffer) => {
    if (currentCapture !== capture) return;
    const socket = capture.socket;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(buffer);
      capture.chunksSent += 1;
      capture.bytesSent += buffer.byteLength;
      return;
    }
    bufferChunk(capture, buffer);
  });
}

function bufferChunk(capture, buffer) {
  capture.pendingChunks.push(buffer);
  capture.pendingBytes += buffer.byteLength;
  capture.chunksBuffered += 1;
  capture.bytesBuffered += buffer.byteLength;

  while (
    capture.pendingChunks.length > MAX_BUFFERED_CHUNKS ||
    capture.pendingBytes > MAX_BUFFERED_BYTES
  ) {
    const dropped = capture.pendingChunks.shift();
    capture.pendingBytes -= dropped?.byteLength ?? 0;
    capture.chunksDropped += 1;
    capture.bytesDropped += dropped?.byteLength ?? 0;
  }
}

function flushPendingChunks(capture) {
  const socket = capture.socket;
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  for (const buffer of capture.pendingChunks) {
    socket.send(buffer);
    capture.chunksSent += 1;
    capture.bytesSent += buffer.byteLength;
  }
  capture.pendingChunks = [];
  capture.pendingBytes = 0;
}

function buildCaptureDiagnostics() {
  if (currentCapture) return summarizeCaptureDiagnostics(currentCapture);
  return lastCaptureDiagnostics ?? {
    active: false,
    message: "No offscreen capture has run in this document.",
  };
}

function summarizeCaptureDiagnostics(capture) {
  const tracks = capture.mediaStream?.getTracks?.() ?? [];
  const socket = capture.socket;
  return {
    active: currentCapture === capture,
    appOrigin: capture.appOrigin,
    audioContextState: capture.audioContext?.state ?? null,
    bytesBuffered: capture.bytesBuffered,
    bytesDropped: capture.bytesDropped,
    bytesObserved: capture.bytesObserved,
    bytesSent: capture.bytesSent,
    chunksBuffered: capture.chunksBuffered,
    chunksDropped: capture.chunksDropped,
    chunksObserved: capture.chunksObserved,
    chunksPending: capture.pendingChunks.length,
    chunksSent: capture.chunksSent,
    emptyTranscriptResults: capture.emptyTranscriptResults,
    finalTranscriptCount: capture.finalTranscriptCount,
    interimTranscriptCount: capture.interimTranscriptCount,
    lastError: capture.lastError ?? null,
    lastTranscriptAt: capture.lastTranscriptAt,
    lastTranscriptPreview: capture.lastTranscriptPreview,
    mediaRecorderMimeType: capture.mediaRecorderMimeType,
    mediaRecorderStartedAt: capture.mediaRecorderStartedAt,
    mediaRecorderState: capture.mediaRecorder?.state ?? null,
    noTranscriptNoticeSentAt: capture.noTranscriptNoticeSentAt,
    pendingBytes: capture.pendingBytes,
    sawTranscript: capture.sawTranscript,
    sessionId: capture.sessionId,
    socketErrorCount: capture.socketErrorCount,
    socketOpenAt: capture.socketOpenAt,
    socketOpeningAt: capture.socketOpeningAt,
    socketReadyState: typeof socket?.readyState === "number" ? socket.readyState : null,
    socketResultCount: capture.socketResultCount,
    socketState: capture.socketState,
    startedAt: capture.startedAt,
    stoppedAt: capture.stoppedAt,
    streamOpenedAt: capture.streamOpenedAt,
    tokenExpiresAtMs: capture.tokenExpiresAtMs,
    tokenReceivedAt: capture.tokenReceivedAt,
    tokenRequestedAt: capture.tokenRequestedAt,
    trackStates: tracks.map((track) => ({
      enabled: track.enabled,
      id: track.id,
      kind: track.kind,
      label: track.label,
      muted: track.muted,
      readyState: track.readyState,
    })),
    transcriptChars: capture.transcriptChars,
  };
}

function dominantSpeaker(words) {
  const counts = new Map();
  for (const word of words) {
    if (typeof word.speaker !== "number") continue;
    counts.set(word.speaker, (counts.get(word.speaker) ?? 0) + 1);
  }
  let winner = null;
  let winnerCount = -1;
  for (const [speaker, count] of counts) {
    if (count > winnerCount) {
      winner = speaker;
      winnerCount = count;
    }
  }
  return winner;
}

function pickMimeType() {
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

function sendBackground(type, payload) {
  chrome.runtime.sendMessage({
    target: "background",
    type,
    ...(payload !== undefined ? { payload } : {}),
  }).catch(() => {});
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      resolve();
    }, { once: true });
  });
}
