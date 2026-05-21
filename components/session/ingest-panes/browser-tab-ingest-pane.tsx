"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MonitorPlay,
  PlayCircle,
  Radio,
  Settings2,
} from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { checkBrowserTabCaptureStatus } from "@/components/session/ExtensionBridge";
import { corpusFunctionalSamples } from "@/lib/validation/fixtures";

export function BrowserTabIngestPane() {
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setBrowserTabStatus = useSession((s) => s.setBrowserTabStatus);
  const setSource = useSession((s) => s.setSource);
  const browserTabStatus = useSession((s) => s.browserTabStatus);

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

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-12 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => setPrerecordStage("picker")}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <MonitorPlay className="h-5 w-5" aria-hidden />
          </div>

          <h1 className="font-serif text-[26px] leading-tight text-ink sm:text-[30px]">
            Analyze any video in place
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
            <a
              href="/validation/browser-capture.html"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-cream px-5 py-3 text-[14px] font-medium text-ink-2 shadow-sm transition-colors hover:bg-cream-2 sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open real test page
            </a>
          </div>
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
              The extension option must point to this app origin:
              <span className="mt-1 block rounded-md border border-line bg-paper px-2 py-1 font-mono text-[12px] text-ink-2">
                http://localhost:3000
              </span>
            </p>
            <p>
              If the status stays waiting, reload the extension from
              <span className="font-mono"> chrome://extensions</span>, reopen
              the media page, and click the extension while the media is visible.
            </p>
            {browserTabStatus.message && (
              <p className="rounded-md border border-line bg-paper px-3 py-2 text-ink-2">
                {browserTabStatus.message}
              </p>
            )}
          </div>
        </aside>
      </div>

      <section className="mt-5 rounded-lg border border-line bg-paper p-5 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              <PlayCircle className="h-3.5 w-3.5" aria-hidden />
              Functional samples
            </div>
            <h2 className="font-serif text-[24px] leading-tight text-ink">
              Want something that works right now?
            </h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-3">
              These replay-backed samples load proven transcripts, claims, and
              markers into the real Watch UI. They do not require the Chrome
              extension.
            </p>
          </div>
          <Link
            href="/project/validation"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
          >
            Validation lab
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {corpusFunctionalSamples.map((sample) => (
            <article
              key={sample.id}
              className="rounded-lg border border-line bg-cream p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-mono text-[10.5px] text-ink-3">
                  {sample.id}
                </span>
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">
                  {sample.claims} claims · {sample.markers} markers
                </span>
              </div>
              <h3 className="text-[14px] font-semibold leading-snug text-ink">
                {sample.title}
              </h3>
              <p className="mt-1 min-h-12 text-[12.5px] leading-relaxed text-ink-3">
                {sample.purpose}
              </p>
              <Link
                href={sample.sessionHref}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-teal px-3 py-2 text-[12px] font-medium text-white hover:bg-teal-2"
              >
                Open working sample
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
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
