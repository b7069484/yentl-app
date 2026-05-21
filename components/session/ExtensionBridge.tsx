"use client";

import { useEffect } from "react";
import { onFinalUtterance, runFinalSynthesis } from "@/lib/client/orchestrator";
import { useSession } from "@/lib/client/session-store";
import type { TranscriptSegment } from "@/lib/types";

export const EXTENSION_MESSAGE_SOURCE = "yentl-tab-capture-extension";
export const APP_BRIDGE_SOURCE = "yentl-web-app";

type AppBridgeMessage =
  | { source: typeof APP_BRIDGE_SOURCE; type: "bridge-ready"; bridgeToken?: string }
  | { source: typeof APP_BRIDGE_SOURCE; type: "status-request"; bridgeToken?: string }
  | { source: typeof APP_BRIDGE_SOURCE; type: "capture-stop-request"; bridgeToken?: string };

type ExtensionMessage =
  | {
      source: typeof EXTENSION_MESSAGE_SOURCE;
      type: "capture-start";
      bridgeToken?: string;
      payload?: {
        tab_id?: number;
        title?: string;
        url?: string;
      };
    }
  | {
      source: typeof EXTENSION_MESSAGE_SOURCE;
      type: "transcript-interim";
      bridgeToken?: string;
      payload?: { text?: string };
    }
  | {
      source: typeof EXTENSION_MESSAGE_SOURCE;
      type: "transcript-final";
      bridgeToken?: string;
      payload?: {
        text?: string;
        start?: number;
        end?: number;
        speaker_id?: number | null;
      };
    }
  | {
      source: typeof EXTENSION_MESSAGE_SOURCE;
      type: "page-text";
      bridgeToken?: string;
      payload?: {
        title?: string;
        url?: string;
        text?: string;
        chunks?: Array<{
          text?: string;
          start?: number;
          end?: number;
        }>;
        captured_at?: number;
      };
    }
  | {
      source: typeof EXTENSION_MESSAGE_SOURCE;
      type: "capture-stop";
      bridgeToken?: string;
    }
  | {
      source: typeof EXTENSION_MESSAGE_SOURCE;
      type: "capture-status";
      bridgeToken?: string;
      payload?: {
        running?: boolean;
        phase?: "extension_connected" | "capturing" | "transcribing" | "no_audio_detected";
        title?: string;
        url?: string;
        message?: string;
      };
    }
  | {
      source: typeof EXTENSION_MESSAGE_SOURCE;
      type: "capture-error";
      bridgeToken?: string;
      payload?: { message?: string };
    };

type BrowserTabSessionPayload = {
  tab_id?: number;
  title?: string;
  url?: string;
};

function getBridgeToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("bridge");
}

function isExtensionPanelSurface() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("surface") === "extension-panel";
}

function postAppBridgeMessage(message: AppBridgeMessage) {
  if (typeof window === "undefined") return;
  const bridgeToken = getBridgeToken();
  const bridgedMessage = bridgeToken ? { ...message, bridgeToken } : message;
  window.postMessage(bridgedMessage, window.location.origin);
  if (window.parent !== window) {
    window.parent.postMessage(bridgedMessage, "*");
  }
}

export function requestBrowserTabCaptureStatus() {
  postAppBridgeMessage({ source: APP_BRIDGE_SOURCE, type: "status-request" });
}

export function checkBrowserTabCaptureStatus() {
  const requestedAt = Date.now();
  const current = useSession.getState().browserTabStatus;
  useSession.getState().setBrowserTabStatus({
    phase: current.phase === "idle" ? "waiting_for_extension" : current.phase,
    message: "Checking for the Yentl extension...",
    title: current.title,
    url: current.url,
    updatedAt: requestedAt,
  });
  requestBrowserTabCaptureStatus();

  window.setTimeout(() => {
    const latest = useSession.getState().browserTabStatus;
    if ((latest.updatedAt ?? 0) > requestedAt) return;
    useSession.getState().setBrowserTabStatus({
      phase: latest.phase === "capturing" || latest.phase === "transcribing" || latest.phase === "extension_connected"
        ? latest.phase
        : "waiting_for_extension",
      title: latest.title,
      url: latest.url,
      message:
        "No extension response yet. This check only works in Chrome with the Yentl extension loaded. Open a real media or article page in Chrome, click the extension there, and keep this app origin set to http://localhost:3000.",
      updatedAt: Date.now(),
    });
  }, 1600);
}

export function stopBrowserTabCapture() {
  postAppBridgeMessage({ source: APP_BRIDGE_SOURCE, type: "capture-stop-request" });
}

function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  return msg.source === EXTENSION_MESSAGE_SOURCE && typeof msg.type === "string";
}

function isAllowedExtensionMessageEvent(event: MessageEvent, msg: ExtensionMessage) {
  if (event.source === window && event.origin === window.location.origin) {
    return true;
  }

  if (!isExtensionPanelSurface()) return false;
  if (event.source !== window.parent) return false;

  const bridgeToken = getBridgeToken();
  return !!bridgeToken && msg.bridgeToken === bridgeToken;
}

function ensureBrowserTabSession(payload?: BrowserTabSessionPayload): boolean {
  let state = useSession.getState();

  if (state.endedAt) {
    state.reset();
    state = useSession.getState();
  }

  if (state.startedAt && state.source.kind !== "browser_tab") {
    console.warn("Yentl extension capture ignored because another session is already active.");
    return false;
  }

  const source = {
    kind: "browser_tab" as const,
    ...(typeof payload?.tab_id === "number" ? { tab_id: payload.tab_id } : {}),
    ...(payload?.title ? { title: payload.title } : {}),
    ...(payload?.url ? { url: payload.url } : {}),
  };

  if (!state.startedAt) {
    state.setSource(source);
    state.startSession(payload?.title ? `Browser tab: ${payload.title}` : "Browser tab capture");
  } else if (state.source.kind === "browser_tab") {
    state.setSource({ ...state.source, ...source });
  }

  useSession.getState().setBrowserTabStatus({
    phase: "extension_connected",
    title: payload?.title,
    url: payload?.url,
    message:
      "Connected. Keep the media and Yentl analysis visible together on this page.",
    updatedAt: Date.now(),
  });
  useSession.getState().setRecording(true);
  return true;
}

function toSegment(payload: Extract<ExtensionMessage, { type: "transcript-final" }>["payload"]): TranscriptSegment | null {
  const text = payload?.text?.trim();
  if (!text) return null;

  const start = typeof payload?.start === "number" && Number.isFinite(payload.start)
    ? payload.start
    : 0;
  const end = typeof payload?.end === "number" && Number.isFinite(payload.end)
    ? payload.end
    : start;

  return {
    text,
    start,
    end: Math.max(end, start),
    is_final: true,
    speaker_id:
      typeof payload?.speaker_id === "number" || payload?.speaker_id === null
        ? payload.speaker_id
        : 0,
  };
}

function toPageTextSegments(
  payload: Extract<ExtensionMessage, { type: "page-text" }>["payload"],
): TranscriptSegment[] {
  const chunks = payload?.chunks?.length
    ? payload.chunks
    : chunkPageText(payload?.text ?? "");

  return chunks.flatMap((chunk, index) => {
    const text = chunk.text?.trim();
    if (!text) return [];

    const start = typeof chunk.start === "number" && Number.isFinite(chunk.start)
      ? chunk.start
      : index;
    const end = typeof chunk.end === "number" && Number.isFinite(chunk.end)
      ? chunk.end
      : start + 1;

    return [{
      text,
      start,
      end: Math.max(end, start),
      is_final: true,
      speaker_id: null,
    }];
  });
}

function chunkPageText(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 0)
    .slice(0, 10)
    .map((part, index) => ({
      text: part,
      start: index,
      end: index + 1,
    }));
}

function appendPageText(payload: Extract<ExtensionMessage, { type: "page-text" }>["payload"]) {
  const segments = toPageTextSegments(payload);
  if (segments.length === 0) return;
  if (!ensureBrowserTabSession({ title: payload?.title, url: payload?.url })) return;

  const state = useSession.getState();
  const existingText = new Set(state.transcript.map((segment) => segment.text.trim()));
  const appended: TranscriptSegment[] = [];

  for (const segment of segments) {
    if (existingText.has(segment.text)) continue;
    useSession.getState().appendFinal(segment);
    existingText.add(segment.text);
    appended.push(segment);
    void onFinalUtterance(segment);
  }

  if (appended.length === 0) return;

  useSession.getState().setBrowserTabStatus({
    phase: "transcribing",
    title: payload?.title ?? (state.source.kind === "browser_tab" ? state.source.title : undefined),
    url: payload?.url ?? (state.source.kind === "browser_tab" ? state.source.url : undefined),
    message:
      "Page text captured. Yentl is analyzing the visible page while audio can keep flowing if media is playing.",
    updatedAt: Date.now(),
  });
  useSession.getState().setRecording(true);
}

export function ExtensionBridge() {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isExtensionMessage(event.data)) return;
      if (!isAllowedExtensionMessageEvent(event, event.data)) return;

      const msg = event.data;

      if (msg.type === "capture-start") {
        ensureBrowserTabSession(msg.payload);
        return;
      }

      if (msg.type === "page-text") {
        appendPageText(msg.payload);
        return;
      }

      if (msg.type === "capture-status") {
        if (msg.payload?.running) {
          const current = useSession.getState();
          const hasPageText = current.transcript.length > 0;
          const nextPhase = msg.payload.phase === "no_audio_detected" && hasPageText
            ? "transcribing"
            : msg.payload.phase ?? "extension_connected";
          const source = {
            kind: "browser_tab" as const,
            ...(msg.payload.title ? { title: msg.payload.title } : {}),
            ...(msg.payload.url ? { url: msg.payload.url } : {}),
          };
          if (!current.startedAt) {
            current.setSource(source);
            current.startSession(
              msg.payload.title
                ? `Browser tab: ${msg.payload.title}`
                : "Browser tab capture",
            );
          } else if (current.source.kind === "browser_tab") {
            current.setSource({ ...current.source, ...source });
          }
          useSession.getState().setBrowserTabStatus({
            phase: nextPhase,
            title: msg.payload.title ?? (current.source.kind === "browser_tab" ? current.source.title : undefined),
            url: msg.payload.url ?? (current.source.kind === "browser_tab" ? current.source.url : undefined),
            message: hasPageText && msg.payload.phase === "no_audio_detected"
              ? "Page text is being analyzed. No tab speech has arrived yet."
              : msg.payload.message ?? "Extension capture is running.",
            updatedAt: Date.now(),
          });
          if (useSession.getState().source.kind === "browser_tab") {
            useSession.getState().setRecording(true);
          }
        } else {
          useSession.getState().setBrowserTabStatus({
            phase: useSession.getState().source.kind === "browser_tab" ? "waiting_for_extension" : "idle",
            message: msg.payload?.message,
            updatedAt: Date.now(),
          });
        }
        return;
      }

      if (msg.type === "capture-error") {
        const message = msg.payload?.message ?? "Browser tab capture stopped unexpectedly.";
        useSession.getState().setInterim(`[Extension error] ${message}`);
        useSession.getState().setBrowserTabStatus({
          phase: "error",
          message,
          updatedAt: Date.now(),
        });
        useSession.getState().setRecording(false);
        return;
      }

      const state = useSession.getState();
      if (state.source.kind !== "browser_tab") return;
      if (state.endedAt) return;

      if (msg.type === "transcript-interim") {
        useSession.getState().setBrowserTabStatus({
          phase: "capturing",
          title: state.source.title,
          url: state.source.url,
          message: "Audio is arriving.",
          updatedAt: Date.now(),
        });
        useSession.getState().setInterim(msg.payload?.text ?? "");
        return;
      }

      if (msg.type === "transcript-final") {
        const segment = toSegment(msg.payload);
        if (!segment) return;
        useSession.getState().setBrowserTabStatus({
          phase: "transcribing",
          title: state.source.title,
          url: state.source.url,
          message: "Transcribing browser audio.",
          updatedAt: Date.now(),
        });
        useSession.getState().appendFinal(segment);
        void onFinalUtterance(segment);
        return;
      }

      if (msg.type === "capture-stop") {
        if (state.endedAt) return;
        useSession.getState().setBrowserTabStatus({
          phase: "stopped",
          title: state.source.title,
          url: state.source.url,
          message: "Browser capture stopped.",
          updatedAt: Date.now(),
        });
        useSession.getState().setRecording(false);
        useSession.getState().endSession();
        void runFinalSynthesis();
      }
    }

    window.addEventListener("message", handleMessage);
    postAppBridgeMessage({ source: APP_BRIDGE_SOURCE, type: "bridge-ready" });
    requestBrowserTabCaptureStatus();

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
