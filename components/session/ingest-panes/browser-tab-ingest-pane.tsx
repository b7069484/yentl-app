"use client";

import type { ComponentType } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Link,
  Loader2,
  Mic,
  MonitorPlay,
  Radio,
  Settings2,
  Upload,
} from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { checkBrowserTabCaptureStatus } from "@/components/session/ExtensionBridge";

export function BrowserTabIngestPane() {
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setBrowserTabStatus = useSession((s) => s.setBrowserTabStatus);
  const setSource = useSession((s) => s.setSource);
  const browserTabStatus = useSession((s) => s.browserTabStatus);
  const isWaitingForExtension = browserTabStatus.phase === "waiting_for_extension";
  const needsRecovery =
    browserTabStatus.phase === "error" ||
    browserTabStatus.phase === "no_audio_detected" ||
    browserTabStatus.phase === "tab_changed";

  function handleStartWaiting() {
    setSource({ kind: "browser_tab" });
    setBrowserTabStatus({
      phase: "waiting_for_extension",
      message:
        "Waiting for the Chrome extension to open Yentl beside the playing media.",
      updatedAt: Date.now(),
    });
    checkBrowserTabCaptureStatus();
  }

  function chooseAudioUpload() {
    setSource({ kind: "audio_file", blob_url: "", duration_sec: 0, filename: "", mime: "" });
    setPrerecordStage("selected");
  }

  function chooseText() {
    setSource({ kind: "text_doc", filename: "", mime: "", byte_count: 0 });
    setPrerecordStage("selected");
  }

  function chooseMediaUrl() {
    setSource({ kind: "media_url", url: "" });
    setPrerecordStage("selected");
  }

  function chooseMic() {
    setSource({ kind: "mic" });
    setPrerecordStage("selected");
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-12 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => setPrerecordStage("picker")}
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-cream-2 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <MonitorPlay className="h-5 w-5" aria-hidden />
          </div>

          <h1 className="font-serif text-[26px] leading-tight text-ink sm:text-[30px]">
            Use the desktop Chrome extension
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
            Open the page where the video, podcast, livestream, class, or meeting
            is already playing. Click the Yentl Chrome extension there; Yentl
            should appear beside the media so the player, transcript, claims, and
            evidence stay together on the same page.
          </p>

          <div className="mt-6 grid gap-3 text-[13px] text-ink-3 sm:grid-cols-3">
            <Step number="1" title="Open media page" body="Any page with audible video or audio." />
            <Step number="2" title="Click extension" body="Yentl opens as a side panel on that page." />
            <Step number="3" title="Review in sync" body="The media, transcript, and analysis stay together." />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleStartWaiting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal px-5 py-3 text-[14px] font-medium text-white shadow-md transition-colors hover:bg-teal-2 sm:w-auto"
            >
              <Radio className="h-4 w-4" aria-hidden />
              Check in-page extension
            </button>
            <button
              type="button"
              onClick={checkBrowserTabCaptureStatus}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-cream px-5 py-3 text-[14px] font-medium text-ink-2 shadow-sm transition-colors hover:bg-cream-2 sm:w-auto"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              Check extension
            </button>
          </div>

          {isWaitingForExtension && (
            <div className="mt-6 rounded-lg border border-teal/30 bg-teal-soft p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-teal">
                  <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-ink">
                    Waiting for Chrome extension
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                    Go to the Chrome tab where the media is visible, click the Yentl extension,
                    and keep the extension pointed at this Yentl app.
                  </p>
                  {browserTabStatus.message && (
                    <p className="mt-3 rounded-md border border-teal/20 bg-paper px-3 py-2 text-[12.5px] text-ink-2">
                      {browserTabStatus.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {needsRecovery && (
            <div className="mt-6 rounded-lg border border-amber-2/30 bg-amber-soft p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-amber-2">
                  <Settings2 className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-ink">
                    Browser capture needs a different path
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                    {browserTabStatus.phase === "no_audio_detected"
                      ? "Yentl connected to the tab but did not hear usable speech. The tab may be muted, paused, protected, or the wrong source."
                      : browserTabStatus.phase === "tab_changed"
                        ? browserTabStatus.message ?? "Yentl is still tied to the original tab. Return to that tab, or choose a different source path."
                        : browserTabStatus.message ?? "Chrome did not allow this browser-tab capture."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <RecoveryButton icon={Upload} label="Upload recording" onClick={chooseAudioUpload} />
                    <RecoveryButton icon={Link} label="Use media URL" onClick={chooseMediaUrl} />
                    <RecoveryButton icon={FileText} label="Paste text" onClick={chooseText} />
                    <RecoveryButton icon={Mic} label="Use microphone" onClick={chooseMic} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-lg border border-line bg-cream p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Connection checklist
          </div>
          <div className="space-y-3 text-[13px] leading-relaxed text-ink-3">
            <p>
              This check only works in Chrome after the Yentl extension has
              been loaded. It will not respond inside the in-app preview
              browser.
            </p>
            <p>
              The extension option must point to this Yentl app. If it was
              configured for a different environment, update the extension
              settings and try again.
            </p>
            <p>
              If the status stays waiting, reload the extension from
              <span className="font-mono"> chrome://extensions</span>, reopen
              the media page, and click the extension while the media is visible.
            </p>
            {!isWaitingForExtension && browserTabStatus.message && (
              <p className="rounded-md border border-line bg-paper px-3 py-2 text-ink-2">
                {browserTabStatus.message}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function RecoveryButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] font-medium text-ink-2 shadow-sm transition-colors hover:border-teal hover:bg-cream-2"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-cream px-3 py-3">
      <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal text-[12px] font-semibold text-white">
        {number}
      </div>
      <div className="font-medium text-ink">{title}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{body}</div>
    </div>
  );
}
