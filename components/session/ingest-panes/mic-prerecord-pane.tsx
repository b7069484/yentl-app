"use client";
import { useSession } from "@/lib/client/session-store";

/**
 * PreRecord mic pane — shown when source.kind === "mic" and stage === "selected".
 */
export function MicPreRecordPane() {
  const startSession = useSession((s) => s.startSession);
  return (
    <div className="px-6 pt-12 pb-12 max-w-[680px] mx-auto w-full text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/yenta-y-mark.png"
        alt="Yenta"
        width={600}
        height={340}
        className="mx-auto mb-6 h-24 w-auto"
      />
      <h1 className="font-serif text-[28px] font-medium tracking-tight text-ink">
        Yenta is ready to listen.
      </h1>
      <p className="text-[14px] text-ink-3 mt-2 max-w-prose mx-auto">
        Tap below to start a session. Yenta transcribes the conversation in real time, fact-checks
        every claim against the open web, and surfaces the biases and fallacies tucked into the
        rhetoric.
      </p>
      <button
        type="button"
        onClick={() => startSession()}
        className="mt-7 inline-flex items-center gap-2 px-5 py-3 bg-teal text-white rounded-xl text-[14px] font-medium hover:bg-teal-2 shadow-md"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        </svg>
        Start a session
      </button>
      <div className="mt-4 text-[11.5px] text-ink-4">Multi-speaker · English · Browser mic</div>
    </div>
  );
}
