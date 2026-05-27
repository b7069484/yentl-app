"use client";
// The session segment is always fully dynamic: it depends on mic/WebSocket state
// that cannot exist at build time. Disabling static prerendering also prevents
// the useSearchParams-without-Suspense build error that fires for all
// components in this segment (SessionShell > Tabs, FilteredList, etc.).
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { SessionShell } from "@/components/session/session-shell";
import { useSession } from "@/lib/client/session-store";
import { startMic, type MicHandle } from "@/lib/client/mic";
import { openDeepgramStream } from "@/lib/client/deepgram-stream";
import { onFinalUtterance } from "@/lib/client/orchestrator";
import { ExtensionBridge } from "@/components/session/ExtensionBridge";

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const isRecording = useSession((s) => s.isRecording);
  const startedAt = useSession((s) => s.startedAt);
  const speakersMode = useSession((s) => s.speakersMode);
  const sourceKind = useSession((s) => s.source.kind);
  const prerecordStage = useSession((s) => s.prerecordStage);

  const mic = useRef<MicHandle | null>(null);
  const dg = useRef<Awaited<ReturnType<typeof openDeepgramStream>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teardown = () => {
    session.setMicStream(null);
    try { mic.current?.stop(); } catch {}
    try { dg.current?.close(); } catch {}
    mic.current = null;
    dg.current = null;
  };

  const start = async () => {
    setError(null);
    try {
      dg.current = await openDeepgramStream({
        onInterim: (t) => session.setInterim(t),
        onFinal: (seg) => {
          session.appendFinal(seg);
          void onFinalUtterance(seg);
        },
        onError: () => {
          setError("Lost connection to Deepgram. Check your network or refresh and try again.");
          teardown();
          session.setRecording(false);
        },
        onClose: () => {},
      });
      mic.current = await startMic(
        (chunk) => dg.current?.send(chunk),
        { speakersMode: session.speakersMode, deviceId: session.micDeviceId },
      );
      if (mic.current) session.setMicStream(mic.current.stream);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const permissionDenied = /permission|denied|notallowed/i.test(msg);
      const canReturnToMicSetup =
        permissionDenied &&
        sourceKind === "mic" &&
        session.transcript.length === 0 &&
        session.claims.length === 0 &&
        session.markers.length === 0;
      const selectedMicDeviceId = session.micDeviceId;
      const micConsentAccepted = session.micConsentAccepted;
      const friendly = permissionDenied
        ? "Microphone access was blocked. Allow mic permission in your browser and try again."
        : /token/i.test(msg)
          ? "Couldn't reach the transcription service. Check that the dev server has VERCEL_OIDC_TOKEN and DEEPGRAM_API_KEY set."
          : `Couldn't start the session: ${msg}`;
      setError(friendly);
      teardown();
      if (canReturnToMicSetup) {
        session.reset();
        session.setSource({ kind: "mic" });
        session.setMicDeviceId(selectedMicDeviceId);
        session.setMicConsentAccepted(micConsentAccepted);
        session.setPrerecordStage("selected");
      } else {
        session.setRecording(false);
      }
    }
  };

  const micPermissionBlocked =
    sourceKind === "mic" &&
    typeof error === "string" &&
    /microphone access was blocked/i.test(error);

  function retryMicrophone() {
    setError(null);
    if (session.startedAt) {
      session.setRecording(true);
    } else {
      session.startSession();
    }
  }

  function chooseRecoverySource(source: "audio" | "text" | "claim") {
    setError(null);
    session.reset();
    if (source === "audio") {
      session.setSource({ kind: "audio_file", blob_url: "", duration_sec: 0, filename: "", mime: "" });
    } else if (source === "claim") {
      session.setSource({
        kind: "text_doc",
        filename: "Claim quick check",
        mime: "text/plain",
        byte_count: 0,
        intent: "claim_only",
      });
    } else {
      session.setSource({ kind: "text_doc", filename: "", mime: "", byte_count: 0 });
    }
    session.setPrerecordStage("selected");
  }

  // React to isRecording transitions
  useEffect(() => {
    if (!startedAt) return;        // pre-record: nothing to start
    if (sourceKind !== "mic") return;  // non-mic sources handle their own streams
    if (isRecording && !mic.current) void start();
    else if (!isRecording && mic.current) teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, startedAt, sourceKind]);

  // Cleanup on unmount
  useEffect(() => () => teardown(), []);

  // Restart on speakersMode flip while recording (same race-safety contract as before)
  const lastSpeakersMode = useRef(speakersMode);
  const restarting = useRef(false);
  useEffect(() => {
    if (lastSpeakersMode.current === speakersMode) return;
    lastSpeakersMode.current = speakersMode;
    if (!isRecording) return;
    if (restarting.current) return;
    restarting.current = true;
    void (async () => {
      try { teardown(); await start(); } finally { restarting.current = false; }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakersMode]);

  // Dev-only shim
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __yentl?: Record<string, unknown>; __factify?: Record<string, unknown> };
    w.__yentl = { ...(w.__yentl ?? {}), onFinalUtterance };
    w.__factify = w.__yentl;
  }, []);

  // Keyboard shortcut: Space toggles record/pause. Ignored when focus is in an editable element
  // (input/textarea/contenteditable) so it doesn't fight with text entry.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      e.preventDefault();
      if (!startedAt) {
        // Only start a mic session when the user has navigated through the picker
        // and accepted consent — otherwise Space is a no-op in pre-record state.
        if (prerecordStage === "selected" && sourceKind === "mic" && session.micConsentAccepted) {
          session.startSession();
        }
      } else if (!session.endedAt) {
        session.setRecording(!session.isRecording);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startedAt, prerecordStage, sourceKind, session]);

  return (
    <SessionShell>
      <ExtensionBridge />
      {error && (
        <div
          role="alert"
          className="border-b border-red-soft bg-red-soft/40 px-6 py-2.5 text-[12.5px] text-red"
        >
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div>{error}</div>
              {micPermissionBlocked && (
                <>
                  <div className="mt-1 max-w-3xl text-[12px] leading-relaxed text-red/80">
                    If the browser says this site is blocked, use the microphone icon or site settings
                    in the address bar to allow access, then try again. You can also pick a different
                    microphone before restarting.
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <RecoveryButton label="Try microphone again" onClick={retryMicrophone} />
                    <RecoveryButton label="Upload recording" onClick={() => chooseRecoverySource("audio")} />
                    <RecoveryButton label="Paste text" onClick={() => chooseRecoverySource("text")} />
                    <RecoveryButton label="Check one claim" onClick={() => chooseRecoverySource("claim")} />
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 self-start rounded px-2 py-0.5 text-[11px] font-medium text-red/80 hover:bg-red-soft"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {children}
    </SessionShell>
  );
}

function RecoveryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-red-soft bg-paper px-3 py-1.5 text-[12px] font-medium text-red transition-colors hover:bg-red-soft/40"
    >
      {label}
    </button>
  );
}
