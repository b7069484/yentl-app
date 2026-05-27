"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ListChecks, Mic, RefreshCw, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/client/session-store";

type MicDeviceOption = {
  deviceId: string;
  label: string;
};

/**
 * PreRecord mic pane — shown when source.kind === "mic" and stage === "selected".
 */
export function MicPreRecordPane() {
  const startSession = useSession((s) => s.startSession);
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const micDeviceId = useSession((s) => s.micDeviceId);
  const setMicDeviceId = useSession((s) => s.setMicDeviceId);
  const micConsentAccepted = useSession((s) => s.micConsentAccepted);
  const setMicConsentAccepted = useSession((s) => s.setMicConsentAccepted);
  const [devices, setDevices] = useState<MicDeviceOption[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const canStart = micConsentAccepted;

  const loadMicDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      setDevices([]);
      setDeviceError("Microphone choices are not available in this browser.");
      setIsLoadingDevices(false);
      return;
    }

    setIsLoadingDevices(true);
    setDeviceError(null);
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = mediaDevices.filter((device) => device.kind === "audioinput" && device.deviceId);
      const nextDevices = audioInputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`,
      }));
      setDevices(nextDevices);
      if (micDeviceId && !nextDevices.some((device) => device.deviceId === micDeviceId)) {
        setMicDeviceId(null);
      }
    } catch {
      setDevices([]);
      setDeviceError("Microphone choices will appear after browser permission is allowed.");
    } finally {
      setIsLoadingDevices(false);
    }
  }, [micDeviceId, setMicDeviceId]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => void loadMicDevices(), 0);
    const mediaDevices = navigator.mediaDevices;
    const handleDeviceChange = () => void loadMicDevices();
    mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);
    return () => {
      window.clearTimeout(refreshTimer);
      mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
    };
  }, [loadMicDevices]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 md:px-8">
      <button
        type="button"
        onClick={() => setPrerecordStage("picker")}
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors hover:text-ink-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="rounded-lg border border-line bg-paper p-6 text-center shadow-sm sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/yentl-mark.svg"
            alt="Yentl"
            width={600}
            height={340}
            className="mx-auto mb-6 h-24 w-auto"
          />
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <Mic className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="font-serif text-[30px] font-medium leading-tight tracking-tight text-ink sm:text-[36px]">
            Yentl is ready to listen.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-3">
            Start only when everyone who may be heard knows Yentl is listening. Your browser
            will ask for microphone access before audio is streamed for transcription and analysis.
          </p>
          <div className="mx-auto mt-6 max-w-xl rounded-lg border border-line bg-cream p-4 text-left">
            <label htmlFor="mic-device" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-4">
              Microphone input
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select
                id="mic-device"
                value={micDeviceId ?? ""}
                onChange={(event) => setMicDeviceId(event.target.value || null)}
                className="min-h-11 flex-1 rounded-lg border border-line bg-paper px-3 text-[13px] text-ink-2 shadow-sm outline-none transition-colors focus:border-teal"
              >
                <option value="">Browser default</option>
                {devices.map((device) => (
                  <option key={device.deviceId || device.label} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadMicDevices()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper px-3 text-[12.5px] font-medium text-ink-2 shadow-sm transition-colors hover:bg-cream-2"
                aria-label="Refresh microphone list"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Refresh
              </button>
            </div>
            <p className="mt-2 text-[12px] leading-snug text-ink-3">
              {deviceError
                ? deviceError
                : isLoadingDevices
                  ? "Checking available microphones..."
                  : "Choose a specific input if the browser default is wrong."}
            </p>
          </div>

          <label className="mx-auto mt-4 flex max-w-xl cursor-pointer select-none items-start gap-3 rounded-lg border border-teal/20 bg-teal-soft p-4 text-left">
            <input
              type="checkbox"
              checked={micConsentAccepted}
              onChange={(event) => setMicConsentAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-teal"
            />
            <span>
              <span className="block text-[13px] font-semibold text-ink-2">
                I have permission to record and analyze this audio.
              </span>
              <span className="mt-1 block text-[12px] leading-relaxed text-ink-3">
                Yentl hears through this browser only while this session is running. Stop
                or switch sources if consent changes.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => startSession()}
            disabled={!canStart}
            className={[
              "mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg px-5 py-3 text-[14px] font-medium shadow-md transition-colors",
              canStart
                ? "bg-teal text-white hover:bg-teal-2"
                : "cursor-not-allowed bg-cream-2 text-ink-3",
            ].join(" ")}
          >
            <Mic className="h-4 w-4" aria-hidden />
            Start a session
          </button>
          <div className="mt-4 text-[11.5px] text-ink-4">Multi-speaker · English · Browser mic</div>
        </section>

        <aside className="grid gap-3">
          <section className="rounded-lg border border-line bg-cream p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              Before recording
            </div>
            <div className="grid gap-2">
              <MicCheck label="Consent" body="Only start when the people nearby know the microphone is being used." />
              <MicCheck label="Browser prompt" body="Allow microphone access when the browser asks." />
              <MicCheck label="Phone or tablet" body="If your OS asks again, allow the microphone for this browser or reopen the source after changing privacy settings." />
              <MicCheck label="Room quality" body="Keep speech close to the mic and reduce background noise when possible." />
            </div>
          </section>

          <section className="rounded-lg border border-teal/20 bg-teal-soft p-4 text-[12.5px] leading-relaxed text-ink-3">
            <div className="mb-2 flex items-center gap-2 font-semibold text-teal">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Need a non-live source?
            </div>
            Use upload, text, YouTube, or media URL intake when you already have a recording,
            captions, or prepared transcript.
          </section>
        </aside>
      </div>
    </div>
  );
}

function MicCheck({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-3 text-left">
      <div className="text-[12.5px] font-semibold text-ink-2">{label}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{body}</div>
    </div>
  );
}
